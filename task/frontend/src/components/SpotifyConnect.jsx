/**
 * SpotifyConnect.jsx — "Connect with Spotify" button.
 *
 * Brand-compliant:
 *   - Spotify Green (#1DB954) background — from --color-spotify-green
 *   - White text + official logo
 *   - Approved copy: "Connect with Spotify"
 *   - Logo never recoloured / tilted / combined with other glyphs
 */

import { useEffect, useState } from 'react';
import { useSpotify } from '../hooks/useSpotify.js';
import { storeSpotifyReturnTo } from '../lib/spotifyPkce.js';
import { Spinner } from './Spinner.jsx';
import './SpotifyConnect.css';

export function SpotifyConnect({ onConnected }) {
  const { connect, connected } = useSpotify();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (connected) onConnected?.();
  }, [connected, onConnected]);

  if (connected) return null;

  const handleClick = async () => {
    setBusy(true);
    try {
      storeSpotifyReturnTo(window.location.pathname + window.location.search);
      await connect(); // navigates away on success
    } catch (err) {
      setBusy(false);
    }
  };

  return (
    <div className="spotify-connect-card">
      <button
        type="button"
        className="spotify-connect"
        onClick={handleClick}
        disabled={busy}
        aria-label="Connect with Spotify"
      >
        {busy ? (
          <Spinner size="sm" color="var(--color-spotify-white)" />
        ) : (
          <svg className="spotify-connect__logo" viewBox="0 0 168 168" width="20" height="20" aria-hidden="true">
            <path
              fill="currentColor"
              d="M83.996 0C37.747 0 0 37.747 0 84c0 46.251 37.747 84 83.996 84 46.254 0 84.004-37.749 84.004-84 0-46.253-37.75-84-84.004-84zm38.5 121.297c-1.5 2.466-4.715 3.244-7.18 1.737-19.66-12.02-44.41-14.74-73.563-8.075-2.814.643-5.628-1.121-6.27-3.936-.645-2.815 1.115-5.629 3.936-6.275 31.9-7.293 59.263-4.142 81.337 9.35 2.464 1.51 3.243 4.722 1.74 7.2zm10.27-22.882c-1.886 3.066-5.892 4.034-8.958 2.15-22.504-13.834-56.823-17.842-83.448-9.764-3.45 1.04-7.093-.904-8.138-4.348-1.04-3.45.904-7.087 4.354-8.132 30.413-9.228 68.222-4.758 94.072 11.127 3.066 1.885 4.034 5.89 2.118 8.967zm.882-23.832C107.397 59.51 64.483 57.928 39.084 65.628c-4.138 1.255-8.514-1.082-9.768-5.222-1.254-4.142 1.082-8.516 5.226-9.774 29.166-8.85 76.564-7.137 106.832 10.83 3.722 2.205 4.943 7.014 2.736 10.738-2.2 3.726-7.016 4.95-10.732 2.738z"
            />
          </svg>
        )}
        <span>Connect with Spotify</span>
      </button>
      <p className="spotify-connect__hint">
        Premium is required for in-room playback. Free accounts can keep using the editor normally.
      </p>
    </div>
  );
}
