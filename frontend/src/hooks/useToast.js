import { toast } from 'sonner';

const METHOD = {
  success: toast.success,
  error: toast.error,
  info: toast,
};

export function useToast() {
  function showToast(text, variant = 'info') {
    (METHOD[variant] || toast)(text);
  }

  return { showToast };
}
