/**
 * SnippetsSidebar.jsx — list + save / load / delete snippets.
 *
 * Sits beside the Editor inside Room. Two responsibilities:
 *   - Show the user's saved snippets (SnippetItem list)
 *   - Offer a "Save current code" button → opens SaveSnippetDialog
 *
 * Loading a snippet asks the parent to apply the code via
 * onLoadSnippet — the parent (Room) decides whether to wipe the
 * room buffer, broadcast the change, etc.
 *
 * Deleting prompts ConfirmDialog first.
 *
 * Props:
 *   currentCode      string  — what to save if user clicks Save
 *   currentLanguage  string
 *   onLoadSnippet    (snippet) => void
 */

import { useState } from 'react';
import { useSnippets } from '../hooks/useSnippets.js';
import { useToast } from './ToastProvider.jsx';
import { ConfirmDialog } from './ConfirmDialog.jsx';
import { SaveSnippetDialog } from './SaveSnippetDialog.jsx';
import { SnippetItem } from './SnippetItem.jsx';
import { Spinner } from './Spinner.jsx';
import './SnippetsSidebar.css';

export function SnippetsSidebar({ currentCode, currentLanguage, onLoadSnippet }) {
  const { status, error, snippets, save, remove } = useSnippets();
  const { push } = useToast();
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, snippet: null, loading: false });

  const handleSave = async ({ title }) => {
    try {
      await save({ title, code: currentCode, language: currentLanguage });
      push('Snippet saved', { variant: 'success' });
      setSaveOpen(false);
    } catch (err) {
      push(`Save failed: ${err.message}`, { variant: 'danger' });
    }
  };

  const requestDelete = (snippet) => {
    setConfirmDelete({ open: true, snippet, loading: false });
  };

  const performDelete = async () => {
    const snippet = confirmDelete.snippet;
    if (!snippet) return;
    setConfirmDelete((s) => ({ ...s, loading: true }));
    try {
      await remove(snippet.id);
      push(`Deleted "${snippet.title}"`, { variant: 'success' });
      setConfirmDelete({ open: false, snippet: null, loading: false });
    } catch (err) {
      push(`Delete failed: ${err.message}`, { variant: 'danger' });
      setConfirmDelete((s) => ({ ...s, loading: false }));
    }
  };

  return (
    <aside className="snippets" aria-label="Snippets">
      <div className="snippets__header">
        <h2 className="snippets__title">My snippets</h2>
        <button
          type="button"
          className="snippets__save-btn"
          onClick={() => setSaveOpen(true)}
        >
          Save current
        </button>
      </div>

      {status === 'loading' && (
        <div className="snippets__loading"><Spinner size="sm" /><span>Loading…</span></div>
      )}

      {status === 'error' && (
        <p className="snippets__error">Could not load: {error}</p>
      )}

      {status === 'ready' && snippets.length === 0 && (
        <p className="snippets__empty">
          No snippets yet. Save your current code to start a library.
        </p>
      )}

      <ul className="snippets__list">
        {snippets.map((s) => (
          <SnippetItem
            key={s.id}
            snippet={s}
            onLoad={() => onLoadSnippet?.(s)}
            onDelete={() => requestDelete(s)}
          />
        ))}
      </ul>

      <SaveSnippetDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(o) => !confirmDelete.loading && setConfirmDelete({ ...confirmDelete, open: o })}
        title="Delete this snippet?"
        description={
          confirmDelete.snippet
            ? `"${confirmDelete.snippet.title}" will be permanently deleted. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={confirmDelete.loading}
        onConfirm={performDelete}
      />
    </aside>
  );
}
