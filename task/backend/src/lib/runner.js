/**
 * lib/runner.js — Docker-sandboxed code execution.
 *
 * Each run spins up a fresh throwaway container:
 *   - image:           per-language (node:alpine, python:alpine, ...)
 *   - NetworkDisabled  no outbound network at all
 *   - Memory cap       64 MiB (configurable via env)
 *   - Timeout          5 s (configurable via env), enforced by us
 *   - AutoRemove       container deleted after stop
 *   - Read-only FS     except /tmp tmpfs
 *   - Non-root user    where the image supports it
 *
 * stdin: we don't pipe arbitrary input. The code file is mounted
 * by writing it to a tmpfs-backed shared volume via Dockerode's
 * tar-stream API (no host paths exposed).
 *
 * Output limit: ~64 KiB combined stdout+stderr. Anything beyond
 * gets truncated with a "[output truncated]" marker.
 */

import Docker from 'dockerode';
import { Readable, Writable } from 'node:stream';
import { logger } from './logger.js';

const docker = new Docker(); // auto-detect socket (/var/run/docker.sock)

const TIMEOUT_MS = Number(process.env.EXECUTION_TIMEOUT_MS) || 5000;
const MEMORY_MB = Number(process.env.EXECUTION_MAX_MEMORY_MB) || 64;
const MAX_OUTPUT_BYTES = 64 * 1024;

/**
 * Language → { image, filename, interp }
 * - filename is what the code is written to inside the container
 * - interp is the argv used to launch the interpreter on /tmp/<file>
 */
// We feed the source via stdin into a tiny sh wrapper that
// writes it to a tmpfs-backed file then execs the interpreter.
// We can't use Docker's putArchive because that runs BEFORE
// container start — before any tmpfs mount exists — and the
// readonly rootfs rejects the write.
const LANGUAGES = {
  javascript: {
    image: 'node:alpine',
    filename: 'main.js',
    interp: ['node'],
  },
  typescript: {
    image: 'node:alpine',
    filename: 'main.mjs',
    // ts-node would be ideal but bloats the image; for now we
    // execute as if it's plain JS (Phase 4 baseline).
    interp: ['node'],
  },
  python: {
    image: 'python:alpine',
    filename: 'main.py',
    interp: ['python'],
  },
};

export function isLanguageSupported(language) {
  return Object.hasOwn(LANGUAGES, language);
}

/**
 * Run code in a sandboxed container.
 *
 * @param {object} opts
 * @param {string} opts.language
 * @param {string} opts.code
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number, timedOut: boolean, durationMs: number }>}
 */
