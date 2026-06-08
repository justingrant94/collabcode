/**
 * SnippetItem.jsx — single row in the snippets list.
 *
 * Shows: title, language tag, "Load" button, delete (×) button.
 *
 * Standalone so the same row can later appear in modals, search
 * results, etc. Delete intentionally renders a × button only —
 * the actual delete confirmation lives in the parent so this
 * component stays presentational.
 *
 * Props:
 *   snippet    { id, title, language, code, updatedAt }
 *   onLoad     () => void
 *   onDelete   () => void
 */

import './SnippetItem.css';

export function SnippetItem({ snippet, onLoad, onDelete }) {
  return (
    <li className="snippet-item">
      <button
        type="button"
        className="snippet-item__main"
        onClick={onLoad}
        title="Load this snippet into the editor"
      >
        <span className="snippet-item__title">{snippet.title}</span>
        <span className="snippet-item__lang">{snippet.language}</span>
      </button>
      <button
        type="button"
        className="snippet-item__delete"
        onClick={onDelete}
        aria-label={`Delete snippet "${snippet.title}"`}
        title="Delete"
      >
        ×
      </button>
    </li>
  );
}
