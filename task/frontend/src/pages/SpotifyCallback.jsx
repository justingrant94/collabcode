/**
 * SpotifyCallback.jsx — page hit by Spotify's redirect.
 *
 * Spotify sends us back with ?code=... after the user grants
 * (or denies) permission. We pair that with the PKCE verifier
 * we stashed in sessionStorage and POST both to our backend,
 * which exchanges them for tokens and stores them encrypted.
 *
 * On success → toast + go home.
 * On failure → toast + go home (the user can retry).
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../components/ToastProvider.jsx';
import {
  readStoredVerifier,
  clearStoredVerifier,
  getRedirectUri,
  readSpotifyReturnTo,
  clearSpotifyReturnTo,
} from '../lib/spotifyPkce.js';
import { Spinner } from '../components/Spinner.jsx';
import './SpotifyCallback.css';

export function SpotifyCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const callApi = useApi();
  const { push } = useToast();
  // Strict-mode protection: only exchange once per mount.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = params.get('code');
    const err = params.get('error');
    const verifier = readStoredVerifier();
    const redirectUri = getRedirectUri();
    const returnTo = readSpotifyReturnTo();

    (async () => {
      try {
        if (err) throw new Error(err);
        if (!code) throw new Error('missing_code');
        if (!verifier) throw new Error('missing_verifier');
        await callApi('/api/spotify/callback', {
          method: 'POST',
          body: { code, codeVerifier: verifier, redirectUri },
        });
        push('Spotify connected', { variant: 'success' });
      } catch (e) {
        push(`Spotify connection failed (${e.message})`, { variant: 'danger', duration: 5000 });
      } finally {
        clearStoredVerifier();
        clearSpotifyReturnTo();
        navigate(returnTo, { replace: true });
      }
    })();
  }, [params, callApi, navigate, push]);

  return (
    <main className="spotify-callback">
      <div className="spotify-callback__inner">
        <Spinner size="lg" />
        <p>Finishing Spotify connection…</p>
      </div>
    </main>
  );
}
