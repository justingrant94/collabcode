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
import { readStoredVerifier, clearStoredVerifier, getRedirectUri } from '../lib/spotifyPkce.js';
import { Spinner } from '../components/Spinner.jsx';
import './SpotifyCallback.css';

export function SpotifyCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const callApi = useApi();
  const toast = useToast();
  // Strict-mode protection: only exchange once per mount.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code = params.get('code');
    const err = params.get('error');
    const verifier = readStoredVerifier();
    const redirectUri = getRedirectUri();

    (async () => {
      try {
        if (err) throw new Error(err);
        if (!code) throw new Error('missing_code');
        if (!verifier) throw new Error('missing_verifier');
        await callApi('/api/spotify/callback', {
          method: 'POST',
          body: { code, code_verifier: verifier, redirect_uri: redirectUri },
        });
        toast.success('Spotify connected');
      } catch (e) {
        toast.error(`Spotify connection failed (${e.message})`);
      } finally {
        clearStoredVerifier();
        navigate('/', { replace: true });
      }
    })();
  }, [params, callApi, navigate, toast]);

  return (
    <main className="spotify-callback">
      <div className="spotify-callback__inner">
        <Spinner size="lg" />
        <p>Finishing Spotify connection…</p>
      </div>
    </main>
  );
}
