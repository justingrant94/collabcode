/**
 * lib/monacoTheme.js — build Monaco themes from our CSS tokens.
 *
 * Why this exists: Monaco can't read CSS custom properties at
 * runtime — it needs concrete hex strings. We snapshot the
 * relevant tokens whenever the user switches theme and define
 * "collab-dark" / "collab-light" with those snapshots.
 *
 * Editor.jsx calls registerMonacoTheme(monaco) on mount and
 * again whenever the app theme changes, then setTheme() to the
 * matching id.
 */

function read(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function normalizeHex(value) {
  // Monaco rejects "rgba(...)" / 8-char hex with alpha for some
  // colour keys. Falls back to the value as-is if it already
  // looks like 6/8-char hex.
  if (!value) return '#000000';
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6,8}$/.test(trimmed)) return trimmed;
  // rgba → rough approximation: drop alpha
  const m = trimmed.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const toHex = (n) => Number(n).toString(16).padStart(2, '0');
    return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`;
  }
  return '#000000';
}

export function registerMonacoTheme(monaco) {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  const base = isLight ? 'vs' : 'vs-dark';
  const themeData = {
    base,
    inherit: true,
    rules: [],
    colors: {
      'editor.background': normalizeHex(read('--color-surface', isLight ? '#FFFFFF' : '#111114')),
      'editor.foreground': normalizeHex(read('--color-text-primary', isLight ? '#18181B' : '#F4F4F5')),
      'editor.lineHighlightBackground': normalizeHex(read('--color-surface-hover', isLight ? '#F4F4F5' : '#1E1E24')),
      'editorLineNumber.foreground': normalizeHex(read('--color-text-muted', '#71717A')),
      'editorLineNumber.activeForeground': normalizeHex(read('--color-text-primary', isLight ? '#18181B' : '#F4F4F5')),
      'editor.selectionBackground': normalizeHex(read('--color-accent', '#7C5CFC')) + '40',
      'editor.inactiveSelectionBackground': normalizeHex(read('--color-accent', '#7C5CFC')) + '22',
      'editorCursor.foreground': normalizeHex(read('--color-accent', '#7C5CFC')),
      'editorWhitespace.foreground': normalizeHex(read('--color-border', '#26262C')),
      'editorIndentGuide.background': normalizeHex(read('--color-border', '#26262C')),
      'editorIndentGuide.activeBackground': normalizeHex(read('--color-border-strong', '#36363E')),
    },
  };

  monaco.editor.defineTheme('collab-dark', { ...themeData, base: 'vs-dark' });
  monaco.editor.defineTheme('collab-light', { ...themeData, base: 'vs' });
}

export function buildMonacoTheme(theme) {
  return theme === 'light' ? 'collab-light' : 'collab-dark';
}
