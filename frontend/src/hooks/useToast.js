import { useContext } from 'react';
import { ToastContext } from '../context/toastContextInstance';

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast doit être utilisé à l\'intérieur de ToastProvider.');
  }
  return ctx;
}
