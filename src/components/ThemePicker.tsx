import { THEMES } from '../theme';
import { useStore } from '../store';

/** Theme swatches: the paper with the two accents inside, so you see the palette you get, not a dot. */
export function ThemePicker() {
  const { data, set } = useStore();
  return (
    <div role="radiogroup" aria-label="Color de la app" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {THEMES.map(t => {
        const on = (data.theme || 'crema') === t.id;
        return (
          <button key={t.id} type="button" role="radio" aria-checked={on} onClick={() => set(() => ({ theme: t.id }))}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-text)', width: 56 }}>
            <span aria-hidden="true" style={{
              width: 48, height: 48, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: on ? '0 0 0 3px var(--color-bg), 0 0 0 6px var(--color-text)' : 'inset 0 0 0 1.5px var(--color-divider)', transition: 'box-shadow .15s'
            }}>
              {/* The theme's two accents, half and half: the whole palette, not just the paper. */}
              <span style={{ width: 26, height: 26, borderRadius: '50%', background: `conic-gradient(${t.accent} 0 50%, ${t.accent2} 0 100%)` }} />
            </span>
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: on ? 700 : 600 }}>{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}
