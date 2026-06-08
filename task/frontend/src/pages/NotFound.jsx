/**
 * NotFound.jsx — 404 page.
 */

import { Link } from 'react-router-dom';
import './NotFound.css';

export function NotFound() {
  return (
    <section className="not-found">
      <div className="not-found__inner">
        <p className="not-found__code">404</p>
        <h1 className="not-found__title">Page not found</h1>
        <p className="not-found__hint">
          That route doesn't exist (or hasn't been built yet).
        </p>
        <Link to="/" className="not-found__link">Back to home</Link>
      </div>
    </section>
  );
}
