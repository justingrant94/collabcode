/**
 * lib/clerk.js — client-side Clerk config.
 *
 * Pulls VITE_CLERK_PUBLISHABLE_KEY from env and exposes the
 * Clerk appearance object that themes Clerk widgets with our
 * design tokens.
 *
 * Why this matters: Clerk renders its sign-in / user-profile
 * UIs inside iframes/portals that DON'T inherit our CSS unless
 * we pass tokens through the appearance API. Without this every
 * Clerk surface looks foreign.
 */

export const CLERK_PUBLISHABLE_KEY =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

/**
 * Read a CSS custom property from :root (whatever the active
 * theme currently is). Falls back to a sensible default if the
 * variable is missing — Clerk has loaded BEFORE we'd want it to
 * fail just because root.css hasn't parsed yet.
 */
function readToken(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/**
 * Build the Clerk appearance object from live tokens. Called
 * lazily (not at module init) so theme switches re-tint Clerk.
 */
export function buildClerkAppearance() {
  return {
    variables: {
      colorPrimary: readToken('--color-accent', '#7C5CFC'),
      colorText: readToken('--color-text-primary', '#F4F4F5'),
      colorTextSecondary: readToken('--color-text-secondary', '#A1A1AA'),
      colorBackground: readToken('--color-surface', '#111114'),
      colorInputBackground: readToken('--color-surface-raised', '#17171B'),
      colorInputText: readToken('--color-text-primary', '#F4F4F5'),
      colorDanger: readToken('--color-danger', '#EF4444'),
      colorSuccess: readToken('--color-success', '#22C55E'),
      colorWarning: readToken('--color-warning', '#F59E0B'),
      borderRadius: readToken('--radius-md', '8px'),
      fontFamily: readToken('--font-sans', 'Inter, sans-serif'),
    },
    elements: {
      // Clerk's primary buttons inherit colorPrimary automatically.
      // We only override what the variables system doesn't cover.
      card: {
        boxShadow: readToken('--shadow-lg', '0 16px 32px rgba(0,0,0,0.55)'),
        backgroundColor: readToken('--color-surface', '#111114'),
        border: `1px solid ${readToken('--color-border', '#26262C')}`,
      },
      socialButtonsIconButton: {
        border: `1px solid ${readToken('--color-border', '#26262C')}`,
      },
    },
  };
}
