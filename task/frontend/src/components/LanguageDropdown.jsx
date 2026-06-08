/**
 * LanguageDropdown.jsx — Radix-based language picker.
 *
 * Uses @radix-ui/react-dropdown-menu for proper a11y (focus
 * trap, keyboard nav, aria roles). Standalone — drop-in
 * anywhere a language selector is needed.
 *
 * Props:
 *   value     string — current language id
 *   onChange  (next: string) => void
 */

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import './LanguageDropdown.css';

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python',     label: 'Python' },
  // Visible but execution unsupported on the runner (Phase 4 baseline).
  // The dropdown still lets users pick for syntax highlighting only.
  { id: 'go',         label: 'Go' },
  { id: 'rust',       label: 'Rust' },
  { id: 'java',       label: 'Java' },
  { id: 'c',          label: 'C' },
  { id: 'cpp',        label: 'C++' },
];

export function LanguageDropdown({ value, onChange }) {
  const current = LANGUAGES.find((l) => l.id === value) || LANGUAGES[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className="lang-dd__trigger" aria-label="Change language">
          <span className="lang-dd__label">{current.label}</span>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="lang-dd__content"
          sideOffset={6}
          align="start"
        >
          {LANGUAGES.map((lang) => (
            <DropdownMenu.Item
              key={lang.id}
              className="lang-dd__item"
              data-active={lang.id === value ? 'true' : undefined}
              onSelect={() => onChange?.(lang.id)}
            >
              {lang.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
