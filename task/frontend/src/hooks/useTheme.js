/**
 * useTheme.js — theme state hook.
 *
 * Single source of truth for current theme ("dark" | "light").
 * Reads/writes localStorage so the choice persists across reloads.
 * Reflects the choice on <html data-theme="..."> so root.css token
 * overrides apply globally.
 *
 * Works alongside the no-FOUC bootstrap script in index.html which
 * sets the initial attribute BEFORE React mounts (preventing a
 * flash of the wrong theme on first paint).
 *
 * Used by: ThemeToggle, Editor (rebuilds Monaco theme on change).
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'collab.theme';
const DEFAULT_THEME = 'dark';

/**
 * Resolve the initial theme:
 *   1. localStorage value if present and valid
 *   2. System preference via prefers-color-scheme
 *   3. Fallback to dark
 */
function resolveInitialTheme() {
  // why: SSR safety even though we're SPA — defensive in case
  // this hook ever runs in a non-browser context (e.g. tests).
  if (typeof window === 'undefined') return DEFAULT_THEME;

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;

  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches;
  return prefersLight ? 'light' : 'dark';
}

/**
 * Apply theme to the <html> element and persist to localStorage.
 * Extracted so the no-FOUC inline script in index.html can reuse
 * the same key + attribute name.
 */
function applyTheme(next) {
  document.documentElement.setAttribute('data-theme', next);
  window.localStorage.setItem(STORAGE_KEY, next);
}

/**
 * React hook exposing the current theme + setters.
 *
 * @returns {{
 *   theme: 'dark' | 'light',
 *   setTheme: (t: 'dark' | 'light') => void,
 *   toggleTheme: () => void
 * }}
 */
export function useTheme() {
  const [theme, setThemeState] = useState(resolveInitialTheme);

  // why: keep <html data-theme> in sync if the state ever drifts
  // (e.g. via setTheme below or a system pref change while open).
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (next !== 'dark' && next !== 'light') return;
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((cur) => (cur === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, setTheme, toggleTheme };
}
