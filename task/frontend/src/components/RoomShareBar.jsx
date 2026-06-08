/**
 * RoomShareBar.jsx — top bar of a room.
 *
 * Shows the room id and a "Copy invite link" button. Standalone
 * component so other surfaces (e.g. a modal) can reuse it.
 */

import { useCallback, useState } from 'react';
import './RoomShareBar.css';

/**
 * @param {{ roomId: string, language: string }} props
 */
export function RoomShareBar({ roomId, language }) {
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

  return (
    <div className="share-bar" role="region" aria-label="Room sharing">
      <div className="share-bar__meta">
        <span className="share-bar__label">Room</span>
        <code className="share-bar__id">{roomId}</code>
        <span className="share-bar__dot" aria-hidden="true">·</span>
        <span className="share-bar__lang">{language}</span>
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
