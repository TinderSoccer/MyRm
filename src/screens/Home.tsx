import { Icon } from '../components/Icon';
import { discOf } from '../data';
import { bestOf, entriesOf, initialOf, logOf, longToday, mainSchemeOf, todayIndex } from '../format';
import { pillStyle, useShownDiscs, useStore } from '../store';

const DAY_L = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export function Home() {
  const { data, set, fmt, openDetail, homeFilter, setHomeFilter } = useStore();
  const shown = useShownDiscs();
  const weekDone = data.done.filter(Boolean).length;
  const name = (data.name || '').trim();
  const today = todayIndex();
  // Only marks with at least one attempt show up; the rest is just the catalog the record sheet offers.
  const visible = data.prs.filter(p => logOf(p).length > 0 && shown.some(d => d.id === p.disc) && (homeFilter === 'all' || p.disc === homeFilter));

  return (
    <div className="screen" data-screen-label="03 Inicio">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 14, color: 'var(--color-neutral-700)', fontWeight: 500 }}>{longToday()}</span>
          <h1 className="title" style={{ fontSize: 32 }}>¡Hola, {name || 'atleta'}!</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
          <button className="round-btn" onClick={() => set(() => ({ screen: 'rem' }))} aria-label="Recordatorios"><Icon name="bell" size={20} /></button>
          <button className="flex-center avatar-btn" onClick={() => set(() => ({ screen: 'w2' }))} aria-label="Tu perfil y ajustes">{initialOf(name, 'A')}</button>
        </div>
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
              <button key={i} aria-label={`${DAY_LONG[i]}${i === today ? ' (hoy)' : ''}: entrené`} aria-pressed={on} onClick={() => set(d => ({ done: d.done.map((x, j) => j === i ? !x : x) }))}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, minWidth: 44 }}>
                <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-400)' }}>{l}</span>
                <span className="flex-center" style={{ width: 36, height: 36, borderRadius: '50%', background: on ? 'var(--color-accent-2-300)' : 'transparent', border: `2px solid ${on ? 'var(--color-accent-2-300)' : i === today ? 'var(--color-bg)' : 'var(--color-neutral-500)'}`, boxSizing: 'border-box', color: 'var(--color-text)', transition: 'background-color .2s, border-color .2s' }}>{on && <Icon name="check" size={18} />}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="stack-3">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--color-accent)' }}><Icon name="dumbbell" size={22} /></span>Mis marcas</h2>
        </div>
        <div className="chip-row">
          <button className="pill" onClick={() => setHomeFilter('all')} aria-pressed={homeFilter === 'all'} style={pillStyle(homeFilter === 'all')}>Todas</button>
          {shown.map(d => <button key={d.id} className="pill" onClick={() => setHomeFilter(d.id)} aria-pressed={homeFilter === d.id} style={pillStyle(homeFilter === d.id)}>{d.label}</button>)}
        </div>
        {visible.length === 0 && (
          <div className="empty">
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ color: 'var(--color-accent)' }}><Icon name="dumbbell" size={22} /></span>Aún no hay marcas aquí. Toca + y estrena la primera.</span>
          </div>
        )}
        {visible.map(p => {
          // The card shows the record (same number as the detail), judged on one scheme so dates and values match.
          const scheme = mainSchemeOf(p);
          const entries = entriesOf(p, scheme);
          const best = bestOf(p, scheme) ?? 0;
          const recordAt = [...entries].reverse().find(e => e.v === best) ?? entries[entries.length - 1];
          const delta = fmt.gain(p, entries[0].v, best);
          const badge = entries.length === 1 ? 'Primera' : delta > 0 ? fmt.gainTxt(p, delta) : `${entries.length} intentos`;
          const disc = discOf(p.disc);
          const tint = p.type === 'kg' ? 'accent' : p.type === 'time' ? 'accent-2' : 'neutral';
          return (
            <button key={p.id} className="pr-card" onClick={() => openDetail(p.id)}>
              <div className="flex-center" style={{ width: 44, height: 44, borderRadius: '50%', background: `var(--color-${tint}-200)`, color: `var(--color-${tint}-800)`, flex: 'none' }}>
                <Icon name={p.type === 'time' ? 'timer' : 'dumbbell'} size={20} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                {homeFilter === 'all' && <span className="kicker" style={{ color: disc.color }}>{disc.label}</span>}
                <span style={{ fontWeight: 600, fontSize: 16 }}>{p.name}</span>
                <span className="muted-13">Récord{scheme && scheme !== '1RM' ? ` ${scheme}` : ''} · {recordAt.date}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 76 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 24, lineHeight: 1 }}>{fmt.val(p, best)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, marginLeft: 3 }}>{fmt.unitOf(p)}</span></span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-2-700)' }}>{badge}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
