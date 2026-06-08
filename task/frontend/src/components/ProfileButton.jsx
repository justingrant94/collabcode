/**
 * ProfileButton.jsx — header avatar that opens Clerk's UserButton.
 *
 * Phase 1 ships the basic UserButton. Phase 7 adds a custom
 * "Accent colour" entry to its dropdown via Clerk's
 * userProfileProps + a custom action.
 *
 * Renders nothing when signed out (Layout shows Sign-in link
 * elsewhere). All theming flows through buildClerkAppearance().
 */

import { SignedIn, UserButton } from '@clerk/clerk-react';
import { buildClerkAppearance } from '../lib/clerk.js';
import { useTheme } from '../hooks/useTheme.js';

export function ProfileButton() {
  // useTheme is observed so re-renders happen on theme switch
  // and Clerk picks up fresh CSS variables for its appearance.
  useTheme();

  return (
    <SignedIn>
      <UserButton
        afterSignOutUrl="/"
        appearance={buildClerkAppearance()}
        userProfileProps={{ appearance: buildClerkAppearance() }}
      />
    </SignedIn>
  );
}
