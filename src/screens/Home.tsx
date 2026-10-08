import { useLayoutEffect, useRef } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { TodayWod } from '../components/TodayWod';
import { CheckinCard } from '../components/Checkin';
import { openTimerFrom } from './Timer';
import { discOf, type Pr } from '../data';
import { bestOf, bestWord, entriesOf, fixedKg, initialOf, logOf, longToday, mainSchemeOf, recordIsScaled, todayIndex } from '../format';
import { pillStyle, useShownDiscs, useStore } from '../store';

const DAY_L = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const DAY_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Where Home was scrolled, so coming back from a mark's detail lands on the same card instead of the top.
let homeScroll = 0;

export function Home() {
  const scroller = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (scroller.current) scroller.current.scrollTop = homeScroll; }, []);
  const { data, set, fmt, openDetail, homeFilter, setHomeFilter } = useStore();
  const shown = useShownDiscs();
  const weekDone = data.done.filter(Boolean).length;
  const name = (data.name || '').trim();
  const today = todayIndex();
  // Only marks with at least one attempt show up; the rest is just the catalog the record sheet offers.
  const visible = data.prs.filter(p => logOf(p).length > 0 && shown.some(d => d.id === p.disc) && (homeFilter === 'all' || p.disc === homeFilter));

  const several = shown.length > 1;

  // Recent records: every RX attempt that beat the best before it, newest first. The highlight reel of Home.
  const recent = data.prs.filter(p => shown.some(d => d.id === p.disc)).flatMap(p => {
    const scheme = mainSchemeOf(p);
    let best: number | null = null;
    const out: { p: Pr; v: number; gain: string; date: string; iso: string }[] = [];
    for (const e of entriesOf(p, scheme)) {
      if (best != null && fmt.gain(p, best, e.v) > 0.0005) out.push({ p, v: e.v, gain: fmt.gainTxt(p, best, e.v), date: e.date, iso: e.iso ?? '' });
      if (best == null || fmt.gain(p, best, e.v) > 0) best = e.v;
    }
    return out;
  }).sort((a, b) => b.iso.localeCompare(a.iso)).slice(0, 6);
  const weekLine = weekDone >= data.freq ? '¡Semana cumplida! Todo lo de hoy es extra.' : weekDone === 0 ? `Esta semana van ${data.freq} entrenos. ¡A empezar!` : `Te faltan ${data.freq - weekDone} ${data.freq - weekDone === 1 ? 'entreno' : 'entrenos'} para tu meta de la semana.`;
  const iconOf = (p: Pr): IconName => p.type === 'time' ? 'timer' : p.type === 'reps' ? 'rings' : fixedKg(p) ? 'kettlebell' : 'barbell';

  return (
    <div className="screen" data-screen-label="03 Inicio" ref={scroller} onScroll={e => { homeScroll = e.currentTarget.scrollTop; }}>
      {/* Who and why: tight, one block. */}
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 14, color: 'var(--color-neutral-700)', fontWeight: 500 }}>{longToday()}</span>
          <h1 className="title" style={{ fontSize: 34 }}>¡Hola, {name || 'atleta'}!</h1>
          <span style={{ fontSize: 15, color: 'var(--color-neutral-800)' }}>{weekLine}</span>
          {data.aim?.trim() && <span className="aim-pill"><Icon name="trophy" size={15} /><span>{data.aim.trim()}</span></span>}
        </div>
        <div style={{ display: 'flex', gap: 10, flex: 'none' }}>
          <button className="round-btn" style={{ width: 48, height: 48 }} onClick={() => { openTimerFrom('home'); set(() => ({ screen: 'tm' })); }} aria-label="Cronómetro de WOD"><Icon name="timer" size={22} /></button>
          <button className="flex-center avatar-btn" onClick={() => set(() => ({ screen: 'w2' }))} aria-label="Tu perfil y ajustes">{initialOf(name, 'A')}</button>
        </div>
      </header>

      {/* Your day: the week and today's WOD belong together. */}
      {/* minmax(0, 1fr): an auto column grew to the WOD's long title and pushed both cards off the screen. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
        <CheckinCard where="home" />
        <div style={{ background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', padding: 22, display: 'flex', flexDirection: 'column', gap: 18, position: 'relative', overflow: 'hidden' }}>
          {/* A bumper plate peeking in from the corner; clear of the text (pale on the accent wouldn't read). */}
          <div aria-hidden="true" className="deco-plate" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
            <div className="flex-center" style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-bg)', color: 'var(--color-accent-600)', flex: 'none' }}><Icon name="flame" size={30} /></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 32, lineHeight: 1 }}>{weekDone} de {data.freq}</span>
              <span style={{ fontSize: 15, color: 'var(--color-neutral-300)', maxWidth: 150 }}>
                entrenos esta semana<br />{weekDone >= data.freq ? '¡meta cumplida!' : `te faltan ${data.freq - weekDone}`}
              </span>
            </div>
          </div>
          {/* Seven equal columns that share the card's width: a 44px minimum each was 308px, wider than the card on a 360px phone (Sunday cut off). */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 2, position: 'relative' }}>
            {DAY_L.map((l, i) => {
              const on = data.done[i];
              return (
                <button key={i} aria-label={`${DAY_LONG[i]}${i === today ? ' (hoy)' : ''}: entrené`} aria-pressed={on} onClick={() => set(d => ({ done: d.done.map((x, j) => j === i ? !x : x) }))}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, minWidth: 0, minHeight: 44 }}>
                  <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 600, color: i === today ? 'var(--color-bg)' : 'var(--color-neutral-400)' }}>{l}</span>
                  <span className="flex-center" style={{ width: '100%', maxWidth: 36, aspectRatio: '1', borderRadius: '50%', background: on ? 'var(--color-accent-2-300)' : 'transparent', border: `2px solid ${on ? 'var(--color-accent-2-300)' : i === today ? 'var(--color-bg)' : 'var(--color-neutral-500)'}`, boxSizing: 'border-box', color: 'var(--color-text)', transition: 'background-color .2s, border-color .2s' }}>{on && <Icon name="check" size={18} />}</span>
                </button>
              );
            })}
          </div>
        </div>
        <TodayWod />
      </div>

      {/* The highlight reel: recent records as pastel cards, swiped sideways. */}
      {recent.length > 0 && (
        <section className="stack-3" aria-labelledby="recent-h">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="icon-badge" style={{ background: 'var(--color-accent-2-200)', color: 'var(--color-accent-2-800)' }} aria-hidden="true"><Icon name="trophy" size={19} /></span>
            <h2 id="recent-h" className="section-title">Récords recientes</h2>
          </div>
          <div className="pr-reel">
            {recent.map((r, i) => (
              <button key={r.p.id + r.iso + i} className="pr-tile" data-tone={i % 3} onClick={() => openDetail(r.p.id)}
                aria-label={`${r.p.name}: ${fmt.val(r.p, r.v)} ${fmt.unitOf(r.p)}, ${r.gain}, ${r.date}`}>
                <span className="pr-tile-icon" aria-hidden="true"><Icon name={iconOf(r.p)} size={20} /></span>
                <span className="pr-tile-name" aria-hidden="true">{r.p.name}</span>
                <span className="pr-tile-value" aria-hidden="true">{fmt.val(r.p, r.v)}<small>{fmt.unitOf(r.p)}</small></span>
                <span className="pr-tile-gain" aria-hidden="true">{r.gain} · {r.date}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Your records: their own section, the list tight. */}
      <section className="stack-3" aria-labelledby="marks-h">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="icon-badge" aria-hidden="true"><Icon name="barbell" size={20} /></span>
          <h2 id="marks-h" className="section-title" style={{ flex: 1 }}>Mis marcas</h2>
          {visible.length > 0 && <span className="muted-13">{visible.length}</span>}
        </div>
        {/* Filters only earn their place with more than one discipline. */}
        {several && (
          <div className="chip-row">
            <button className="pill" onClick={() => setHomeFilter('all')} aria-pressed={homeFilter === 'all'} style={pillStyle(homeFilter === 'all')}>Todas</button>
            {shown.map(d => <button key={d.id} className="pill" onClick={() => setHomeFilter(d.id)} aria-pressed={homeFilter === d.id} style={pillStyle(homeFilter === d.id)}>{d.label}</button>)}
          </div>
        )}
        {visible.length === 0 && (
          <div className="empty" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="icon-badge" aria-hidden="true"><Icon name="barbell" size={20} /></span>
            <span>Aún no hay marcas. Toca <strong>+</strong> y anota la primera.</span>
          </div>
        )}
        {visible.map(p => {
          // The card shows the record (same number as the detail), judged on one scheme so dates and values match.
          const scheme = mainSchemeOf(p);
          const scaled = recordIsScaled(p, scheme);
          const entries = entriesOf(p, scheme, scaled);
          const best = bestOf(p, scheme, scaled) ?? 0;
          const recordAt = [...entries].reverse().find(e => e.v === best) ?? entries[entries.length - 1];
          const delta = fmt.gain(p, entries[0].v, best);
          const badge = entries.length === 1 ? 'Primera' : delta > 0 ? fmt.gainTxt(p, entries[0].v, best) : `${entries.length} intentos`;
          const tint = p.type === 'kg' ? 'accent' : p.type === 'time' ? 'accent-2' : 'neutral';
          return (
            <button key={p.id} className="pr-card" onClick={() => openDetail(p.id)}>
              <div className="flex-center" style={{ width: 46, height: 46, borderRadius: '50%', background: `var(--color-${tint}-200)`, color: `var(--color-${tint}-800)`, flex: 'none' }}>
                <Icon name={iconOf(p)} size={22} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 16, lineHeight: 1.25 }}>{p.name}</span>
                <span className="muted-13">{several && homeFilter === 'all' ? `${discOf(p.disc).label} · ` : ''}{bestWord(scheme)}{scaled ? ' · escalado' : ''} · {recordAt.date}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 76 }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 26, lineHeight: 1 }}>{fmt.val(p, best)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, marginLeft: 3 }}>{fmt.unitOf(p)}</span></span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent-2-700)' }}>{badge}</span>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
