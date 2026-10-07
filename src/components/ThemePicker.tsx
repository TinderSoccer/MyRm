import { THEMES } from '../theme';
import { useStore } from '../store';

/** Pastel swatches: each shows the paper it gives the app (background with a card inside), so you see the look, not a dot. */
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
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: t.surface }} />
            </span>
            <span style={{ fontSize: 12, fontWeight: on ? 700 : 600 }}>{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}
