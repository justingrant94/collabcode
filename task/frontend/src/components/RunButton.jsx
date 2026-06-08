/**
 * RunButton.jsx — primary "run code" action.
 *
 * Visual: accent-filled button. Shows the Spinner (sm, white)
 * while a run is in flight, plus the word "Running…".
 *
 * Standalone so other surfaces (e.g. snippet preview pane) can
 * reuse it.
 */

import { Spinner } from './Spinner.jsx';
import './RunButton.css';

/**
 * @param {{ onClick: () => void, running?: boolean, disabled?: boolean }} props
 */
export function RunButton({ onClick, running = false, disabled = false }) {
  return (
    <button
      type="button"
      className="run-btn"
      onClick={onClick}
      disabled={running || disabled}
      data-running={running ? 'true' : undefined}
    >
      {running ? (
        <>
          <Spinner size="sm" color="currentColor" />
          <span>Running…</span>
        </>
      ) : (
        <>
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
            <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5z" />
          </svg>
          <span>Run</span>
        </>
      )}
    </button>
  );
}
