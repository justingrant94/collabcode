/**
 * MusicPanel.jsx — Spotify panel for the Room sidebar.
 *
 * Owns the connect → tier-check → player decision tree:
 *   - Not connected: show SpotifyConnect
 *   - Connected, free tier: show TierNotice
 *   - Connected, premium: show MusicPlayer with DJ controls
 *
 * Collapsible header keeps the side column tidy.
 */

import { useState } from 'react';
import { useSpotify } from '../hooks/useSpotify.js';
import { useDj } from '../hooks/useDj.js';
import { SpotifyConnect } from './SpotifyConnect.jsx';
import { TierNotice } from './TierNotice.jsx';
import { MusicPlayer } from './MusicPlayer.jsx';
import { Spinner } from './Spinner.jsx';
import './MusicPanel.css';

export function MusicPanel({ socket, roomId, mySocketId }) {
  const [open, setOpen] = useState(false);
  const { status, connected, product, disconnect, refresh } = useSpotify({ enabled: open });
  const dj = useDj({ socket, roomId, mySocketId });

  return (
    <section className="music-panel">
      <header className="music-panel__head">
        <button
          type="button"
          className="music-panel__toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className="music-panel__title-wrap">
            <span className="music-panel__title">DJ booth</span>
            <span className="music-panel__subtitle">Optional room soundtrack</span>
          </span>
          <span className="music-panel__chev" aria-hidden="true">{open ? '▾' : '▸'}</span>
        </button>
        {connected && (
          <button
            type="button"
            className="music-panel__disconnect"
            onClick={async () => { await disconnect(); refresh(); }}
            title="Disconnect Spotify"
          >
            ✕
          </button>
        )}
      </header>

      {open && (
        <div className="music-panel__body">
          {status === 'loading' && (
            <div className="music-panel__loading">
              <Spinner size="sm" />
              <span>Checking Spotify…</span>
            </div>
          )}

          {status === 'ready' && !connected && (
            <SpotifyConnect onConnected={refresh} />
          )}

          {status === 'ready' && connected && product !== 'premium' && (
            <TierNotice onDisconnect={async () => { await disconnect(); refresh(); }} />
          )}

          {status === 'ready' && connected && product === 'premium' && (
            <MusicPlayer
              socket={socket}
              roomId={roomId}
              isDj={dj.isDj}
              onClaimDj={dj.claim}
              onReleaseDj={dj.release}
            />
          )}

          {status === 'error' && (
            <p className="music-panel__error">Couldn't reach Spotify.</p>
          )}
        </div>
      )}
    </section>
  );
}
