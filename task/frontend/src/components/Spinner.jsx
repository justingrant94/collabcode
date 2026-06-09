/**
 * Spinner.jsx — branded loading indicator.
 *
 * THE single spinner used everywhere in the app (no native
 * spinners, no third-party). Visual concept: "CE" letters built
 * from small Lego-like bricks that snap into place one-by-one,
 * then fade out and rebuild — continuous loop.
 *
 * Sizes:
 *   "sm" (16px)  — inline in buttons. Renders a simplified 4-brick
 *                  rotating cluster (full CE is too cramped here).
 *   "md" (32px)  — default. Full CE Lego build.
 *   "lg" (64px)  — page-level loading.
 *   number       — custom pixel size.
 *
 * Accessibility:
 *   role="status" + aria-label so screen readers announce loading.
 *   Honours prefers-reduced-motion via CSS fallback.
 *
 * Used by: Run button, snippet save/delete, confirm dialogs,
 *          initial app load, route transitions, and snippet
 *          fetch states.
 */

import './Spinner.css';

const SIZE_MAP = { sm: 16, md: 32, lg: 64 };

/**
 * @param {object}  props
 * @param {'sm'|'md'|'lg'|number} [props.size='md']
 * @param {string}  [props.ariaLabel='Loading']
 * @param {string}  [props.color]        - Override --color-accent for local context
 * @param {string}  [props.className]    - Layout class for parent positioning
 * @returns {JSX.Element}
 */
export function Spinner({ size = 'md', ariaLabel = 'Loading', color, className = '' }) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size] ?? SIZE_MAP.md;
  const variant = typeof size === 'string' ? size : px <= 20 ? 'sm' : px >= 56 ? 'lg' : 'md';

  // Inline style only used when a local context needs a specific
  // spinner colour. Otherwise components inherit --color-accent.
  const style = color ? { '--spinner-color': color } : undefined;

  return (
    <span
      className={`spinner spinner--${variant} ${className}`.trim()}
      role="status"
      aria-label={ariaLabel}
      style={style}
    >
      {variant === 'sm' ? <SmallCluster px={px} /> : <CELego px={px} />}
      <span className="spinner__sr-only">{ariaLabel}</span>
    </span>
  );
}

/* ─── Small variant: 4 bricks pulsing in sequence ──────────── */

function SmallCluster({ px }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={px}
      height={px}
      fill="currentColor"
      aria-hidden="true"
      className="spinner__svg"
    >
      <rect className="spinner__brick" data-i="0" x="1"  y="1"  width="6" height="6" rx="1.5" />
      <rect className="spinner__brick" data-i="1" x="9"  y="1"  width="6" height="6" rx="1.5" />
      <rect className="spinner__brick" data-i="2" x="9"  y="9"  width="6" height="6" rx="1.5" />
      <rect className="spinner__brick" data-i="3" x="1"  y="9"  width="6" height="6" rx="1.5" />
    </svg>
  );
}

/* ─── Full CE Lego build ─────────────────────────────────────
   Letters are drawn as a grid of small rounded "bricks".
   Each brick has data-i so CSS can stagger animation-delay.
   ─────────────────────────────────────────────────────────── */

function CELego({ px }) {
  // 32-unit grid → C on the left (cols 0-2), E on the right (cols 4-6)
  // Brick size: 3.6 (with 0.4 gap). Letter is 7 rows tall.
  const bricks = [
    // C — outline of letter "C" (top bar, left column, bottom bar)
    ...row(0, [0, 1, 2]),                 // top
    ...col(0, [1, 2, 3, 4, 5]),           // left column
    ...row(6, [0, 1, 2]),                 // bottom

    // E — full bar pattern
    ...row(0, [4, 5, 6]),                 // top
    ...col(4, [1, 2, 3, 4, 5]),           // left column
    ...row(3, [4, 5]),                    // middle bar (short)
    ...row(6, [4, 5, 6]),                 // bottom
  ];

  // Deduplicate (col/row overlaps) while preserving the first
  // appearance so the staggered delay tells a coherent build story.
  const seen = new Set();
  const unique = [];
  for (const b of bricks) {
    const key = `${b.x},${b.y}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(b);
    }
  }

  return (
    <svg
      viewBox="0 0 32 32"
      width={px}
      height={px}
      fill="currentColor"
      aria-hidden="true"
      className="spinner__svg"
    >
      {unique.map((b, i) => (
        <rect
          key={`${b.x}-${b.y}`}
          className="spinner__brick"
          data-i={i % 10}        /* delay buckets 0-9 keep CSS simple */
          x={b.x}
          y={b.y}
          width={3.6}
          height={3.6}
          rx={1}
        />
      ))}
    </svg>
  );
}

/* Helpers to express grid coordinates in human terms. */
function row(r, cols) {
  return cols.map((c) => ({ x: 1 + c * 4, y: 1 + r * 4 }));
}
function col(c, rows) {
  return rows.map((r) => ({ x: 1 + c * 4, y: 1 + r * 4 }));
}
