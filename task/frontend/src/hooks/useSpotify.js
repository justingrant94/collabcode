/**
 * useSpotify.js — connection status + auth lifecycle.
 *
 * Tells the caller whether Spotify is linked, whether the user
 * has Premium (only Premium can use Web Playback SDK), and
 * exposes connect()/disconnect() helpers.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useApi } from './useApi.js';
import { createPkceChallenge, getRedirectUri } from '../lib/spotifyPkce.js';

export function useSpotify({ enabled = true } = {}) {
  const { isSignedIn } = useAuth();
  const callApi = useApi();
  const [state, setState] = useState({
    status: 'idle',
    connected: false,
    product: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    if (!isSignedIn) {
      setState({ status: 'idle', connected: false, product: null, error: null });
      return;
    }
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const data = await callApi('/api/spotify/me');
      setState({
        status: 'ready',
        connected: !!data.connected,
        product: data.product || null,
        error: null,
      });
    } catch (err) {
      setState({ status: 'error', connected: false, product: null, error: err.message });
    }
  }, [enabled, isSignedIn, callApi]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  /** Kick off PKCE auth → redirect to Spotify. */
  const connect = useCallback(async () => {
    const { challenge } = await createPkceChallenge();
    const redirectUri = getRedirectUri();
    const { url } = await callApi(
      `/api/spotify/login?redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${challenge}`,
    );
    window.location.href = url;
  }, [callApi]);

  /** Revoke + delete stored tokens server-side. */
  const disconnect = useCallback(async () => {
    await callApi('/api/spotify/disconnect', { method: 'DELETE' });
    setState({ status: 'ready', connected: false, product: null, error: null });
  }, [callApi]);

  return { ...state, refresh, connect, disconnect };
}
