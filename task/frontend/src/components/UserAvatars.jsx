/**
 * UserAvatars.jsx — pills of who's in the room right now.
 *
 * Sits in the Room top bar. Each user is a circular initial-badge
 * coloured to match their cursor colour, with a tooltip-style
 * title showing their display name.
 *
 * Could later become a richer hover popover (Phase 7 might add
 * "make DJ" actions here); for now it's a deliberately small,
 * standalone component.
 */

import './UserAvatars.css';

/**
 * @param {{ users: Array<{ socketId: string, displayName?: string, imageUrl?: string|null, colour?: string }> }} props
 */
export function UserAvatars({ users }) {
  if (!users || users.length === 0) {
    return (
      <div className="avatars" aria-live="polite">
        <span className="avatars__empty">Only you</span>
      </div>
    );
  }

  return (
    <ul className="avatars" aria-label={`${users.length} collaborator${users.length === 1 ? '' : 's'}`}>
      {users.map((user) => (
        <li key={user.socketId} className="avatars__item">
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt=""
              className="avatars__img"
              style={{ '--ring-color': user.colour || 'var(--color-accent)' }}
              title={user.displayName || 'Anonymous'}
            />
          ) : (
            <span
              className="avatars__badge"
              style={{
                background: user.colour || 'var(--color-accent)',
                color: 'var(--color-accent-contrast)',
              }}
              title={user.displayName || 'Anonymous'}
              aria-label={user.displayName || 'Anonymous'}
            >
              {(user.displayName || 'A').slice(0, 1).toUpperCase()}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
