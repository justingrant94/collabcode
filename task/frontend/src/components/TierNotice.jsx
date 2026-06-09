/**
 * TierNotice.jsx — explains Spotify Premium requirement.
 *
 * Renders when a user has connected Spotify but doesn't have a
 * Premium account. The Web Playback SDK only authenticates
 * Premium users — Spotify's restriction, not ours.
 */

import './TierNotice.css';

export function TierNotice({ onDisconnect }) {
  return (
    <div className="tier-notice" role="status">
      <h3 className="tier-notice__title">Spotify connected. Premium is required for browser playback.</h3>
      <p className="tier-notice__body">
        Your account linked successfully. Spotify only unlocks the Web Playback SDK for Premium accounts, so the room soundtrack will stay unavailable in-browser until the account upgrades.
      </p>
      <div className="tier-notice__actions">
        <a
          href="https://www.spotify.com/premium/"
          className="tier-notice__action tier-notice__action--primary"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Premium plans
        </a>
        {onDisconnect && (
          <button type="button" className="tier-notice__action" onClick={onDisconnect}>
            Disconnect Spotify
          </button>
        )}
      </div>
    </div>
  );
}
