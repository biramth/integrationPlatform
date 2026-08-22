import { useContext } from 'react';
import { ThemeContext } from '../context/themeContextInstance';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme doit être utilisé à l\'intérieur de ThemeProvider.');
  }
  return ctx;
}
