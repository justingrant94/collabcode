/**
 * useDj.js — DJ claim/release + remote DJ tracking.
 *
 * The DJ state for a room lives server-side in Redis. We mirror
 * it locally so the UI can render the "claim" vs "step down"
 * affordance without a round-trip.
 */

import { useCallback, useEffect, useState } from 'react';

export function useDj({ socket, roomId, mySocketId }) {
  const [djSocketId, setDjSocketId] = useState(null);
  const [djUserId, setDjUserId] = useState(null);

  useEffect(() => {
    if (!socket) return undefined;
    const onChanged = ({ djSocketId: id, djUserId: uid }) => {
      setDjSocketId(id);
      setDjUserId(uid);
    };
    socket.on('dj-changed', onChanged);
    return () => socket.off('dj-changed', onChanged);
  }, [socket]);

  const claim = useCallback(() => {
    socket?.emit('dj-claim', { roomId });
  }, [socket, roomId]);

  const release = useCallback(() => {
    socket?.emit('dj-release', { roomId });
  }, [socket, roomId]);

  const isDj = djSocketId && mySocketId && djSocketId === mySocketId;

  return { djSocketId, djUserId, isDj, claim, release };
}