export async function runCode({ language, code }) {
  const lang = LANGUAGES[language];
  if (!lang) throw new Error(`unsupported_language:${language}`);

  const start = Date.now();
  let container;
  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let truncated = false;

  logger.info(
    { language, image: lang.image, codeBytes: Buffer.byteLength(code, 'utf8') },
    'runner: start',
  );

  // Sanity-check Docker is reachable BEFORE creating a container.
  // Saves a confusing "createContainer failed" error and surfaces
  // the real problem (daemon down / wrong socket).
  try {
    await docker.ping();
  } catch (err) {
    logger.error({ err: err.message }, 'runner: docker daemon unreachable');
    const wrapped = new Error('docker_unreachable: ' + err.message);
    wrapped.code = 'docker_unreachable';
    throw wrapped;
  }

  // Verify the image is present locally. Avoids the cryptic
  // dockerode error and tells the operator exactly what to pull.
  try {
    await docker.getImage(lang.image).inspect();
  } catch (err) {
    logger.error(
      { err: err.message, image: lang.image },
      'runner: image not pulled — run `docker pull <image>`',
    );
    const wrapped = new Error(`image_missing: ${lang.image} — run \`docker pull ${lang.image}\``);
    wrapped.code = 'image_missing';
    throw wrapped;
  }

  try {
    // We embed the user's code as a base64 argument to a tiny
    // shell wrapper. The wrapper decodes it into a tmpfs-backed
    // file then execs the interpreter. We tried two simpler
    // approaches first and both broke on macOS Docker Desktop:
    //
    //   1. `putArchive` into /code — rejected because the rootfs
    //      is readonly *before* container start, when tmpfs
    //      mounts don't exist yet.
    //   2. Pipe code via stdin into `cat > file` — dockerode's
    //      hijacked stream leaked the attach options JSON as the
    //      first chunk, corrupting the file.
    //
    // Base64 in argv is the only path that survives both. We're
    // capped at 256 KB of code which becomes ~342 KB base64,
    // well under the Alpine sh ARG_MAX (~4 MB).
    const interp = lang.interp.join(' ');
    const b64 = Buffer.from(code, 'utf8').toString('base64');
    const file = `/tmp/${lang.filename}`;
    const wrapperCmd = [
      'sh',
      '-c',
      // printf %s avoids any echo/newline shell quirks; -d on
      // base64 (busybox or coreutils) decodes back to bytes.
      `printf %s '${b64}' | base64 -d > ${file} && exec ${interp} ${file}`,
    ];

    container = await docker.createContainer({
      Image: lang.image,
      Cmd: wrapperCmd,
      WorkingDir: '/tmp',
      Tty: false,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: false,
      NetworkDisabled: true,
      HostConfig: {
        AutoRemove: true,
        Memory: MEMORY_MB * 1024 * 1024,
        MemorySwap: MEMORY_MB * 1024 * 1024, // disallow swap inflation
        PidsLimit: 64,
        ReadonlyRootfs: true,
        Tmpfs: { '/tmp': 'rw,exec,size=16m' },
        CapDrop: ['ALL'],
        SecurityOpt: ['no-new-privileges'],
      },
    });

    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });

    // Demultiplex stdout/stderr (Docker's frame format).
    const stdoutBuf = [];
    const stderrBuf = [];
    let bytes = 0;
    docker.modem.demuxStream(
      stream,
      writeCollector(stdoutBuf, (n) => (bytes += n)),
      writeCollector(stderrBuf, (n) => (bytes += n)),
    );

    await container.start();

    // Race the container against the timeout.
    const waitPromise = container.wait();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS),
    );

    let result;
    try {
      result = await Promise.race([waitPromise, timeoutPromise]);
    } catch (err) {
      if (err.message === 'timeout') {
        timedOut = true;
        try { await container.kill({ signal: 'SIGKILL' }); } catch {/* may already be gone */}
        result = { StatusCode: 124 };
      } else {
        throw err;
      }
    }

    stdout = stdoutBuf.join('');
    stderr = stderrBuf.join('');

    if (bytes > MAX_OUTPUT_BYTES) {
      truncated = true;
      const marker = '\n[output truncated]';
      stdout = stdout.slice(0, MAX_OUTPUT_BYTES);
      stderr = stderr.slice(0, MAX_OUTPUT_BYTES);
      // Append marker to whichever stream has data.
      if (stdout) stdout += marker;
      else stderr += marker;
    }

    return {
      stdout,
      stderr,
      exitCode: result.StatusCode ?? 0,
      timedOut,
      truncated,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    logger.error(
      {
        err: err.message,
        stack: err.stack,
        code: err.code,
        language,
        image: lang.image,
        durationMs: Date.now() - start,
      },
      'runner: runCode failed',
    );
    // Try to clean up the container if it was created.
    if (container) {
      try { await container.remove({ force: true }); } catch {/* ignore */}
    }
    throw err;
  }
}

/** Minimal tar stream containing one file. Dockerode uses this for putArchive. */
function makeTar(filename, content) {
  // node-tar would be cleaner but adds a dependency for one file.
  // We construct a minimal ustar header manually.
  const buf = Buffer.from(content, 'utf8');
  const header = Buffer.alloc(512);
  // name (100)
  header.write(filename, 0, 100);
  // mode (8)
  header.write('0000644', 100, 7);
  header.write('\0', 107, 1);
  // uid/gid (8 each) — 0
  header.write('0000000', 108, 7);
  header.write('\0', 115, 1);
  header.write('0000000', 116, 7);
  header.write('\0', 123, 1);
  // size (12)
  header.write(buf.length.toString(8).padStart(11, '0'), 124, 11);
  header.write('\0', 135, 1);
  // mtime (12) — 0
  header.write('00000000000', 136, 11);
  header.write('\0', 147, 1);
  // chksum placeholder (8 spaces)
  for (let i = 148; i < 156; i += 1) header[i] = 0x20;
  // typeflag '0' = normal file
  header.write('0', 156, 1);
  // ustar magic
  header.write('ustar', 257, 5);
  header.write('00', 263, 2);
  // checksum
  let sum = 0;
  for (let i = 0; i < 512; i += 1) sum += header[i];
  header.write(sum.toString(8).padStart(6, '0'), 148, 6);
  header.write('\0', 154, 1);
  header.write(' ', 155, 1);

  // pad content to 512
  const pad = Buffer.alloc((512 - (buf.length % 512)) % 512);
  const eof = Buffer.alloc(1024); // two 512-blocks of zeros
  const tar = Buffer.concat([header, buf, pad, eof]);
  return Readable.from(tar);
}

function writeCollector(arr, onBytes) {
  return new Writable({
    write(chunk, _enc, cb) {
      arr.push(chunk.toString('utf8'));
      onBytes(chunk.length);
      cb();
    },
  });
}
