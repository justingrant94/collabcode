/**
 * useSnippets.js — CRUD hook for personal snippets.
 *
 * Owns the snippet list state for whoever consumes it. Exposes
 * imperative methods that hit the backend then update local
 * state. Single hook so multiple components don't desync on
 * the same data.
 *
 * Returns:
 *   {
 *     status: 'idle' | 'loading' | 'ready' | 'error',
 *     error,
 *     snippets,
 *     refetch(),
 *     save({ title, code, language }),
 *     update(id, patch),
 *     remove(id),
 *   }
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useApi } from './useApi.js';

export function useSnippets() {
  const { isSignedIn } = useAuth();
  const callApi = useApi();

  const [state, setState] = useState({ status: 'idle', error: null, snippets: [] });

  const refetch = useCallback(async () => {
    if (!isSignedIn) {
      setState({ status: 'idle', error: null, snippets: [] });
      return;
    }
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const { snippets } = await callApi('/api/snippets');
      setState({ status: 'ready', error: null, snippets });
    } catch (err) {
      setState({ status: 'error', error: err.message, snippets: [] });
    }
  }, [isSignedIn, callApi]);

  useEffect(() => { refetch(); }, [refetch]);

  const save = useCallback(async (payload) => {
    const snippet = await callApi('/api/snippets', { method: 'POST', body: payload });
    setState((s) => ({ ...s, snippets: [snippet, ...s.snippets] }));
    return snippet;
  }, [callApi]);

  const update = useCallback(async (id, patch) => {
    const snippet = await callApi(`/api/snippets/${id}`, { method: 'PATCH', body: patch });
    setState((s) => ({
      ...s,
      snippets: s.snippets.map((sn) => (sn.id === id ? snippet : sn)),
    }));
    return snippet;
  }, [callApi]);

  const remove = useCallback(async (id) => {
    await callApi(`/api/snippets/${id}`, { method: 'DELETE' });
    setState((s) => ({ ...s, snippets: s.snippets.filter((sn) => sn.id !== id) }));
  }, [callApi]);

  return { ...state, refetch, save, update, remove };
}
