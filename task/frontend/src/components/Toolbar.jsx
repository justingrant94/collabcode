/**
 * Toolbar.jsx — Room toolbar (Run + Clear + LanguageDropdown).
 *
 * Sits above the editor. Composed of small standalone bits
 * (RunButton, LanguageDropdown) so the same components can be
 * reused on the Landing snippet preview or future surfaces.
 *
 * Props:
 *   language          string
 *   onLanguageChange  (next: string) => void
 *   onRun             () => void
 *   running           boolean
 *   onClear           () => void   — optional: dismiss the current Output result/error
 *   canClear          boolean      — disables the Clear button when there's nothing to clear
 */

import { RunButton } from './RunButton.jsx';
import { LanguageDropdown } from './LanguageDropdown.jsx';
import './Toolbar.css';

export function Toolbar({
  language,
  onLanguageChange,
  onRun,
  running,
  onClear,
  canClear,
  runDisabled = false,
  runTitle,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar__left">
        <LanguageDropdown value={language} onChange={onLanguageChange} />
      </div>
      <div className="toolbar__right">
        {onClear && (
          <button
            type="button"
            className="toolbar__clear"
            onClick={onClear}
            disabled={!canClear}
            aria-label="Clear output"
            title="Clear output"
          >
            Clear
          </button>
        )}
        <RunButton
          onClick={onRun}
          running={running}
          disabled={runDisabled}
          title={runTitle}
        />
      </div>
    </div>
  );
}
