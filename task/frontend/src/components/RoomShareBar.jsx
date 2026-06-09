/**
 * RoomShareBar.jsx — top bar of a room.
 *
 * Pushes the invite moment to the front. The copy button matters
 * more than the room id itself because it is the activation step.
 */

import { useCallback, useState } from 'react';
import './RoomShareBar.css';

/**
 * @param {{ roomId: string }} props
 */
export function RoomShareBar({ roomId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const url = `${window.location.origin}/r/${roomId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard might be blocked (insecure context, permission
      // denied). Fail silently — the URL is visible in the
      // browser bar regardless.
    }
  }, [roomId]);

  const shortId = roomId?.slice(0, 8) || roomId;

  return (
    <div className="share-bar" role="region" aria-label="Room sharing">
      <div className="share-bar__meta">
        <span className="share-bar__label">Room live</span>
        <div className="share-bar__copy-block">
          <p className="share-bar__title">Invite someone to start coding with you.</p>
          <p className="share-bar__hint">Copy the link and drop it in Slack, Discord, text, or email.</p>
        </div>
        <code className="share-bar__id">room/{shortId}</code>
      </div>
      <button
        type="button"
        className="share-bar__copy"
        onClick={handleCopy}
        aria-live="polite"
      >
        {copied ? 'Copied!' : 'Copy invite link'}
      </button>
    </div>
  );
}
