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
import { useApi } from '../hooks/useApi.js';
import { useSpotifyPlayer } from '../hooks/useSpotifyPlayer.js';
import { Spinner } from './Spinner.jsx';
import './MusicPlayer.css';

const SYNC_TOLERANCE_MS = 1500;

export function MusicPlayer({ socket, roomId, isDj, onClaimDj, onReleaseDj }) {
  const callApi = useApi();
  const { status, deviceId, player, error } = useSpotifyPlayer({ enabled: true });
  const [nowPlaying, setNowPlaying] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [playingTrackId, setPlayingTrackId] = useState(null);

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
        uri: state.track_window.current_track?.uri,
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
    if (!player || !socket || isDj || !deviceId) return undefined;
    const onDjState = ({ state }) => {
      if (!state?.trackId) return;
      // Best-effort sync: only correct large drifts; never spam
      // the SDK with seek calls on minor jitter.
      player.getCurrentState().then(async (cur) => {
        const currentTrackId = cur?.track_window?.current_track?.id;
        if (state.uri && currentTrackId !== state.trackId) {
          try {
            await callApi('/api/spotify/player', {
              method: 'PUT',
              body: {
                deviceId,
                trackUri: state.uri,
                positionMs: state.position,
                paused: state.paused,
              },
            });
          } catch {
            return;
          }
          return;
        }
        const drift = Math.abs((cur?.position ?? 0) - state.position);
        if (drift > SYNC_TOLERANCE_MS && currentTrackId === state.trackId) {
          player.seek(state.position).catch(() => {});
        }
        if (cur?.paused !== state.paused) {
          (state.paused ? player.pause() : player.resume()).catch(() => {});
        }
      });
    };
    socket.on('dj-state', onDjState);
    return () => socket.off('dj-state', onDjState);
  }, [callApi, deviceId, player, socket, isDj]);

  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const { tracks } = await callApi(`/api/spotify/search?q=${encodeURIComponent(trimmed)}`);
      setResults(tracks || []);
    } catch (err) {
      setSearchError(err.message || 'Could not search Spotify.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handlePlayTrack = async (track) => {
    if (!isDj) return;
    if (!deviceId) {
      setSearchError('Spotify player is still connecting. Wait a second and try again.');
      return;
    }

    setPlayingTrackId(track.id);
    setSearchError(null);
    try {
      await callApi('/api/spotify/player', {
        method: 'PUT',
        body: {
          deviceId,
          trackUri: track.uri,
        },
      });
    } catch (err) {
      setSearchError(err.message || 'Could not start playback.');
    } finally {
      setPlayingTrackId(null);
    }
  };

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
        <p className="player__hint">
          {isDj
            ? 'Search for a track below, then start the room soundtrack.'
            : 'Only the current DJ can choose the room soundtrack.'}
        </p>
      </div>

      <div className="player__search">
        <form className="player__search-form" onSubmit={handleSearch}>
          <input
            type="search"
            className="player__search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tracks or artists"
            disabled={!isDj || searching || playingTrackId !== null}
          />
          <button
            type="submit"
            className="player__search-btn"
            disabled={!isDj || searching || playingTrackId !== null}
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searchError && <p className="player__error-note">{searchError}</p>}

        {results.length > 0 && (
          <ul className="player__results" aria-label="Spotify search results">
            {results.map((track) => (
              <li key={track.id} className="player__result">
                <button
                  type="button"
                  className="player__result-btn"
                  onClick={() => handlePlayTrack(track)}
                  disabled={!isDj || playingTrackId === track.id}
                >
                  <span className="player__result-copy">
                    <span className="player__result-title">{track.name}</span>
                    <span className="player__result-meta">{track.artist} · {track.album}</span>
                  </span>
                  <span className="player__result-action">
                    {playingTrackId === track.id ? 'Starting…' : 'Play'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="player__controls">
        <button
          type="button"
          className="player__control"
          onClick={() => player?.previousTrack()}
          disabled={!player || !isDj}
          aria-label="Previous"
        >‹‹</button>
        <button
          type="button"
          className="player__control player__control--primary"
          onClick={() => player?.togglePlay()}
          disabled={!player || !isDj}
          aria-label={nowPlaying?.paused ? 'Play' : 'Pause'}
        >
          {nowPlaying?.paused ? '▶' : '❚❚'}
        </button>
        <button
          type="button"
          className="player__control"
          onClick={() => player?.nextTrack()}
          disabled={!player || !isDj}
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
