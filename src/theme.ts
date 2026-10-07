/** Pastel looks for the app. Only the paper changes (background and cards): ink, the record orange and the olive stay,
 *  so text keeps its contrast and records keep standing out. Checked on background and cards: ink ≥ 11.6:1,
 *  grey text (neutral-700) ≥ 4.6:1, orange links (accent-700) ≥ 4.8:1. */
export const THEMES = [
  { id: 'crema', name: 'Crema', bg: '#f5ead8', surface: '#ebddc5' },
  { id: 'durazno', name: 'Durazno', bg: '#fbe7d7', surface: '#f3d5bf' },
  { id: 'rosa', name: 'Rosa', bg: '#f9e5e7', surface: '#efd3d7' },
  { id: 'lavanda', name: 'Lavanda', bg: '#ece6f5', surface: '#ddd4ee' },
  { id: 'celeste', name: 'Celeste', bg: '#e3eef5', surface: '#d0e2ed' },
  { id: 'menta', name: 'Menta', bg: '#e4f2e7', surface: '#d1e7d6' },
  { id: 'limon', name: 'Limón', bg: '#f6f1d4', surface: '#ece4ba' }
] as const;

export type ThemeId = typeof THEMES[number]['id'];

export const themeOf = (id: string) => THEMES.find(t => t.id === id) ?? THEMES[0];

/** Paints the app in a theme: the two paper tokens, and the browser/phone bar so it doesn't show a cream strip. */
export function applyTheme(id: string) {
  const t = themeOf(id);
  const root = document.documentElement.style;
  root.setProperty('--color-bg', t.bg);
  root.setProperty('--color-surface', t.surface);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg);
}
