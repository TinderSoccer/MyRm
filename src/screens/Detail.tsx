import { Icon } from '../components/Icon';
import { discOf } from '../data';
import { bestOf, logOf } from '../format';
import { useStore } from '../store';

export function Detail() {
  const { data, set, fmt, detId, openSheet } = useStore();
  const p = data.prs.find(x => x.id === detId);
  const goHome = () => set(() => ({ screen: 'home' }));
  if (!p) return null;

  const d = discOf(p.disc);
  const log = logOf(p);
  const main = p.type === 'kg' ? '1RM' : null;
  const best = bestOf(p, main);
  const first = log.find(e => (e.scheme || null) === main);
  const delta = best != null && first ? fmt.gain(p, first.v, best) : 0;
  const mainLog = log.filter(e => (e.scheme || null) === main).slice(-6);
  const sc = mainLog.map(e => p.better === 'down' ? -e.v : e.v);
  const mn = Math.min(...sc), mx = Math.max(...sc);
  const unit = fmt.unitOf(p);

  return (
    <div className="screen" data-screen-label="07 Detalle de marca">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="round-btn" onClick={goHome} aria-label="Volver"><Icon name="chevronLeft" size={20} /></button>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span className="kicker" style={{ color: d.color }}>{d.label}</span>
          <h1 className="title" style={{ fontSize: 28 }}>{p.name}</h1>
        </div>
      </div>

      <div style={{ background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', padding: 22, display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'var(--color-accent-2)', right: -40, bottom: -60 }} />
        <span style={{ fontSize: 14, color: 'var(--color-neutral-300)', position: 'relative' }}>
          {p.type === 'kg' ? 'Mejor 1RM' : p.better === 'down' ? 'Mejor tiempo' : 'Mejor marca'}
        </span>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 56, lineHeight: 1, position: 'relative' }}>
          {best == null ? '—' : fmt.val(p, best)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, marginLeft: 6 }}>{unit}</span>
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-accent-2-300)', position: 'relative' }}>
          {delta > 0 && first ? `${fmt.gainTxt(p, delta)} desde ${first.date}` : 'Tu primer registro'}
        </span>
      </div>

      {mainLog.length > 0 && (
        <div className="surface" role="img" aria-label={`Progreso: ${mainLog.map(e => `${e.date}, ${fmt.val(p, e.v)} ${unit}`).join('; ')}`} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Progreso</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
            {mainLog.map((e, i) => {
              const top = e.v === best;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%', minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: top ? 'var(--color-accent-800)' : 'var(--color-neutral-800)' }}>{fmt.val(p, e.v)}</span>
                  <span style={{ width: '100%', maxWidth: 34, borderRadius: 999, height: `${mx === mn ? 60 : 18 + 60 * (sc[i] - mn) / (mx - mn)}%`, background: top ? 'var(--color-accent)' : 'var(--color-neutral-400)' }} />
                  <span style={{ fontSize: 11, color: 'var(--color-neutral-700)', whiteSpace: 'nowrap' }}>{e.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="stack-3">
        <h2 className="section-title" style={{ fontSize: 22 }}>Historial</h2>
        {[...log].reverse().map((e, i) => {
          const scaled = e.mode === 'Escalado';
          const tags = [
            ...(e.v === bestOf(p, e.scheme) ? [{ label: 'Récord', bg: 'var(--color-accent-2-700)', fg: 'var(--color-bg)' }] : []),
            ...(e.scheme ? [{ label: e.scheme, bg: 'var(--color-bg)', fg: 'var(--color-text)' }] : []),
            { label: e.mode || 'RX', bg: scaled ? 'var(--color-accent-200)' : 'var(--color-bg)', fg: scaled ? 'var(--color-accent-800)' : 'var(--color-text)' }
          ];
          return (
            <div key={i} className="surface" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{e.date}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tags.map(t => <span key={t.label} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: t.bg, color: t.fg }}>{t.label}</span>)}
                </div>
                {e.note && <span style={{ fontSize: 14, color: 'var(--color-neutral-800)', fontStyle: 'italic' }}>“{e.note}”</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 22, flex: 'none' }}>{fmt.val(p, e.v)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, marginLeft: 3 }}>{unit}</span></span>
            </div>
          );
        })}
      </div>
      <button onClick={() => openSheet({ prId: p.id })} className="btn btn-primary btn-block" style={{ height: 56, fontSize: 17 }}>Registrar nuevo intento</button>
    </div>
  );
}
