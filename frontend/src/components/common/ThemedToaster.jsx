import { Toaster } from '@/components/ui/sonner';
import { useTheme } from '../../hooks/useTheme';

export default function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-right" richColors theme={theme} />;
}
