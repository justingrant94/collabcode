/**
 * lib/api.js — small fetch wrapper.
 *
 * Wraps fetch() with:
 *   - JSON content-type
 *   - Bearer token if provided
 *   - Auto-parses JSON
 *   - Throws ApiError on non-2xx so callers can rely on
 *     either "data" being truthy or a catch happening
 *
 * Uses VITE_API_URL (empty in dev → uses Vite proxy).
 */

const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  constructor(message, status, code, body) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

/**
 * @param {string}   path        e.g. "/api/rooms"
 * @param {object}   [options]
 * @param {string}   [options.method='GET']
 * @param {object}   [options.body]
 * @param {string}   [options.token] - Clerk JWT, if auth required
 * @param {AbortSignal} [options.signal]
 */
export async function api(path, options = {}) {
  const { method = 'GET', body, token, signal } = options;

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
    signal,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    throw new ApiError(
      data?.message || data?.error || res.statusText,
      res.status,
      data?.error || 'request_failed',
      data,
    );
  }
  return data;
}
