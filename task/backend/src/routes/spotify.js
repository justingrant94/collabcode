/**
 * routes/spotify.js — Spotify OAuth + tokens.
 *
 *   GET    /api/spotify/login      → returns Spotify auth URL
 *   POST   /api/spotify/callback   { code, codeVerifier, redirectUri }
 *                                  → exchanges code, stores encrypted tokens
 *   GET    /api/spotify/me         → connection status + cached profile
 *   POST   /api/spotify/access     → returns a fresh access token (auto-refresh)
 *   DELETE /api/spotify/disconnect → deletes the SpotifyAccount row
 *
 * Why PKCE on the client side: keeps the Spotify Client Secret
 * server-only. The frontend builds the auth URL (with our
 * client ID + a PKCE challenge), redirects the user, and posts
 * the auth code back here for token exchange.
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, loadUser } from '../middleware/requireAuth.js';
import { encryptToken, decryptToken } from '../lib/spotifyCrypto.js';
import { logger } from '../lib/logger.js';

export const spotifyRouter = Router();

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_ME_URL = 'https://api.spotify.com/v1/me';

const SCOPES = [
  'user-read-email',
  'user-read-private',
  'streaming',            // Web Playback SDK
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ');

spotifyRouter.use(requireAuth, loadUser);

// ─── Build auth URL ──────────────────────────────────────
spotifyRouter.get('/login', (req, res) => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'spotify_not_configured' });
  }
  // The client passes its own PKCE code_challenge in the query.
  // We just give it our authorize URL template; the SPA already
  // generated and stored the verifier.
  const url = `https://accounts.spotify.com/authorize?${new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: req.query.redirect_uri,
    code_challenge_method: 'S256',
    code_challenge: req.query.code_challenge,
    scope: SCOPES,
    show_dialog: 'true',
  }).toString()}`;
  res.json({ url });
});

// ─── Exchange auth code → tokens ─────────────────────────
spotifyRouter.post('/callback', async (req, res, next) => {
  try {
    const { code, codeVerifier, redirectUri } = req.body || {};
    if (!code || !codeVerifier || !redirectUri) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: 'spotify_not_configured' });

    const tokenRes = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      logger.warn({ err }, 'spotify token exchange failed');
      return res.status(400).json({ error: 'spotify_exchange_failed' });
    }

    const tokenData = await tokenRes.json();
    const profile = await fetchSpotifyProfile(tokenData.access_token);

    await prisma.spotifyAccount.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        accessToken: encryptToken(tokenData.access_token),
        refreshToken: encryptToken(tokenData.refresh_token),
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        scope: tokenData.scope || SCOPES,
        spotifyUserId: profile?.id || null,
        product: profile?.product || null,
      },
      update: {
        accessToken: encryptToken(tokenData.access_token),
        refreshToken: encryptToken(tokenData.refresh_token),
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        scope: tokenData.scope || SCOPES,
        spotifyUserId: profile?.id || null,
        product: profile?.product || null,
      },
    });

    res.json({ connected: true, product: profile?.product || null });
  } catch (err) { next(err); }
});

// ─── Connection status ───────────────────────────────────
spotifyRouter.get('/me', async (req, res, next) => {
  try {
    const acc = await prisma.spotifyAccount.findUnique({
      where: { userId: req.user.id },
      select: { spotifyUserId: true, product: true, expiresAt: true, scope: true },
    });
    if (!acc) return res.json({ connected: false });
    res.json({
      connected: true,
      product: acc.product,
      spotifyUserId: acc.spotifyUserId,
    });
  } catch (err) { next(err); }
});

// ─── Get a fresh access token (auto-refresh if expired) ──
spotifyRouter.post('/access', async (req, res, next) => {
  try {
    const acc = await prisma.spotifyAccount.findUnique({
      where: { userId: req.user.id },
    });
    if (!acc) return res.status(404).json({ error: 'not_connected' });

    // Refresh if < 60s left on the clock.
    if (acc.expiresAt.getTime() - Date.now() < 60_000) {
      const refreshed = await refreshAccessToken(decryptToken(acc.refreshToken));
      if (!refreshed) return res.status(401).json({ error: 'refresh_failed' });
      await prisma.spotifyAccount.update({
        where: { userId: req.user.id },
        data: {
          accessToken: encryptToken(refreshed.access_token),
          // Spotify sometimes returns a new refresh token, sometimes not.
          ...(refreshed.refresh_token && {
            refreshToken: encryptToken(refreshed.refresh_token),
          }),
          expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      });
      return res.json({ accessToken: refreshed.access_token, expiresIn: refreshed.expires_in });
    }

    res.json({
      accessToken: decryptToken(acc.accessToken),
      expiresIn: Math.floor((acc.expiresAt.getTime() - Date.now()) / 1000),
    });
  } catch (err) { next(err); }
});

// ─── Disconnect ──────────────────────────────────────────
spotifyRouter.delete('/disconnect', async (req, res, next) => {
  try {
    await prisma.spotifyAccount.deleteMany({ where: { userId: req.user.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ─── Helpers ─────────────────────────────────────────────
async function fetchSpotifyProfile(accessToken) {
  try {
    const r = await fetch(SPOTIFY_ME_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  if (!clientId) return null;
  const r = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });
  if (!r.ok) return null;
  return r.json();
}
