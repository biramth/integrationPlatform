// Miroir JS des tokens --chart-* / --chart-grid / --chart-tick de src/index.css.
// Recharts rend du SVG et ne résout pas les variables CSS de façon fiable
// (mélange de style/attributs bruts) — garder ces valeurs synchronisées à la main.
export const CHART_COLORS = {
  series: ['#2a78d6', '#eb6834', '#16a34a', '#d97706', '#dc2626'],
  grid: '#e1e0d9',
  tick: '#898781',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e1e0d9',
};
