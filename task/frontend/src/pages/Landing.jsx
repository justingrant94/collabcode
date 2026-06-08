/**
 * Landing.jsx — homepage.
 *
 * Two states:
 *   Signed out → hero + Sign-in CTA
 *   Signed in  → hero + "New Room" button (creates room via
 *                 POST /api/rooms then navigates to /r/:id)
 *
 * Snippets sidebar and recent-rooms list will live INSIDE the
 * /r/:roomId page (Phase 3/6). Landing intentionally stays
 * focused on the single "start a session" action.
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { useApi } from '../hooks/useApi.js';
import { Spinner } from '../components/Spinner.jsx';
import './Landing.css';

export function Landing() {
  return (
    <section className="landing">
      <div className="landing__inner">
        <h1 className="landing__title">CollabCode</h1>
        <p className="landing__tagline">
          Real-time collaborative coding — with snippets, sandboxed execution, and a synced DJ booth.
        </p>

        <SignedOut>
          <div className="landing__cta">
            <Link to="/sign-in" className="landing__btn landing__btn--primary">
              Sign in to start
            </Link>
            <Link to="/sign-up" className="landing__btn landing__btn--ghost">
              Create an account
            </Link>
          </div>
        </SignedOut>

        <SignedIn>
          <NewRoomButton />
        </SignedIn>
      </div>
    </section>
  );
}

/**
 * Creates a new room via the API and navigates into it.
 * Inlined here only because it's coupled 1:1 to the Landing
 * CTA — every other "create room" use site would lift this
 * into its own component.
 */
function NewRoomButton() {
  const callApi = useApi();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const room = await callApi('/api/rooms', {
        method: 'POST',
        body: { language: 'javascript' },
      });
      navigate(`/r/${room.id}`);
    } catch (err) {
      setError(err.message || 'Could not create room');
      setLoading(false);
    }
  };

  return (
    <div className="landing__cta">
      <button
        type="button"
        className="landing__btn landing__btn--primary"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? <Spinner size="sm" color="currentColor" /> : 'New room'}
      </button>
      {error && <p className="landing__error" role="alert">{error}</p>}
    </div>
  );
}
