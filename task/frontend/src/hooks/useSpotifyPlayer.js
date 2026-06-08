/**
 * useSpotifyPlayer.js — load the Web Playback SDK + create a player.
 *
 * Requirements:
 *   - Spotify Premium account (free + open won't authenticate).
 *   - Backend must be able to mint fresh access tokens via
 *     /api/spotify/access (auto-refresh).
 *
 * Returned:
 *   {
 *     status: 'idle' | 'loading' | 'ready' | 'error' | 'not_supported',
 *     deviceId,         // Spotify device id once registered
 *     player,           // the underlying SDK player (for play/pause/seek)
 *     error,
 *   }
 *
 * The SDK script is loaded once globally; subsequent hook calls
 * reuse it.
 */

import { useEffect, useRef, useState } from 'react';
import { useApi } from './useApi.js';

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
let sdkPromise = null;

function loadSdk() {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.Spotify) return resolve(window.Spotify);
    window.onSpotifyWebPlaybackSDKReady = () => resolve(window.Spotify);
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => reject(new Error('spotify_sdk_load_failed'));
    document.body.appendChild(script);
  });
  return sdkPromise;
}

export function useSpotifyPlayer({ enabled }) {
  const callApi = useApi();
  const [state, setState] = useState({
    status: 'idle', deviceId: null, player: null, error: null,
  });
  const playerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    setState((s) => ({ ...s, status: 'loading' }));

    loadSdk()
      .then((Spotify) => {
        if (cancelled) return;
        const player = new Spotify.Player({
          name: 'CollabCode DJ',
          volume: 0.5,
          getOAuthToken: async (cb) => {
            try {
              const { accessToken } = await callApi('/api/spotify/access', { method: 'POST' });
              cb(accessToken);
            } catch (err) {
              // Token refresh failed — propagate to listener below.
              cb('');
            }
          },
        });

        playerRef.current = player;

        player.addListener('ready', ({ device_id }) => {
          if (cancelled) return;
          setState({ status: 'ready', deviceId: device_id, player, error: null });
        });
        player.addListener('not_ready', () => {
          if (cancelled) return;
          setState((s) => ({ ...s, status: 'idle', deviceId: null }));
        });
        player.addListener('initialization_error', ({ message }) => {
          if (cancelled) return;
          setState({ status: 'error', deviceId: null, player: null, error: message });
        });
        player.addListener('authentication_error', ({ message }) => {
          if (cancelled) return;
          setState({ status: 'error', deviceId: null, player: null, error: message });
        });
        player.addListener('account_error', ({ message }) => {
          if (cancelled) return;
          setState({ status: 'not_supported', deviceId: null, player: null, error: message });
        });

        player.connect();
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: 'error', deviceId: null, player: null, error: err.message });
      });

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try { playerRef.current.disconnect(); } catch {/* ignore */}
        playerRef.current = null;
      }
    };
  }, [enabled, callApi]);

  return state;
}
