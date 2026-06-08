/**
 * Footer.jsx — global footer with attribution + contact links.
 *
 * Sits at the bottom of every page. Two icon buttons:
 *   - LinkedIn → https://www.linkedin.com/in/justin-grant94/
 *   - Email    → mailto:justinrant373@gmail.com
 *
 * Email uses a generic envelope icon rather than the Gmail "M"
 * (Gmail's trademark restricts that mark to actual Gmail product
 * surfaces — generic envelope is the correct universal choice).
 */

import './Footer.css';

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer__inner">
        <p className="footer__credit">
          © {YEAR} CollabCode · Built by Justin
        </p>

        <nav className="footer__links" aria-label="Contact">
          <a
            href="https://www.linkedin.com/in/justin-grant94/"
            className="footer__link footer__link--linkedin"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn — Justin Grant"
            title="LinkedIn"
          >
            {/* Official LinkedIn brand glyph (single-path, currentColor) */}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.86-3.04-1.86 0-2.15 1.45-2.15 2.95v5.66H9.34V9h3.41v1.56h.05c.47-.9 1.63-1.86 3.36-1.86 3.6 0 4.26 2.37 4.26 5.45v6.3zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
            </svg>
          </a>

          <a
            href="mailto:justinrant373@gmail.com"
            className="footer__link footer__link--email"
            aria-label="Email — justinrant373@gmail.com"
            title="Email"
          >
            {/* Generic envelope (NOT Gmail M — brand-safe) */}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="m3.5 6.5 8.5 7 8.5-7" />
            </svg>
          </a>
        </nav>
      </div>
    </footer>
  );
}
