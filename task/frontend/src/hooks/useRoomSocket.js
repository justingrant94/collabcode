/**
 * useRoomSocket.js — join a CollabCode room over Socket.io.
 *
 * Lifecycle:
 *   1. Mounts → connects (using a Clerk JWT) and emits join-room.
 *   2. Server responds with { state, users }, stored in hook state.
 *   3. Subsequent events (code-change, cursor-move, user-joined,
 *      etc.) update the hook state.
 *   4. Unmount → leave-room + disconnect.
 *
 * Returned API:
 *   {
 *     status: 'connecting' | 'ready' | 'error' | 'closed',
 *     error,
 *     code, language, users,
 *     sendCode(nextCode),
 *     sendCursor(position),
 *     sendLanguage(nextLanguage),
 *     remoteEvents (EventTarget for Editor to subscribe to)
 *   }
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getSocket, disposeSocket } from '../lib/socket.js';

export function useRoomSocket(roomId) {
  const { getToken, isSignedIn } = useAuth();
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [users, setUsers] = useState([]);

  // Starter code for brand-new rooms so the Run button has
  // something to execute on first click. Keyed by language; we
  // only use this when the server-side buffer is empty.
  const STARTERS = {
    javascript: '// Start coding…\nconsole.log("hello");\n',
    typescript: '// Start coding…\nconsole.log("hello");\n',
    python:     '# Start coding…\nprint("hello")\n',
  };

  // EventTarget used to push remote events (code-change, cursor-move)
  // to children without re-rendering the whole tree. Editor / UserCursors
  // subscribe with addEventListener.
  const remoteEventsRef = useRef(new EventTarget());
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isSignedIn || !roomId) return undefined;

    let cancelled = false;
    const socket = getSocket(() => getToken());
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit('join-room', { roomId }, (resp) => {
        if (cancelled) return;
        if (resp?.error) {
          setStatus('error');
          setError(resp.error);
          return;
        }
        setCode(resp.state?.code ?? '');
        setLanguage(resp.state?.language ?? 'javascript');
        setUsers(resp.users ?? []);
        setStatus('ready');

        // First-join hydration: if the server-side buffer is
        // empty (brand-new room), seed the editor with starter
        // code and broadcast it once so every joiner sees the
        // same content.
        if (!resp.state?.code) {
          const starter = STARTERS[resp.state?.language ?? 'javascript'] ?? '';
          if (starter) {
            setCode(starter);
            socket.emit('code-change', { roomId, code: starter });
          }
        }
      });
    };

    const onConnectError = (err) => {
      if (cancelled) return;
      setStatus('error');
      setError(err?.message || 'connection_error');
    };

    const onDisconnect = () => {
      if (cancelled) return;
      setStatus('closed');
    };

    const onCodeChange = ({ code: nextCode, fromSocketId }) => {
      setCode(nextCode);
      remoteEventsRef.current.dispatchEvent(
        new CustomEvent('code-change', { detail: { code: nextCode, fromSocketId } }),
      );
    };

    const onLanguageChange = ({ language: nextLang }) => {
      setLanguage(nextLang);
    };

    const onCursorMove = ({ socketId, position }) => {
      remoteEventsRef.current.dispatchEvent(
        new CustomEvent('cursor-move', { detail: { socketId, position } }),
      );
    };

    const onUserJoined = (user) => {
      setUsers((cur) => {
        // Replace if already present (e.g. brief reconnect), else add.
        const without = cur.filter((u) => u.socketId !== user.socketId);
        return [...without, user];
      });
    };

    const onUserLeft = ({ socketId }) => {
      setUsers((cur) => cur.filter((u) => u.socketId !== socketId));
      remoteEventsRef.current.dispatchEvent(
        new CustomEvent('user-left', { detail: { socketId } }),
      );
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('code-change', onCodeChange);
    socket.on('language-change', onLanguageChange);
    socket.on('cursor-move', onCursorMove);
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);

    // Already connected? Fire onConnect manually.
    if (socket.connected) onConnect();

    return () => {
      cancelled = true;
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('code-change', onCodeChange);
      socket.off('language-change', onLanguageChange);
      socket.off('cursor-move', onCursorMove);
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.emit('leave-room', { roomId });
      // Don't dispose the singleton — other rooms / a remount
      // might still want it. dispose only happens on full app
      // teardown.
    };
  }, [roomId, getToken, isSignedIn]);

  const sendCode = useCallback(
    (nextCode) => {
      // Update local state immediately. The server only broadcasts
      // code-change to OTHER sockets (`socket.to(roomId).emit` in
      // socket/handlers/room.js), so if we wait for the echo our
      // own `code` state never reflects local edits — which breaks
      // anything derived from it:
      //   - Run would POST the previous buffer to /api/execute and
      //     happily show the old result again.
      //   - The Output staleness flag could never trip.
      //   - Snippet "save current" would persist the old text.
      setCode(nextCode);
      socketRef.current?.emit('code-change', { roomId, code: nextCode });
    },
    [roomId],
  );
  const sendCursor = useCallback(
    (position) => socketRef.current?.emit('cursor-move', { roomId, position }),
    [roomId],
  );
  const sendLanguage = useCallback(
    (nextLanguage) =>
      socketRef.current?.emit('language-change', { roomId, language: nextLanguage }),
    [roomId],
  );

  /**
   * Programmatically swap the room buffer (e.g. when loading a
   * snippet). Updates local state, broadcasts to peers, AND
   * fires a synthetic remote 'code-change' event so the Editor
   * applies it without echoing back via its debounced path.
   */
  const applyCode = useCallback(
    (nextCode) => {
      setCode(nextCode);
      socketRef.current?.emit('code-change', { roomId, code: nextCode });
      remoteEventsRef.current.dispatchEvent(
        new CustomEvent('code-change', {
          detail: { code: nextCode, fromSocketId: 'local' },
        }),
      );
    },
    [roomId],
  );

  return {
    status,
    error,
    code,
    language,
    users,
    sendCode,
    sendCursor,
    sendLanguage,
    applyCode,
    remoteEvents: remoteEventsRef.current,
    socket: socketRef.current,
  };
}

// Re-export so callers can clean up on full app teardown (rare).
export { disposeSocket };
