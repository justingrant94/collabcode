/**
 * pages/SignIn.jsx — Clerk sign-in page.
 *
 * Renders Clerk's hosted <SignIn/> widget inside our Layout so
 * the page chrome stays consistent. Routing-path matches the
 * <Route path="/sign-in/*">, which is required for Clerk's
 * internal navigation (forgot-password, factor-2, etc.).
 */

import { SignIn as ClerkSignIn } from '@clerk/clerk-react';
import { buildClerkAppearance } from '../lib/clerk.js';
import { useTheme } from '../hooks/useTheme.js';
import './AuthPage.css';

export function SignIn() {
  useTheme(); // re-render on theme switch so Clerk gets fresh tokens
  return (
    <section className="auth-page">
      <div className="auth-page__inner">
        <ClerkSignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          appearance={buildClerkAppearance()}
        />
      </div>
    </section>
  );
}
