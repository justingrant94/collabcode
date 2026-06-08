/**
 * UserCursors.jsx — remote user cursors overlayed on Monaco.
 *
 * Listens to `remote-events` for 'cursor-move' and 'user-left',
 * then maintains a Monaco deltaDecorations set per user. Each
 * user gets a stable colour (sent in their join payload) so
 * everyone sees consistent ownership across reloads.
 *
 * Decoration anatomy:
 *   - className: "remote-cursor" (border-left caret in CSS)
 *   - Inline color via a per-user dynamic class injected into a
 *     <style> tag — Monaco doesn't allow inline styles on
 *     decorations, but does allow custom classNames.
 *
 * Props:
 *   editor   Monaco editor instance (from Editor's onEditorMount)
 *   users    Array of room users (used for colour lookup + name)
 *   remoteEvents EventTarget from useRoomSocket
 */

import { useEffect, useRef } from 'react';

export function UserCursors({ editor, users, remoteEvents }) {
  // socketId → decorationIds[] so we can replace/remove cleanly.
  const decorationsRef = useRef(new Map());
  // socketId → meta (for colour + name)
  const usersRef = useRef(new Map());
  const styleTagRef = useRef(null);

  // Keep usersRef in sync with the latest users prop.
  useEffect(() => {
    usersRef.current = new Map(users.map((u) => [u.socketId, u]));
    refreshUserStyles(usersRef.current, styleTagRef);
  }, [users]);

  useEffect(() => {
    if (!editor || !remoteEvents) return undefined;

    // Lazy <style> tag we own for per-user colour classes.
    if (!styleTagRef.current) {
      const tag = document.createElement('style');
      tag.dataset.collabCursors = 'true';
      document.head.appendChild(tag);
      styleTagRef.current = tag;
      refreshUserStyles(usersRef.current, styleTagRef);
    }

    const onCursorMove = (ev) => {
      const { socketId, position } = ev.detail;
      const user = usersRef.current.get(socketId);
      if (!user) return;

      const ids = decorationsRef.current.get(socketId) || [];
      const next = editor.deltaDecorations(ids, [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          options: {
            className: `remote-cursor remote-cursor--${classSafe(socketId)}`,
            hoverMessage: { value: user.displayName || 'Anonymous' },
            stickiness: 1, // NeverGrowsWhenTypingAtEdges
          },
        },
      ]);
      decorationsRef.current.set(socketId, next);
    };

    const onUserLeft = (ev) => {
      const { socketId } = ev.detail;
      const ids = decorationsRef.current.get(socketId);
      if (ids) {
        editor.deltaDecorations(ids, []);
        decorationsRef.current.delete(socketId);
      }
    };

    remoteEvents.addEventListener('cursor-move', onCursorMove);
    remoteEvents.addEventListener('user-left', onUserLeft);

    return () => {
      remoteEvents.removeEventListener('cursor-move', onCursorMove);
      remoteEvents.removeEventListener('user-left', onUserLeft);
      // Clear all decorations on unmount.
      for (const [, ids] of decorationsRef.current) {
        editor.deltaDecorations(ids, []);
      }
      decorationsRef.current.clear();
    };
  }, [editor, remoteEvents]);

  // Clean up our <style> tag on full teardown.
  useEffect(() => {
    return () => {
      if (styleTagRef.current?.parentNode) {
        styleTagRef.current.parentNode.removeChild(styleTagRef.current);
        styleTagRef.current = null;
      }
    };
  }, []);

  // This component renders nothing — it only mutates Monaco.
  return null;
}

/** Sanitize a socket id for use in a CSS class. */
function classSafe(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Rebuild the per-user colour CSS so each user's caret matches
 * their assigned colour. Cheap to call — one style tag, ~N rules.
 */
function refreshUserStyles(usersMap, styleTagRef) {
  if (!styleTagRef.current) return;
  const rules = [];
  for (const [socketId, user] of usersMap) {
    const cls = classSafe(socketId);
    const colour = user.colour || 'var(--color-accent)';
    rules.push(`.remote-cursor--${cls} { --remote-cursor-color: ${colour}; }`);
  }
  styleTagRef.current.textContent = rules.join('\n');
}
