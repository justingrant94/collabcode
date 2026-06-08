/**
 * ConfirmDialog.jsx — Radix-based confirmation modal.
 *
 * Built on @radix-ui/react-dialog for proper focus trap +
 * Escape handling + scrim. Standalone so it can be used for
 * snippet delete, future "leave room" warnings, etc.
 *
 * Props:
 *   open           boolean
 *   onOpenChange   (next: boolean) => void
 *   title          string
 *   description    string|node    — body copy
 *   confirmLabel   string         — default "Confirm"
 *   cancelLabel    string         — default "Cancel"
 *   variant        'danger'|'default'  — colour of the confirm btn
 *   onConfirm      () => void | Promise<void>
 *   loading        boolean        — disables buttons + shows spinner
 */

import * as Dialog from '@radix-ui/react-dialog';
import { Spinner } from './Spinner.jsx';
import './ConfirmDialog.css';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  loading = false,
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="confirm__overlay" />
        <Dialog.Content className="confirm__content" onEscapeKeyDown={(e) => loading && e.preventDefault()}>
          <Dialog.Title className="confirm__title">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="confirm__description">
              {description}
            </Dialog.Description>
          )}
          <div className="confirm__actions">
            <Dialog.Close asChild>
              <button type="button" className="confirm__btn confirm__btn--ghost" disabled={loading}>
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              className={`confirm__btn confirm__btn--${variant}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading && <Spinner size="sm" color="currentColor" />}
              <span>{confirmLabel}</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
