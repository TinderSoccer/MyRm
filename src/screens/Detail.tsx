import { DeleteButton } from '../components/DeleteButton';
import { Icon } from '../components/Icon';
import { BarPicker, UnitPicker, countsWords } from '../components/BarSetup';
import { discOf, type LogEntry, type Pr } from '../data';
import { SCHEMES, postedName, barLoad, barWeight, bestOf, bestWord, estimatedMaxOf, repsWord, entriesOf, fixedKg, isScaled, logOf, mainSchemeOf, oneRepMaxOf, recordIsScaled, withLog } from '../format';
import { useStore } from '../store';
import { useCloud } from '../cloud';
import { Rename } from '../components/Rename';

const PCTS = [50, 60, 65, 70, 75, 80, 85, 90, 95];

export function Detail() {
  const { data, set, fmt, detId, openSheet, flash } = useStore();
  const cloud = useCloud();
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
  // A deleted entry takes its record post off the group's feed too (when it was one).
  const unpostEntry = (e: LogEntry) => { if (e.mode !== 'Escalado') cloud.unpost(postedName(p, e.scheme), e.v); };
  const removeEntry = (at: number) => {
    unpostEntry(log[at]);
    const next = log.filter((_, i) => i !== at);
    update(x => withLog(x, next));
    if (!next.length) goHome();
    flash('Registro borrado', `${p.name}: quedan ${next.length} ${next.length === 1 ? 'registro' : 'registros'}.`);
  };
  const removeAll = () => {
    log.forEach(unpostEntry);
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
          <h1 className="title" style={{ fontSize: 'var(--display-lg)' }}>{p.name}</h1>
        </div>
      </div>
      {custom && <Rename name={p.name} what={p.name} onSave={name => { update(x => ({ ...x, name })); flash('Nombre cambiado', `Ahora es ${name}. Su historial sigue igual.`); }} />}

      <div style={{ background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', padding: 22, display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 140, height: 140, borderRadius: '50%', background: 'var(--color-accent-2)', right: -40, bottom: -60 }} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-300)', position: 'relative' }}>
          {p.type === 'kg' ? (main === '1RM' ? 'Tu máximo (1 rep)' : bestWord(main)) : p.better === 'down' ? 'Mejor tiempo' : 'Mejor marca'}{scaled ? ' · escalado' : ' · RX'}
        </span>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--display-num)', lineHeight: 1, position: 'relative' }}>
          {best == null ? '—' : fmt.val(p, best)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-lg)', fontWeight: 600, marginLeft: 6 }}>{unit}</span>
        </span>
        <span style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-accent-2-300)', position: 'relative' }}>
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
                  <span aria-hidden="true" style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-neutral-700)' }}>{repsWord(s)}</span>
                  <span aria-hidden="true" style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--display-sm)', lineHeight: 1.1, color: b == null ? 'var(--color-neutral-500)' : 'var(--color-text)' }}>{b == null ? '—' : fmt.val(p, b)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rm && (
        <div className="surface" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 className="section-title" style={{ fontSize: 'var(--display-md)' }}>Cuánto cargar</h2>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="field-label">Discos en</span>
            <UnitPicker />
            <span className="field-label" style={{ marginTop: 4 }}>Tu barra</span>
            <BarPicker />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {PCTS.map(pct => {
              const l = barLoad(rm.kg * pct / 100, lb, data.bar);
              const plates = [l.big.length ? `${l.big.join(' + ')} ${lb ? 'lb' : 'kg'}` : '', l.small.length ? `${l.small.join(' + ')} kg` : ''].filter(Boolean).join(' + ');
              return (
                <div key={pct} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 0', borderTop: pct === PCTS[0] ? 'none' : '1px solid var(--color-neutral-300)' }}>
                  <span style={{ width: 40, fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-neutral-700)', flex: 'none' }}>{pct}%</span>
                  <span style={{ width: 72, fontFamily: 'var(--font-heading)', fontSize: 'var(--display-sm)', lineHeight: 1.1, flex: 'none' }}>{fmt.val(p, l.totalKg)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, marginLeft: 3 }}>{unit}</span></span>
                  <span className="muted-sm" style={{ flex: 1, minWidth: 0 }}>{plates ? `Por lado: ${plates}` : `Solo la barra (${l.bar})`}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mainLog.length > 0 && (
        <div className="surface" role="img" aria-label={`Progreso: ${mainLog.map(e => `${e.date}, ${fmt.val(p, e.v)} ${unit}`).join('; ')}`} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18 }}>
          <span style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>Progreso</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150 }}>
            {mainLog.map((e, i) => {
              const top = e.v === best;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6, height: '100%', minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: top ? 'var(--color-accent-800)' : 'var(--color-neutral-800)' }}>{fmt.val(p, e.v)}</span>
                  <span style={{ width: '100%', maxWidth: 34, borderRadius: 999, height: `${mx === mn ? 60 : 18 + 60 * (sc[i] - mn) / (mx - mn)}%`, background: top ? 'var(--color-accent)' : 'var(--color-neutral-400)' }} />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-neutral-700)', whiteSpace: 'nowrap' }}>{e.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="stack-3">
        <h2 className="section-title" style={{ fontSize: 'var(--display-md)' }}>Historial</h2>
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
                <span style={{ fontWeight: 600, fontSize: 'var(--text-md)' }}>{e.date}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tags.map(t => <span key={t.label} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 'var(--text-xs)', fontWeight: 700, background: t.bg, color: t.fg }}>{t.label}</span>)}
                </div>
                {e.plates && <span className="muted-sm">Barra {barWeight(e.plates.lb, e.plates.bar)} {e.plates.lb ? 'lb' : 'kg'} · por lado {countsWords(e.plates.side)}</span>}
                {e.note && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-neutral-800)', fontStyle: 'italic' }}>“{e.note}”</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flex: 'none' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--display-md)' }}>{fmt.val(p, e.v)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', fontWeight: 600, marginLeft: 3 }}>{unit}</span></span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <button className="del-btn" onClick={() => openSheet({ prId: p.id, editAt: at })} aria-label={`Editar el registro del ${e.date}`}>Editar</button>
                  <DeleteButton label="Borrar" what={`el registro del ${e.date}`} onDelete={() => removeEntry(at)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={() => openSheet({ prId: p.id })} className="btn btn-primary btn-block" style={{ height: 56, fontSize: 'var(--text-lg)' }}>Registrar nuevo intento</button>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DeleteButton label={custom ? 'Borrar este movimiento' : 'Borrar todo el historial'} what={custom ? `el movimiento ${p.name}` : `todo el historial de ${p.name}`} onDelete={removeAll} />
      </div>
    </div>
  );
}
