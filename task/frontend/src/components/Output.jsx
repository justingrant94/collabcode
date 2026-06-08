/**
 * Output.jsx — execution result panel.
 *
 * Shows stdout, stderr, exitCode, and timeout/truncation
 * indicators. Designed as a passive presentational component;
 * the run + clear actions live in Toolbar.
 *
 * Props:
 *   result    { stdout, stderr, exitCode, timedOut, truncated, durationMs } | null
 *   running   boolean
 *   error     string | null   — transport-level error, not stderr
 *   stale     boolean         — result no longer matches the editor buffer
 *   hasCode   boolean         — editor currently has non-empty code
 */

import { Spinner } from './Spinner.jsx';
import './Output.css';

export function Output({ result, running, error, stale, hasCode }) {
  if (running) {
    return (
      <section className="output output--running" aria-live="polite">
        <Spinner size="sm" />
        <span>Running…</span>
      </section>
    );
  }

  if (error) {
    return (
      <section className="output output--error" role="alert">
        <p className="output__line">Error: {error}</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="output output--idle">
        <p className="output__hint">
          {hasCode
            ? 'Nothing to display yet — hit Run to execute your code.'
            : 'Nothing to display yet — write some code, then hit Run.'}
        </p>
      </section>
    );
  }

  const { stdout, stderr, exitCode, timedOut, truncated, durationMs } = result;
  const hasOutput = stdout || stderr;

  return (
    <section
      className={`output${stale ? ' output--stale' : ''}`}
      aria-label="Execution output"
    >
      <header className="output__header">
        <span
          className={`output__status output__status--${exitCode === 0 ? 'ok' : 'fail'}`}
        >
          {exitCode === 0 ? 'Success' : `Exit ${exitCode}`}
        </span>
        {timedOut && <span className="output__chip output__chip--warn">Timed out</span>}
        {truncated && <span className="output__chip output__chip--warn">Truncated</span>}
        {stale && (
          <span
            className="output__chip output__chip--warn"
            title="Editor changed since this run"
          >
            Stale — re-run
          </span>
        )}
        <span className="output__duration">{Math.round(durationMs)} ms</span>
      </header>

      {!hasOutput && (
        <p className="output__hint">
          Nothing to display yet — your code didn't print anything.
        </p>
      )}

      {stdout && (
        <pre className="output__pre output__pre--stdout">{stdout}</pre>
      )}
      {stderr && (
        <pre className="output__pre output__pre--stderr">{stderr}</pre>
      )}
    </section>
  );
}
