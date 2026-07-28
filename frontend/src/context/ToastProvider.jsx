import { useCallback, useRef, useState } from 'react';
import { ToastContext } from './toastContextInstance';

const VARIANT_CLASSES = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const showToast = useCallback((text, variant = 'info') => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, text, variant }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-toast-in max-w-xs rounded-lg border px-4 py-3 text-sm shadow-lg ${VARIANT_CLASSES[toast.variant]}`}
          >
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
