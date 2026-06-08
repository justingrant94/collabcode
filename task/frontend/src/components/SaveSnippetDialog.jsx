/**
 * SaveSnippetDialog.jsx — modal to name + save a snippet.
 *
 * Standalone — reuses Radix Dialog. Parent controls open state
 * and provides the actual save callback so the dialog doesn't
 * know about the network layer.
 *
 * Props:
 *   open          boolean
 *   onOpenChange  (next: boolean) => void
 *   onSave        ({ title }) => Promise<void>
 */

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Spinner } from './Spinner.jsx';
import './SaveSnippetDialog.css';

export function SaveSnippetDialog({ open, onOpenChange, onSave }) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset state whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setTitle('');
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim() || 'Untitled snippet' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="confirm__overlay" />
        <Dialog.Content className="confirm__content save-snippet">
          <Dialog.Title className="confirm__title">Save snippet</Dialog.Title>
          <Dialog.Description className="confirm__description">
            Give it a name so you can find it later.
          </Dialog.Description>

          <form onSubmit={handleSubmit}>
            <label htmlFor="snippet-title" className="save-snippet__label">Name</label>
            <input
              id="snippet-title"
              type="text"
              className="save-snippet__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. JSON formatter"
              maxLength={80}
              autoFocus
              disabled={saving}
            />

            <div className="confirm__actions">
              <Dialog.Close asChild>
                <button type="button" className="confirm__btn confirm__btn--ghost" disabled={saving}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="submit" className="confirm__btn confirm__btn--default" disabled={saving}>
                {saving && <Spinner size="sm" color="currentColor" />}
                <span>Save</span>
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
