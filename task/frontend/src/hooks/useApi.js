/**
 * useApi.js — convenience hook returning a Clerk-aware fetch.
 *
 * Wraps lib/api.js so callers don't need to manually pass the
 * Clerk JWT every call. Returns a stable function reference so
 * it can safely be a useEffect dependency.
 *
 * Example:
 *   const callApi = useApi();
 *   const room = await callApi('/api/rooms', { method: 'POST', body: { language } });
 */

import { useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { api } from '../lib/api.js';

export function useApi() {
  const { getToken } = useAuth();

  return useCallback(
    async (path, options = {}) => {
      const token = await getToken();
      return api(path, { ...options, token });
    },
    [getToken],
  );
}
