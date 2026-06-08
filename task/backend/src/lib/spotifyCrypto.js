/**
 * lib/spotifyCrypto.js — AES-256-GCM at-rest encryption for tokens.
 *
 * Why: storing OAuth tokens in plaintext is a footgun. With this,
 * a DB dump alone is useless — an attacker also needs the key
 * (held only in TOKEN_ENCRYPTION_KEY env var).
 *
 * Format: base64(iv | authTag | ciphertext)
 *   iv:        12 bytes (GCM standard)
 *   authTag:   16 bytes
 *   ciphertext: variable
 *
 * Key: 32-byte hex string in TOKEN_ENCRYPTION_KEY (64 hex chars).
 * Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-char hex string');
  }
  return Buffer.from(hex, 'hex');
}

export function encryptToken(plain) {
  if (typeof plain !== 'string') throw new Error('encryptToken: not a string');
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptToken(ciphertextB64) {
  const buf = Buffer.from(ciphertextB64, 'base64');
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ct = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
