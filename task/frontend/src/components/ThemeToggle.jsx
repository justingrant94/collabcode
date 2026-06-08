/**
 * ThemeToggle.jsx — sleek animated sun/moon button.
 *
 * Standalone component. Reads theme via useTheme(), no props.
 * Mountable anywhere (currently lives in Layout header).
 *
 * Animation: the active icon scales/fades out and the other
 * scales/fades in. Subtle rotation for an extra premium beat.
 */

import { useTheme } from '../hooks/useTheme.js';
import './ThemeToggle.css';

/**
 * @returns {JSX.Element}
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <span className="theme-toggle__icons" data-active={isDark ? 'moon' : 'sun'}>
        {/* Sun (active in light theme) */}
        <svg
          className="theme-toggle__icon theme-toggle__icon--sun"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>

        {/* Moon (active in dark theme) */}
        <svg
          className="theme-toggle__icon theme-toggle__icon--moon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
    </button>
  );
}
