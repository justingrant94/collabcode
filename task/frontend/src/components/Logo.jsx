/**
 * Logo.jsx — wordmark + CE monogram, links to home.
 *
 * Standalone component. Same CE glyph language as favicon and
 * cursors — keeps the brand coherent across every surface.
 */

import { Link } from 'react-router-dom';
import './Logo.css';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="CollabCode home">
      <span className="logo__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <rect x="0" y="0" width="24" height="24" rx="6" className="logo__badge" />
          <g className="logo__glyph">
            {/* C */}
            <path
              d="M9 7.5
                 A4 4 0 1 0 9 16.5
                 L9 14.4
                 A2 2 0 1 1 9 9.6
                 Z"
            />
            {/* E */}
            <rect x="11" y="7.4" width="1.4" height="9.2" rx="0.5" />
            <rect x="11" y="7.4" width="4.4" height="1.4" rx="0.5" />
            <rect x="11" y="11.3" width="3.4" height="1.4" rx="0.5" />
            <rect x="11" y="15.2" width="4.4" height="1.4" rx="0.5" />
          </g>
        </svg>
      </span>
      <span className="logo__wordmark">CollabCode</span>
    </Link>
  );
}
