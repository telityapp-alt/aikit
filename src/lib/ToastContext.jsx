import { createContext, useContext, useState, useCallback, useRef } from "react";
import "./Toast.css";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "info", duration = 3800) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const toast = {
    success: (m, d) => push(m, "success", d),
    error: (m, d) => push(m, "error", d),
    info: (m, d) => push(m, "info", d),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="ak-toast-region" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`ak-toast ak-toast--${t.type}`}>
            <span className="ak-toast-dot" aria-hidden="true" />
            <span className="ak-toast-msg">{t.message}</span>
            <button
              type="button"
              className="ak-toast-close"
              aria-label="Tutup notifikasi"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
