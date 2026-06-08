/**
 * RequireAuth.jsx — route gate component.
 *
 * Wrap protected routes with <RequireAuth>...</RequireAuth>.
 * Behaviour:
 *   - Clerk still loading       → render a full-page Spinner
 *   - Signed in                 → render children
 *   - Signed out                → redirect to /sign-in (with
 *                                  return-to query param so we
 *                                  bounce them back after login)
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { Spinner } from './Spinner.jsx';
import './RequireAuth.css';

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function RequireAuth({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="require-auth__loading" role="status">
        <Spinner size="lg" ariaLabel="Loading session" />
      </div>
    );
  }

  if (!isSignedIn) {
    // Preserve attempted destination so post-login we can return.
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/sign-in?redirect_url=${redirectTo}`} replace />;
  }

  return children;
}
