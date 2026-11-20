import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

type ToastType = 'success' | 'error';

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id = toastIdCounter++;
      setToasts((prev) => [...prev, { id, type, title, description }]);
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container" role="region" aria-label="Notifications">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast-item ${
                toast.type === 'success' ? 'toast-success' : 'toast-error'
              }`}
              role="status"
            >
              <div>
                <div className="toast-title">
                  {toast.type === 'success' ? '✓ ' : '! '}
                  {toast.title}
                </div>
                {toast.description && (
                  <div className="toast-desc">{toast.description}</div>
                )}
              </div>
              <button
                type="button"
                className="toast-close"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
