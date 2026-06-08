/**
 * App.jsx — top-level app shell.
 *
 * Wires:
 *   - ClerkProvider          → auth context for the whole tree
 *   - BrowserRouter + Routes → SPA routing
 *   - <Layout>               → header + main slot + footer
 *
 * Route map:
 *   /                  → Landing (public)
 *   /sign-in/*         → Clerk SignIn (public)
 *   /sign-up/*         → Clerk SignUp (public)
 *   /r/:roomId         → Room (protected — Phase 2)
 *   *                  → NotFound
 *
 * Page content lives in src/pages/. NEVER inline page markup
 * in this file.
 */

import { useMemo } from 'react';
import { ClerkProvider } from '@clerk/clerk-react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';

import { Layout } from './components/Layout.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';
import { ToastProvider } from './components/ToastProvider.jsx';
import { Landing } from './pages/Landing.jsx';
import { NotFound } from './pages/NotFound.jsx';
import { SignIn } from './pages/SignIn.jsx';
import { SignUp } from './pages/SignUp.jsx';
import { Room } from './pages/Room.jsx';
import { SpotifyCallback } from './pages/SpotifyCallback.jsx';
import {
  CLERK_PUBLISHABLE_KEY,
  buildClerkAppearance,
} from './lib/clerk.js';

/**
 * Inner shell — must be inside BrowserRouter so we can call
 * useNavigate and feed Clerk's routerPush/Replace. This is the
 * recommended integration pattern: keeps Clerk's internal
 * navigations (post-sign-in, factor-2, etc.) inside our SPA
 * router instead of doing full-page loads.
 */
function AppShell() {
  const navigate = useNavigate();
  const appearance = useMemo(() => buildClerkAppearance(), []);

  if (!CLERK_PUBLISHABLE_KEY) {
    // Friendly dev-only error so a fresh clone with no env keys
    // shows a helpful message instead of an opaque crash.
    return (
      <Layout>
        <div className="missing-key-warning">
          <h1>Missing Clerk key</h1>
          <p>
            Set <code>VITE_CLERK_PUBLISHABLE_KEY</code> in <code>frontend/.env</code> and reload.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      appearance={appearance}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <ToastProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/sign-in/*" element={<SignIn />} />
            <Route path="/sign-up/*" element={<SignUp />} />
            <Route
              path="/r/:roomId"
              element={
                <RequireAuth>
                  <Room />
                </RequireAuth>
              }
            />
            <Route
              path="/spotify/callback"
              element={
                <RequireAuth>
                  <SpotifyCallback />
                </RequireAuth>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </ToastProvider>
    </ClerkProvider>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
