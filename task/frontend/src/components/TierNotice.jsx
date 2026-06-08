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
      <h3 className="tier-notice__title">Spotify Premium required</h3>
      <p className="tier-notice__body">
        Synced playback uses the Spotify Web Playback SDK, which only works
        for Premium accounts. You can still see what the DJ is playing — you
        just can't listen in here without Premium.
      </p>
      {onDisconnect && (
        <button type="button" className="tier-notice__action" onClick={onDisconnect}>
          Disconnect Spotify
        </button>
      )}
    </div>
  );
}
