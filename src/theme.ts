/** Pastel looks for the whole app. Crema is the original palette (organic.css, untouched). Every other theme replaces
 *  every colour token: paper, ink, both accent ramps and the greys, each generated in OKLCH on the system's own
 *  lightness scale, so step 200 is as light and step 700 as dark as in Crema. Light steps stay pastel, deep steps keep text
 *  readable. Checked for every pairing the app draws (text, links, buttons, dark cards, tags): all ≥ 4.5:1, the lowest
 *  4.72:1 (accent-700 on cards in Menta). The palettes are generated, not hand-picked; regenerate rather than edit. */
type Vars = Record<string, string>;

const GENERATED: Record<string, { name: string; vars: Vars }> = {
  durazno: { name: 'Durazno', vars: { 'bg': '#f9e8db', 'surface': '#f1dac8', 'text': '#261c15', 'accent': '#e9a688', 'accent-2': '#82c9aa', 'accent-100': '#fff2ec', 'accent-2-100': '#e1fdef', 'neutral-100': '#fbf3ed', 'accent-200': '#ffe1d3', 'accent-2-200': '#c8f4df', 'neutral-200': '#eee6e0', 'accent-300': '#fec6ad', 'accent-2-300': '#a8e4c8', 'neutral-300': '#dad3cd', 'accent-400': '#e9a688', 'accent-2-400': '#82c9aa', 'neutral-400': '#bdb6b0', 'accent-500': '#c98566', 'accent-2-500': '#5eaa8a', 'neutral-500': '#9e9791', 'accent-600': '#a6684c', 'accent-2-600': '#438a6d', 'neutral-600': '#807973', 'accent-700': '#834e36', 'accent-2-700': '#2d6b53', 'neutral-700': '#635c57', 'accent-800': '#5e3624', 'accent-2-800': '#1c4c3a', 'neutral-800': '#48413c', 'accent-900': '#402315', 'accent-2-900': '#103325', 'neutral-900': '#302a25' } },
  rosa: { name: 'Rosa', vars: { 'bg': '#fce5e8', 'surface': '#f5d6d9', 'text': '#271b1c', 'accent': '#eaa0b0', 'accent-2': '#c0ace7', 'accent-100': '#fff1f3', 'accent-2-100': '#f6f3ff', 'neutral-100': '#fdf2f3', 'accent-200': '#ffdee4', 'accent-2-200': '#ebe3ff', 'neutral-200': '#f0e5e6', 'accent-300': '#ffc1cd', 'accent-2-300': '#dbcafd', 'neutral-300': '#dcd1d2', 'accent-400': '#eaa0b0', 'accent-2-400': '#c0ace7', 'neutral-400': '#bfb4b5', 'accent-500': '#ca7f90', 'accent-2-500': '#a18cc8', 'neutral-500': '#a09597', 'accent-600': '#a76373', 'accent-2-600': '#826ea5', 'neutral-600': '#817778', 'accent-700': '#834957', 'accent-2-700': '#645382', 'neutral-700': '#645b5c', 'accent-800': '#5f323d', 'accent-2-800': '#473a5e', 'neutral-800': '#494041', 'accent-900': '#402028', 'accent-2-900': '#2f263f', 'neutral-900': '#31292a' } },
  lavanda: { name: 'Lavanda', vars: { 'bg': '#eee8fa', 'surface': '#e2daf3', 'text': '#201c27', 'accent': '#c0abe9', 'accent-2': '#73c6da', 'accent-100': '#f6f3ff', 'accent-2-100': '#e4f9ff', 'neutral-100': '#f6f3fc', 'accent-200': '#ebe2ff', 'accent-2-200': '#c1f2fe', 'neutral-200': '#e9e6ef', 'accent-300': '#dbcaff', 'accent-2-300': '#9de1f1', 'neutral-300': '#d5d3db', 'accent-400': '#c0abe9', 'accent-2-400': '#73c6da', 'neutral-400': '#b8b6be', 'accent-500': '#a18bca', 'accent-2-500': '#4ca6bb', 'neutral-500': '#99979f', 'accent-600': '#826ea8', 'accent-2-600': '#30879a', 'neutral-600': '#7b7980', 'accent-700': '#655384', 'accent-2-700': '#1a6878', 'neutral-700': '#5e5c63', 'accent-800': '#473a5f', 'accent-2-800': '#0c4a56', 'neutral-800': '#434148', 'accent-900': '#2f2540', 'accent-2-900': '#05313a', 'neutral-900': '#2c2a31' } },
  celeste: { name: 'Celeste', vars: { 'bg': '#dbeff9', 'surface': '#c8e4f2', 'text': '#152026', 'accent': '#7cc1e9', 'accent-2': '#7dcaaf', 'accent-100': '#ebf7ff', 'accent-2-100': '#e0fdf1', 'neutral-100': '#edf7fb', 'accent-200': '#d0edff', 'accent-2-200': '#c6f4e2', 'neutral-200': '#e0eaee', 'accent-300': '#a4ddff', 'accent-2-300': '#a5e4cd', 'neutral-300': '#cdd6db', 'accent-400': '#7cc1e9', 'accent-2-400': '#7dcaaf', 'neutral-400': '#b0b9be', 'accent-500': '#58a2ca', 'accent-2-500': '#59aa90', 'neutral-500': '#919a9e', 'accent-600': '#3d82a8', 'accent-2-600': '#3d8a72', 'neutral-600': '#737c80', 'accent-700': '#286484', 'accent-2-700': '#286b57', 'neutral-700': '#575f63', 'accent-800': '#18475f', 'accent-2-800': '#184c3d', 'neutral-800': '#3c4448', 'accent-900': '#0d2f41', 'accent-2-900': '#0d3328', 'neutral-900': '#252d30' } },
  menta: { name: 'Menta', vars: { 'bg': '#def1e6', 'surface': '#cce6d7', 'text': '#16221b', 'accent': '#7ecaa9', 'accent-2': '#e6a78a', 'accent-100': '#e0fdef', 'accent-2-100': '#fff2ec', 'neutral-100': '#eef7f2', 'accent-200': '#c7f4df', 'accent-2-200': '#fee1d4', 'neutral-200': '#e1eae5', 'accent-300': '#a6e4c8', 'accent-2-300': '#fdc6ae', 'neutral-300': '#ced7d1', 'accent-400': '#7ecaa9', 'accent-2-400': '#e6a78a', 'neutral-400': '#b1bab5', 'accent-500': '#5aab8a', 'accent-2-500': '#c78669', 'neutral-500': '#929b96', 'accent-600': '#3e8b6d', 'accent-2-600': '#a4694f', 'neutral-600': '#747d78', 'accent-700': '#296c52', 'accent-2-700': '#814f38', 'neutral-700': '#585f5b', 'accent-800': '#194d39', 'accent-2-800': '#5d3725', 'neutral-800': '#3d4540', 'accent-900': '#0d3325', 'accent-2-900': '#3f2317', 'neutral-900': '#262d29' } },
  limon: { name: 'Limón', vars: { 'bg': '#efecd9', 'surface': '#e4e0c6', 'text': '#211f14', 'accent': '#e4d58d', 'accent-2': '#c0ace7', 'accent-100': '#fcf6d5', 'accent-2-100': '#f6f3ff', 'neutral-100': '#f6f5ec', 'accent-200': '#f4e9b5', 'accent-2-200': '#ebe3ff', 'neutral-200': '#eae8df', 'accent-300': '#e4d58d', 'accent-2-300': '#dbcafd', 'neutral-300': '#d6d4cc', 'accent-400': '#cbb85f', 'accent-2-400': '#c0ace7', 'neutral-400': '#b9b8af', 'accent-500': '#ac9836', 'accent-2-500': '#a18cc8', 'neutral-500': '#9a9990', 'accent-600': '#8c7a17', 'accent-2-600': '#826ea5', 'neutral-600': '#7c7b73', 'accent-700': '#6c5d06', 'accent-2-700': '#645382', 'neutral-700': '#5f5d56', 'accent-800': '#4d4203', 'accent-2-800': '#473a5e', 'neutral-800': '#44433c', 'accent-900': '#332b01', 'accent-2-900': '#2f263f', 'neutral-900': '#2d2c25' } },
};

export const THEMES: { id: string; name: string; bg: string; accent: string; accent2: string }[] = [
  { id: 'crema', name: 'Crema', bg: '#f5ead8', accent: '#c67139', accent2: '#7a8a5e' },
  ...Object.entries(GENERATED).map(([id, t]) => ({ id, name: t.name, bg: t.vars.bg, accent: t.vars.accent, accent2: t.vars['accent-2'] }))
];

export const themeOf = (id: string) => THEMES.find(t => t.id === id) ?? THEMES[0];

const KEYS = Object.keys(Object.values(GENERATED)[0].vars);

/** Paints the whole app in a theme (or back to the stylesheet's Crema), and the phone's status bar with it. */
export function applyTheme(id: string) {
  const root = document.documentElement.style;
  const vars = GENERATED[id]?.vars;
  for (const k of KEYS) {
    if (vars) root.setProperty(`--color-${k}`, vars[k]);
    else root.removeProperty(`--color-${k}`);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeOf(id).bg);
}
