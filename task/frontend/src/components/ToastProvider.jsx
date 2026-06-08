/**
 * ToastProvider.jsx — minimal toast notification system.
 *
 * Exposes a useToast() hook returning { push(message, opts) }.
 * Wrap the app (or sub-tree) in <ToastProvider>; toasts render
 * into a portal at the top-right.
 *
 * Why hand-rolled instead of a library: keeps deps small, gives
 * us total visual control through our tokens.
 *
 * Usage:
 *   const { push } = useToast();
 *   push('Snippet saved');
 *   push('Could not delete', { variant: 'danger', duration: 4000 });
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Toast.css';

const ToastCtx = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message, opts = {}) => {
      const id = nextId++;
      const toast = {
        id,
        message,
        variant: opts.variant || 'default', // 'default' | 'success' | 'danger' | 'warn'
        duration: opts.duration ?? 3200,
      };
      setToasts((cur) => [...cur, toast]);
      if (toast.duration > 0) {
        const handle = setTimeout(() => dismiss(id), toast.duration);
        timers.current.set(id, handle);
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="toast-region" role="region" aria-label="Notifications">
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`toast toast--${t.variant}`}
                role={t.variant === 'danger' ? 'alert' : 'status'}
              >
                <span className="toast__message">{t.message}</span>
                <button
                  type="button"
                  className="toast__close"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    // Defensive: callers may use it before ToastProvider is
    // mounted in some tests. Returning a no-op keeps them safe.
    return { push: () => 0, dismiss: () => {} };
  }
  return ctx;
}
