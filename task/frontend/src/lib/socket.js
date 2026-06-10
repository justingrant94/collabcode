/**
 * lib/socket.js — singleton Socket.io client (lazy).
 *
 * Use via the `useSocket(roomId)` hook — it handles connection
 * lifecycle, token refresh, and event subscriptions. Don't
 * import this file directly elsewhere.
 *
 * The actual Socket.io client is created lazily because in dev
 * with HMR we'd otherwise leak sockets across hot reloads. The
 * hook tears down on unmount; the singleton just keeps a
 * reference so multiple hook callers share one connection.
 */

import { io } from 'socket.io-client';

let socket = null;

const RAW_URL = import.meta.env.VITE_API_URL || '';
const IS_PROD = import.meta.env.PROD;
const URL = RAW_URL.trim();

if (IS_PROD && !URL) {
  throw new Error('Missing VITE_API_URL in production');
}

export function getSocket(getToken) {
  if (socket && socket.connected) return socket;
  if (socket) {
    socket.connect();
    return socket;
  }
  socket = io(URL || undefined, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    // Async auth so Clerk tokens are fetched right before connect.
    auth: async (cb) => {
      try {
        const token = await getToken();
        cb({ token });
      } catch {
        cb({ token: null });
      }
    },
  });
  socket.connect();
  return socket;
}

export function disposeSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
