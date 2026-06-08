/**
 * MusicPlayer.jsx — playback controls for a synced room.
 *
 * Built on useSpotifyPlayer (Web Playback SDK). Subscribes to
 * the SDK's player_state_changed event so the local user always
 * sees accurate now-playing info.
 *
 * When the user is the DJ, every state change is broadcast to
 * the room. Followers receive 'dj-state' and call seek/play
 * locally to stay in sync (rough sync; <500ms drift typical).
 *
 * Standalone — drop into MusicPanel or render directly.
 *
 * Props:
 *   socket    Socket.io client (already in a room)
 *   roomId    string
 *   isDj      boolean
 *   onClaimDj () => void
 *   onReleaseDj () => void
 */

import { useEffect, useState } from 'react';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer.js';
import { Spinner } from './Spinner.jsx';
import './MusicPlayer.css';

const SYNC_TOLERANCE_MS = 1500;

export function MusicPlayer({ socket, roomId, isDj, onClaimDj, onReleaseDj }) {
  const { status, player, error } = useSpotifyPlayer({ enabled: true });
  const [nowPlaying, setNowPlaying] = useState(null);

  // Subscribe to local player state.
  useEffect(() => {
    if (!player) return undefined;
    const onState = (state) => {
      if (!state) {
        setNowPlaying(null);
        return;
      }
      const snapshot = {
        trackId: state.track_window.current_track?.id,
        name: state.track_window.current_track?.name,
        artist: state.track_window.current_track?.artists?.map((a) => a.name).join(', '),
        album: state.track_window.current_track?.album?.name,
        artwork: state.track_window.current_track?.album?.images?.[0]?.url,
        paused: state.paused,
        position: state.position,
        duration: state.duration,
        ts: Date.now(),
      };
      setNowPlaying(snapshot);
      if (isDj && socket) {
        socket.emit('dj-state', { roomId, state: snapshot });
      }
    };
    player.addListener('player_state_changed', onState);
    return () => player.removeListener('player_state_changed', onState);
  }, [player, isDj, socket, roomId]);

  // Subscribe to remote DJ state when we're NOT the DJ.
  useEffect(() => {
    if (!player || !socket || isDj) return undefined;
    const onDjState = ({ state }) => {
      if (!state?.trackId) return;
      // Best-effort sync: only correct large drifts; never spam
      // the SDK with seek calls on minor jitter.
      player.getCurrentState().then((cur) => {
        const drift = Math.abs((cur?.position ?? 0) - state.position);
        if (drift > SYNC_TOLERANCE_MS && cur?.track_window?.current_track?.id === state.trackId) {
          player.seek(state.position).catch(() => {});
        }
        if (cur?.paused !== state.paused) {
          (state.paused ? player.pause() : player.resume()).catch(() => {});
        }
      });
    };
    socket.on('dj-state', onDjState);
    return () => socket.off('dj-state', onDjState);
  }, [player, socket, isDj]);

  if (status === 'loading') {
    return (
      <div className="player player--loading">
        <Spinner size="sm" />
        <span>Loading Spotify player…</span>
      </div>
    );
  }
  if (status === 'error') {
    return <p className="player player--error">Spotify error: {error}</p>;
  }
  if (status === 'not_supported') {
    return null; // TierNotice handles this
  }

  return (
    <div className="player">
      <div className="player__art">
        {nowPlaying?.artwork ? (
          <img src={nowPlaying.artwork} alt="" />
        ) : (
          <div className="player__art-placeholder" aria-hidden="true" />
        )}
      </div>

      <div className="player__meta">
        <p className="player__track">{nowPlaying?.name || 'Nothing playing'}</p>
        <p className="player__artist">{nowPlaying?.artist || '—'}</p>
      </div>

      <div className="player__controls">
        <button
          type="button"
          className="player__control"
          onClick={() => player?.previousTrack()}
          disabled={!player}
          aria-label="Previous"
        >‹‹</button>
        <button
          type="button"
          className="player__control player__control--primary"
          onClick={() => player?.togglePlay()}
          disabled={!player}
          aria-label={nowPlaying?.paused ? 'Play' : 'Pause'}
        >
          {nowPlaying?.paused ? '▶' : '❚❚'}
        </button>
        <button
          type="button"
          className="player__control"
          onClick={() => player?.nextTrack()}
          disabled={!player}
          aria-label="Next"
        >››</button>
      </div>

      <div className="player__dj">
        {isDj ? (
          <button type="button" className="player__dj-btn player__dj-btn--active" onClick={onReleaseDj}>
            DJing — step down
          </button>
        ) : (
          <button type="button" className="player__dj-btn" onClick={onClaimDj}>
            Become DJ
          </button>
        )}
      </div>
    </div>
  );
}
