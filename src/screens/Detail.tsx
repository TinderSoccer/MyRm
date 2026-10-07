import { DeleteButton } from '../components/DeleteButton';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { discOf, type Pr } from '../data';
import { SCHEMES, barLoad, bestOf, bestWord, estimatedMaxOf, repsWord, entriesOf, fixedKg, isScaled, logOf, mainSchemeOf, oneRepMaxOf, recordIsScaled, withLog } from '../format';
import { useStore } from '../store';

const PCTS = [50, 60, 65, 70, 75, 80, 85, 90, 95];

export function Detail() {
  const { data, set, fmt, detId, openSheet, flash } = useStore();
  const p = data.prs.find(x => x.id === detId);
  const goHome = () => set(() => ({ screen: 'home' }));
  if (!p) return null;

  const d = discOf(p.disc);
  const log = logOf(p);
  const main = mainSchemeOf(p);
  const scaled = recordIsScaled(p, main);
  const best = bestOf(p, main, scaled);
  const mainEntries = entriesOf(p, main, scaled);
  const first = mainEntries[0];
  const delta = best != null && first ? fmt.gain(p, first.v, best) : 0;
  const mainLog = mainEntries.slice(-6);
  const custom = p.id.startsWith('u');

  const update = (fn: (x: Pr) => Pr) => set(d => ({ prs: d.prs.map(x => x.id === p.id ? fn(x) : x) }));
  // Index into the log as stored (the list below shows it newest first).
  const removeEntry = (at: number) => {
    const next = log.filter((_, i) => i !== at);
    update(x => withLog(x, next));
    if (!next.length) goHome();
    flash('Registro borrado', `${p.name}: quedan ${next.length} ${next.length === 1 ? 'registro' : 'registros'}.`);
  };
  const removeAll = () => {
    if (custom) set(d => ({ prs: d.prs.filter(x => x.id !== p.id), screen: 'home' }));
    else { update(x => withLog(x, [])); goHome(); }
    flash(custom ? 'Movimiento borrado' : 'Historial borrado', p.name);
  };
  const sc = mainLog.map(e => p.better === 'down' ? -e.v : e.v);
  const mn = Math.min(...sc), mx = Math.max(...sc);
  const unit = fmt.unitOf(p);
  // Percentages are for the bar; kettlebells and dumbbells come in fixed sizes.
  const rm = fixedKg(p) ? null : oneRepMaxOf(p);
  // A real 1RM that recent sets have outgrown (by more than 2.5%): worth testing again.
  const est = rm && !rm.estimated ? estimatedMaxOf(p) : null;
  const stronger = est && est.kg > rm!.kg * 1.025 ? est : null;
  const lb = data.units === 'lb';

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
          {p.type === 'kg' ? (main === '1RM' ? 'Tu máximo (1 rep)' : bestWord(main)) : p.better === 'down' ? 'Mejor tiempo' : 'Mejor marca'}{scaled ? ' · escalado' : ' · RX'}
        </span>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 56, lineHeight: 1, position: 'relative' }}>
          {best == null ? '—' : fmt.val(p, best)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 18, fontWeight: 600, marginLeft: 6 }}>{unit}</span>
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-accent-2-300)', position: 'relative' }}>
          {mainEntries.length <= 1 ? 'Tu primer registro' : delta > 0 ? `${fmt.gainTxt(p, first.v, best!)} desde ${first.date}` : `Sin mejora desde ${first.date}`}
        </span>
      </div>

      {p.type === 'kg' && log.length > 0 && (
        // Every rep scheme's best at a glance, so a 5-rep best never hides in the history.
        <div className="surface" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px' }}>
          <h2 className="field-label" style={{ margin: 0 }}>Tus mejores por repeticiones</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {SCHEMES.map(s => {
              const b = bestOf(p, s);
              return (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 4px', borderRadius: 'var(--radius-md)', background: s === main ? 'var(--color-bg)' : 'transparent' }}
                  aria-label={`${repsWord(s)}: ${b == null ? 'sin marca' : `${fmt.val(p, b)} ${unit}`}`}>
                  <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-neutral-700)' }}>{repsWord(s)}</span>
                  <span aria-hidden="true" style={{ fontFamily: 'var(--font-heading)', fontSize: 20, lineHeight: 1.1, color: b == null ? 'var(--color-neutral-500)' : 'var(--color-text)' }}>{b == null ? '—' : fmt.val(p, b)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rm && (
        <div className="surface" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 className="section-title" style={{ fontSize: 22 }}>Cuánto cargar</h2>
            <p className="note">
              {rm.estimated
                ? <>Aún no tienes 1RM, así que lo estimamos de tu mejor serie: <strong>{fmt.val(p, rm.kg)} {unit}</strong>.</>
                : <>Tu 1RM (lo máximo que levantas una vez) es <strong>{fmt.val(p, rm.kg)} {unit}</strong>. Cada fila es un % de eso.</>}
            </p>
            {stronger && (
              <p className="note" style={{ color: 'var(--color-accent-2-700)', fontWeight: 600 }}>
                Tu serie de {repsWord(stronger.from.scheme)} con {fmt.val(p, stronger.from.v)} {unit} ({stronger.from.date}) sugiere que hoy podrías llegar a ~{fmt.val(p, stronger.kg)} {unit}. Vale la pena probar un nuevo máximo.
              </p>
            )}
          </div>
          {/* Choosing the bar also chooses the unit: a 45 lb bar means pound plates. It's the app-wide setting. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="field-label">Tu barra</span>
            <Segmented label="Tu barra" value={`${data.units}-${data.bar}`}
              onChange={v => { const [units, bar] = v.split('-') as ['lb' | 'kg', 'big' | 'small']; set(() => ({ units, bar })); }}
              options={[['lb-big', '45 lb'], ['lb-small', '35 lb'], ['kg-big', '20 kg'], ['kg-small', '15 kg']]} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {PCTS.map(pct => {
              const l = barLoad(rm.kg * pct / 100, lb, data.bar);
              const plates = [l.big.length ? `${l.big.join(' + ')} ${lb ? 'lb' : 'kg'}` : '', l.small.length ? `${l.small.join(' + ')} kg` : ''].filter(Boolean).join(' + ');
              return (
                <div key={pct} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 0', borderTop: pct === PCTS[0] ? 'none' : '1px solid var(--color-neutral-300)' }}>
                  <span style={{ width: 40, fontSize: 13, fontWeight: 700, color: 'var(--color-neutral-700)', flex: 'none' }}>{pct}%</span>
                  <span style={{ width: 72, fontFamily: 'var(--font-heading)', fontSize: 20, lineHeight: 1.1, flex: 'none' }}>{fmt.val(p, l.totalKg)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, marginLeft: 3 }}>{unit}</span></span>
                  <span className="muted-13" style={{ flex: 1, minWidth: 0 }}>{plates ? `Por lado: ${plates}` : `Solo la barra (${l.bar})`}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
        {log.map((e, at) => ({ e, at })).reverse().map(({ e, at }) => {
          const scaled = e.mode === 'Escalado';
          // "Récord" alone would read as the 1RM; the best 5RM says so.
          const isBest = e.v === bestOf(p, e.scheme, isScaled(e));
          const tags = [
            ...(isBest ? [{ label: bestWord(e.scheme), bg: 'var(--color-accent-2-700)', fg: 'var(--color-bg)' }] : []),
            ...(e.scheme && !(isBest && e.scheme !== '1RM') ? [{ label: repsWord(e.scheme), bg: 'var(--color-bg)', fg: 'var(--color-text)' }] : []),
            { label: e.mode || 'RX', bg: scaled ? 'var(--color-accent-200)' : 'var(--color-bg)', fg: scaled ? 'var(--color-accent-800)' : 'var(--color-text)' }
          ];
          return (
            <div key={at} className="surface" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{e.date}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tags.map(t => <span key={t.label} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: t.bg, color: t.fg }}>{t.label}</span>)}
                </div>
                {e.note && <span style={{ fontSize: 14, color: 'var(--color-neutral-800)', fontStyle: 'italic' }}>“{e.note}”</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flex: 'none' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 22 }}>{fmt.val(p, e.v)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, marginLeft: 3 }}>{unit}</span></span>
                <DeleteButton label="Borrar" what={`el registro del ${e.date}`} onDelete={() => removeEntry(at)} />
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={() => openSheet({ prId: p.id })} className="btn btn-primary btn-block" style={{ height: 56, fontSize: 17 }}>Registrar nuevo intento</button>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DeleteButton label={custom ? 'Borrar este movimiento' : 'Borrar todo el historial'} what={custom ? `el movimiento ${p.name}` : `todo el historial de ${p.name}`} onDelete={removeAll} />
      </div>
    </div>
  );
}
