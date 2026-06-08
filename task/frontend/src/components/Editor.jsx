/**
 * Editor.jsx — Monaco-based collaborative code editor.
 *
 * Responsibilities:
 *   - Render Monaco with our themed colours (built from CSS tokens)
 *   - Debounce local edits and emit code-change up to the room socket
 *   - Apply remote code-change events without echoing them back
 *     (uses an isApplyingRemote ref to gate the onChange callback)
 *   - Emit cursor-move throttled at ≤ 30 Hz
 *   - Hand decorations to <UserCursors /> via the editor ref
 *
 * Props:
 *   value          string  — current code (controlled by useRoomSocket)
 *   language       string  — Monaco language id
 *   remoteEvents   EventTarget — fires 'code-change' & 'cursor-move'
 *   onLocalChange  (code) => void
 *   onCursorMove   (position) => void
 *   onEditorMount  (editor, monaco) => void  — UserCursors hooks decorations here
 */

import { useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useTheme } from '../hooks/useTheme.js';
import { buildMonacoTheme, registerMonacoTheme } from '../lib/monacoTheme.js';
import './Editor.css';

const DEBOUNCE_MS = 120;
const CURSOR_THROTTLE_MS = 33; // ~30 Hz

export function Editor({
  value,
  language,
  remoteEvents,
  onLocalChange,
  onCursorMove,
  onEditorMount,
}) {
  const { theme } = useTheme();
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const isApplyingRemoteRef = useRef(false);
  const debounceTimer = useRef(null);
  const lastCursorEmit = useRef(0);

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register both light/dark themes from current CSS tokens.
    registerMonacoTheme(monaco);
    monaco.editor.setTheme(buildMonacoTheme(theme));

    // Cursor tracking — throttled.
    editor.onDidChangeCursorPosition((e) => {
      const now = performance.now();
      if (now - lastCursorEmit.current < CURSOR_THROTTLE_MS) return;
      lastCursorEmit.current = now;
      onCursorMove?.({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    onEditorMount?.(editor, monaco);
  };

  /** Local edit → debounce → emit. */
  const handleChange = (next) => {
    if (isApplyingRemoteRef.current) return; // suppress remote-induced events
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      onLocalChange?.(next ?? '');
    }, DEBOUNCE_MS);
  };

  /** Apply a remote code-change without echoing back. */
  useEffect(() => {
    if (!remoteEvents) return undefined;
    const onCode = (ev) => {
      const { code: incoming } = ev.detail;
      const editor = editorRef.current;
      if (!editor) return;
      if (editor.getValue() === incoming) return;

      // Preserve cursor + selection across the model swap so the
      // local user doesn't get bumped to (1,1) every keystroke.
      const sel = editor.getSelections();
      isApplyingRemoteRef.current = true;
      try {
        editor.executeEdits('remote', [
          {
            range: editor.getModel().getFullModelRange(),
            text: incoming,
            forceMoveMarkers: true,
          },
        ]);
        if (sel) editor.setSelections(sel);
      } finally {
        isApplyingRemoteRef.current = false;
      }
    };
    remoteEvents.addEventListener('code-change', onCode);
    return () => remoteEvents.removeEventListener('code-change', onCode);
  }, [remoteEvents]);

  /** Re-tint Monaco when the app theme changes. */
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    registerMonacoTheme(monaco); // refresh from current CSS tokens
    monaco.editor.setTheme(buildMonacoTheme(theme));
  }, [theme]);

  return (
    <div className="editor">
      <MonacoEditor
        height="100%"
        width="100%"
        value={value}
        language={language}
        onMount={handleMount}
        onChange={handleChange}
        options={{
          fontFamily: getComputedStyle(document.documentElement)
            .getPropertyValue('--font-mono')
            .trim() || 'JetBrains Mono, monospace',
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderLineHighlight: 'all',
          tabSize: 2,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
        }}
      />
    </div>
  );
}
