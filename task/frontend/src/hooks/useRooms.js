/**
 * useRooms.js — fetch the current user's recent rooms.
 *
 * Keeps a tiny local cache for dashboard surfaces so the signed-
 * in landing can show where to resume instead of dumping the
 * user onto a dead-end CTA.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useApi } from './useApi.js';

export function useRooms(limit = 6) {
  const { isSignedIn } = useAuth();
  const callApi = useApi();
  const [state, setState] = useState({ status: 'idle', rooms: [], error: null });

  const refetch = useCallback(async () => {
    if (!isSignedIn) {
      setState({ status: 'idle', rooms: [], error: null });
      return;
    }

    setState((current) => ({ ...current, status: 'loading', error: null }));
    try {
      const { rooms } = await callApi(`/api/rooms?limit=${limit}`);
      setState({ status: 'ready', rooms: rooms || [], error: null });
    } catch (err) {
      setState({ status: 'error', rooms: [], error: err.message });
    }
  }, [callApi, isSignedIn, limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}