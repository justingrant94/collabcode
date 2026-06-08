/**
 * lib/spotifyPkce.js — PKCE helpers for Spotify auth.
 *
 * PKCE keeps the OAuth secret out of the browser. We:
 *   1. Generate a random code_verifier (43-128 chars).
 *   2. SHA-256 it, base64url-encode → code_challenge.
 *   3. Stash the verifier in sessionStorage so we can use it
 *      when Spotify redirects back with the auth code.
 *
 * Backend handles the actual token exchange — see
 * backend/src/routes/spotify.js POST /callback.
 */

const VERIFIER_KEY = 'collab.spotify.pkce.verifier';

function randomVerifier(length = 64) {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  // Convert to a URL-safe alphabet of [A-Za-z0-9_-]
  const map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let s = '';
  for (let i = 0; i < arr.length; i += 1) s += map[arr[i] % map.length];
  return s;
}

function base64UrlEncode(bytes) {
  let s = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', data);
}

/** Build the verifier+challenge pair and persist the verifier. */
export async function createPkceChallenge() {
  const verifier = randomVerifier();
  const challenge = base64UrlEncode(await sha256(verifier));
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  return { verifier, challenge };
}

export function readStoredVerifier() {
  return sessionStorage.getItem(VERIFIER_KEY);
}

export function clearStoredVerifier() {
  sessionStorage.removeItem(VERIFIER_KEY);
}

export function getRedirectUri() {
  // Prefer the explicitly-configured URI so it ALWAYS matches the
  // one registered in the Spotify dashboard, regardless of which
  // hostname the user typed (127.0.0.1 vs localhost). Falls back
  // to the current origin only if the env var isn't set.
  return (
    import.meta.env.VITE_SPOTIFY_REDIRECT_URI
    || `${window.location.origin}/spotify/callback`
  );
}
