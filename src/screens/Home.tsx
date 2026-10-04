import { Icon } from '../components/Icon';
import { discOf } from '../data';
import { initialOf, logOf, longToday } from '../format';
import { pillStyle, useShownDiscs, useStore } from '../store';

const DAY_L = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function Home() {
  const { data, set, fmt, openDetail, homeFilter, setHomeFilter } = useStore();
  const shown = useShownDiscs();
  const weekDone = data.done.filter(Boolean).length;
  const name = (data.name || '').trim();
  // Only marks with at least one attempt show up; the rest is just the catalog the record sheet offers.
  const visible = data.prs.filter(p => logOf(p).length > 0 && shown.some(d => d.id === p.disc) && (homeFilter === 'all' || p.disc === homeFilter));

  return (
    <div className="screen" data-screen-label="03 Inicio">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 14, color: 'var(--color-neutral-700)', fontWeight: 500 }}>{longToday()}</span>
          <h1 className="title" style={{ fontSize: 32 }}>¡Hola, {name || 'atleta'}!</h1>
        </div>
        <div className="flex-center" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-accent-2)', color: 'var(--color-bg)', fontFamily: 'var(--font-heading)', fontSize: 20, flex: 'none' }}>{initialOf(name, 'A')}</div>
      </div>

      <div style={{ background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', padding: 22, display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'var(--color-accent)', right: -50, top: -60, opacity: 0.9 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <div className="flex-center" style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-bg)', color: 'var(--color-accent-600)', flex: 'none' }}><Icon name="flame" size={30} /></div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 30, lineHeight: 1 }}>{weekDone} de {data.freq}</span>
            <span style={{ fontSize: 15, color: 'var(--color-neutral-300)' }}>
              entrenos esta semana · {weekDone >= data.freq ? '¡meta cumplida!' : `te faltan ${data.freq - weekDone}`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {DAY_L.map((l, i) => {
            const on = data.done[i];
            return (
              <button key={i} title="Marcar entreno" aria-pressed={on} onClick={() => set(d => ({ done: d.done.map((x, j) => j === i ? !x : x) }))}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-400)' }}>{l}</span>
                <span className="flex-center" style={{ width: 36, height: 36, borderRadius: '50%', background: on ? 'var(--color-accent-2-300)' : 'transparent', border: `2px solid ${on ? 'var(--color-accent-2-300)' : i === 6 ? 'var(--color-bg)' : 'var(--color-neutral-700)'}`, boxSizing: 'border-box', color: 'var(--color-text)', transition: 'all .2s' }}>{on ? '✓' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="stack-3">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--color-accent)' }}><Icon name="dumbbell" size={22} /></span>Mis marcas</h2>
          <span style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>Toca para actualizar</span>
        </div>
        <div className="chip-row">
          <button className="pill" onClick={() => setHomeFilter('all')} style={pillStyle(homeFilter === 'all')}>Todas</button>
          {shown.map(d => <button key={d.id} className="pill" onClick={() => setHomeFilter(d.id)} style={pillStyle(homeFilter === d.id)}>{d.label}</button>)}
        </div>
        {visible.length === 0 && (
          <div style={{ padding: 22, borderRadius: 'var(--radius-lg)', border: '2px dashed var(--color-neutral-400)', fontSize: 15, color: 'var(--color-neutral-800)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ color: 'var(--color-accent)' }}><Icon name="dumbbell" size={22} /></span>Aún no hay marcas aquí. Toca + y estrena la primera.</span>
          </div>
        )}
        {visible.map(p => {
          const log = logOf(p);
          const h = p.hist.length ? p.hist : log.slice(-5).map(e => e.v);
          const last = h[h.length - 1];
          const sc = p.better === 'down' ? h.map(v => -v) : h;
          const min = Math.min(...sc), max = Math.max(...sc);
          const delta = fmt.gain(p, h[0], last);
          const disc = discOf(p.disc);
          const tint = p.type === 'kg' ? 'accent' : p.type === 'time' ? 'accent-2' : 'neutral';
          return (
            <button key={p.id} className="pr-card" onClick={() => openDetail(p.id)}>
              <div className="flex-center" style={{ width: 44, height: 44, borderRadius: '50%', background: `var(--color-${tint}-200)`, color: `var(--color-${tint}-800)`, flex: 'none' }}>
                <Icon name={p.type === 'time' ? 'timer' : 'dumbbell'} size={20} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span className="kicker" style={{ color: disc.color }}>{disc.label}</span>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{p.name}</span>
                <span className="muted-13">Última · {log[log.length - 1].date}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 30 }}>
                {sc.map((v, i) => (
                  <span key={i} style={{ width: 6, borderRadius: 999, height: `${max === min ? 60 : 30 + 70 * (v - min) / (max - min)}%`, background: i === h.length - 1 ? 'var(--color-accent)' : 'var(--color-neutral-400)' }} />
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 76 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 24, lineHeight: 1 }}>{fmt.val(p, last)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, marginLeft: 3 }}>{fmt.unitOf(p)}</span></span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-2-700)' }}>{h.length === 1 ? 'Primera' : delta > 0 ? fmt.gainTxt(p, delta) : 'Igual'}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
