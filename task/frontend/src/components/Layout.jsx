/**
 * Layout.jsx — global page chrome (header + main slot + footer).
 *
 * Every route renders inside this component. Page content gets
 * the central <main> slot. Header / Footer are constant.
 *
 * Header contents:
 *   - <Logo>           left aligned, links home
 *   - <SignedOut> CTA  Sign-in link (only when logged out)
 *   - <ThemeToggle>
 *   - <ProfileButton>  Clerk UserButton (only when logged in)
 *
 * Future phases mount more here:
 *   Phase 7 → AccentColorPicker (in UserButton dropdown)
 *   Phase 8 → SpotifyConnect / MusicPlayer mini display
 */

import { Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Logo } from './Logo.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';
import { AccentColorPicker } from './AccentColorPicker.jsx';
import { ProfileButton } from './ProfileButton.jsx';
import { Footer } from './Footer.jsx';
import './Layout.css';

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function Layout({ children }) {
  const location = useLocation();
  const isRoomRoute = location.pathname.startsWith('/r/');

  return (
    <div className="layout">
      <header className="layout__header" role="banner">
        <div className={`layout__header-inner${isRoomRoute ? ' layout__header-inner--wide' : ''}`}>
          <Logo />
          <div className="layout__header-actions">
            <SignedOut>
              <Link to="/sign-in" className="layout__signin">Sign in</Link>
            </SignedOut>
            <ThemeToggle />
            <SignedIn>
              {isRoomRoute && <AccentColorPicker />}
              <ProfileButton />
            </SignedIn>
          </div>
        </div>
      </header>

      <main className="layout__main" id="main">
        {children}
      </main>

      {!isRoomRoute && <Footer />}
    </div>
  );
}
