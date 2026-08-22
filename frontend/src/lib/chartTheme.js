import { useTheme } from '../hooks/useTheme';

// Miroir JS des tokens de couleur de src/index.css. Recharts rend du SVG et
// ne résout pas les variables CSS de façon fiable (mélange de style/attributs
// bruts) — une palette par thème est gardée à la main plutôt que de lire les
// variables CSS au runtime.
const CHART_COLORS_LIGHT = {
  series: ['#2a78d6', '#eb6834', '#16a34a', '#d97706', '#dc2626'],
  grid: '#e1e0d9',
  tick: '#898781',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e1e0d9',
  hoverCursor: 'rgba(42, 120, 214, 0.08)',
};

const CHART_COLORS_DARK = {
  series: ['#5b9bf0', '#f2925e', '#4ade80', '#fbbf24', '#f87171'],
  grid: 'rgba(255, 255, 255, 0.12)',
  tick: '#a1a1aa',
  tooltipBg: '#262626',
  tooltipBorder: 'rgba(255, 255, 255, 0.1)',
  hoverCursor: 'rgba(91, 155, 240, 0.15)',
};

// Conservé pour compatibilité — préférer useChartColors() dans les
// composants, qui s'adapte au mode nuit.
export const CHART_COLORS = CHART_COLORS_LIGHT;

export function useChartColors() {
  const { theme } = useTheme();
  return theme === 'dark' ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;
}
