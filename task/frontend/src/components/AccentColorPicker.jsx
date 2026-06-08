/**
 * AccentColorPicker.jsx — pick one of the validated palette
 * colours for the user's accent.
 *
 * Renders inside a Radix Popover triggered by a small swatch
 * button. Selecting a colour persists via useMe.setAccentColor
 * and applies the colour live by toggling the document accent
 * variable inline.
 *
 * Important: only colours present in the backend's ACCENT_PALETTE
 * are accepted. Keep this list in sync with backend/src/routes/user.js.
 */

import * as Popover from '@radix-ui/react-popover';
import { useMe } from '../hooks/useMe.js';
import { useToast } from './ToastProvider.jsx';
import './AccentColorPicker.css';

const PALETTE = [
  { value: '#7C5CFC', label: 'Brand violet' },
  { value: '#F472B6', label: 'Pink' },
  { value: '#60A5FA', label: 'Blue' },
  { value: '#34D399', label: 'Emerald' },
  { value: '#FBBF24', label: 'Amber' },
  { value: '#A78BFA', label: 'Violet' },
  { value: '#F87171', label: 'Rose' },
  { value: '#2DD4BF', label: 'Teal' },
  { value: '#FB923C', label: 'Orange' },
];

export function AccentColorPicker() {
  const { me, setAccentColor } = useMe();
  const { push } = useToast();
  const current = me?.accentColor || '#7C5CFC';

  const handlePick = async (value) => {
    if (value === current) return;
    try {
      // Live-apply for instant feedback. The user's cursor in
      // rooms picks this up on the next join (Phase 3 reads
      // user.accentColor server-side).
      document.documentElement.style.setProperty('--color-accent', value);
      await setAccentColor(value);
    } catch (err) {
      // Rollback the inline style too.
      document.documentElement.style.removeProperty('--color-accent');
      push(`Could not save: ${err.message}`, { variant: 'danger' });
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="accent-trigger"
          aria-label="Pick accent colour"
          title="Accent colour"
        >
          <span
            className="accent-trigger__swatch"
            style={{ background: current }}
            aria-hidden="true"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="accent-popover" sideOffset={8} align="end">
          <p className="accent-popover__title">Accent colour</p>
          <p className="accent-popover__hint">Also your cursor colour in rooms.</p>
          <ul className="accent-popover__grid" role="radiogroup" aria-label="Accent colours">
            {PALETTE.map((p) => {
              const active = p.value === current;
              return (
                <li key={p.value}>
                  <button
                    type="button"
                    className="accent-popover__swatch"
                    role="radio"
                    aria-checked={active}
                    aria-label={p.label}
                    title={p.label}
                    style={{ background: p.value }}
                    data-active={active ? 'true' : undefined}
                    onClick={() => handlePick(p.value)}
                  />
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
