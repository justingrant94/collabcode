/**
 * useMe.js — current user profile (DB-side, not Clerk's).
 *
 * Mirrors what /api/me returns. Keeps a local cache + optimistic
 * update path for accentColor changes so the UI re-tints
 * immediately while the request is in flight.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useApi } from './useApi.js';

export function useMe() {
  const { isSignedIn } = useAuth();
  const callApi = useApi();
  const [state, setState] = useState({ status: 'idle', me: null, error: null });

  const refetch = useCallback(async () => {
    if (!isSignedIn) {
      setState({ status: 'idle', me: null, error: null });
      return;
    }
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const me = await callApi('/api/me');
      setState({ status: 'ready', me, error: null });
    } catch (err) {
      setState({ status: 'error', me: null, error: err.message });
    }
  }, [isSignedIn, callApi]);

  useEffect(() => { refetch(); }, [refetch]);

  const setAccentColor = useCallback(async (next) => {
    // Optimistic update — revert on error.
    const prev = state.me;
    if (prev) setState((s) => ({ ...s, me: { ...prev, accentColor: next } }));
    try {
      await callApi('/api/me/accent', { method: 'PATCH', body: { accentColor: next } });
    } catch (err) {
      // Rollback
      if (prev) setState((s) => ({ ...s, me: prev }));
      throw err;
    }
  }, [callApi, state.me]);

  return { ...state, refetch, setAccentColor };
}
