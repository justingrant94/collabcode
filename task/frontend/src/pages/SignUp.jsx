/**
 * pages/SignUp.jsx — Clerk sign-up page.
 *
 * Mirrors SignIn.jsx for the sign-up flow.
 */

import { SignUp as ClerkSignUp } from '@clerk/clerk-react';
import { buildClerkAppearance } from '../lib/clerk.js';
import { useTheme } from '../hooks/useTheme.js';
import './AuthPage.css';

export function SignUp() {
  useTheme();
  return (
    <section className="auth-page">
      <div className="auth-page__inner">
        <ClerkSignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          appearance={buildClerkAppearance()}
        />
      </div>
    </section>
  );
}
