import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { discOf, type DiscId, type PrType } from '../data';
import { bestOf, currentOf, logOf, shortDate, todayISO, weekIndexOf, withLog, yesterdayISO } from '../format';
import { pillStyle, useShownDiscs, useStore } from '../store';
import { useCloud } from '../cloud';

const SCHEMES = ['1RM', '3RM', '5RM', '10RM'];
const MODES = ['RX', 'Escalado'];
type NewType = PrType | 'kb';
const NEW_TYPES: [NewType, string][] = [['kg', 'Barra'], ['kb', 'KB / mancuerna'], ['time', 'Tiempo'], ['reps', 'Reps']];

export function RecordSheet() {
  const { data, set, fmt, sheet, closeSheet, flash } = useStore();
  const shown = useShownDiscs();
  const cloud = useCloud();
  const open = sheet != null;
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [sel, setSel] = useState(data.prs[0]?.id ?? '');
  const [sheetDisc, setSheetDisc] = useState<DiscId>(data.prs[0]?.disc ?? 'cf');
  const [draft, setDraft] = useState(0);
  const [draftText, setDraftText] = useState<string | null>(null);
  const [showNewMov, setShowNewMov] = useState(false);
  const [newMovName, setNewMovName] = useState('');
  const [newMovType, setNewMovType] = useState<NewType>('kg');
  const [scheme, setScheme] = useState('1RM');
  const [dateISO, setDateISO] = useState(todayISO());
  const [mode, setMode] = useState('RX');
  const [note, setNote] = useState('');
  const [more, setMore] = useState(false);

  const firstOf = (disc: DiscId) => data.prs.find(p => p.disc === disc);
  const pick = (id: string) => { const p = data.prs.find(x => x.id === id); if (p) { setSel(id); setDraft(currentOf(p)); setDraftText(null); } };

  // Every open starts a fresh attempt on the requested mark (or on the filtered discipline, or the last one used).
  useEffect(() => {
    if (!sheet) return;
    const target = (sheet.prId && data.prs.find(p => p.id === sheet.prId))
      || (sheet.disc && firstOf(sheet.disc))
      || data.prs.find(p => p.id === sel) || data.prs[0];
    if (target) { setSel(target.id); setSheetDisc(target.disc); setDraft(currentOf(target)); }
    setDraftText(null); setShowNewMov(false); setNote(''); setDateISO(todayISO()); setScheme('1RM'); setMode('RX'); setMore(false);
  }, [sheet]);

  // Modal focus: move into the sheet on open, close on Escape, hand focus back to whatever opened it.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    titleRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeSheet(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.({ preventScroll: true }); };
  }, [open, closeSheet]);

  const selP = data.prs.find(p => p.id === sel) ?? data.prs[0];
  if (!selP) return null;

  const isWeight = selP.type === 'kg';
  const schemeKey = isWeight ? scheme : null;
  const best = bestOf(selP, schemeKey);
  const g0 = best == null ? 1 : fmt.gain(selP, best, draft);
  const g = best != null && isWeight && fmt.sameShown(selP, best, draft) ? 0 : g0;
  const unit = fmt.unitOf(selP);
  const sheetDiscLabel = discOf(sheetDisc).label;
  const dateLabel = dateISO === todayISO() ? 'Hoy' : dateISO === yesterdayISO() ? 'Ayer' : shortDate(dateISO);

  const hint = best == null
    ? `¡Primer registro${schemeKey ? ' de ' + schemeKey : ''}!`
    : g > 0.01
      ? (selP.better === 'down' ? `¡${fmt.fmtD(g)} más rápido que tu récord!` : `¡${fmt.gainTxt(selP, g)} sobre tu récord!`)
      : g < -0.01 ? `Récord actual: ${fmt.val(selP, best)} ${unit}` : 'Igual a tu récord';

  const chooseDisc = (id: DiscId) => {
    setSheetDisc(id);
    const f = firstOf(id);
    if (f) pick(f.id); else setShowNewMov(true);
  };

  const createMov = () => {
    const name = newMovName.trim();
    if (!name) return;
    const id = 'u' + Date.now();
    const kb = newMovType === 'kb';
    const type: PrType = kb ? 'kg' : newMovType;
    set(d => ({ prs: [...d.prs, { id, disc: sheetDisc, name, type, better: type === 'time' ? 'down' : undefined, unitLabel: kb ? 'kg' : undefined, hist: [], log: [], date: '—' }] }));
    setSel(id); setDraft(kb ? 16 : type === 'kg' ? 40 : type === 'time' ? 300 : 10); setDraftText(null); setShowNewMov(false); setNewMovName('');
  };

  const step = fmt.stepOf(selP);
  const save = () => {
    const isPR = g > 0.01;
    const v = Math.round(draft * 10) / 10;
    const entry = { v, date: shortDate(dateISO), iso: dateISO, scheme: schemeKey, mode, note: note.trim() };
    // Logging a mark means you trained that day.
    const day = weekIndexOf(dateISO, data.weekStart);
    set(d => ({
      prs: d.prs.map(x => x.id === selP.id ? withLog(x, [...logOf(x), entry]) : x),
      done: day >= 0 ? d.done.map((x, i) => x || i === day) : d.done,
      feed: isPR ? [{ id: Date.now(), who: 'me', kind: 'pr' as const, disc: selP.disc, what: selP.name, type: selP.type, unitLabel: selP.unitLabel, value: v, ago: 'Ahora', at: Date.now(), cheers: 0, cheered: false }, ...d.feed] : d.feed
    }));
    // Records also go to the shared group, when there is one.
    if (isPR) cloud.post({ kind: 'pr', disc: selP.disc, what: selP.name, type: selP.type, unit_label: selP.unitLabel ?? null, value: v });
    closeSheet();
    setDraftText(null);
    flash(
      isPR ? '¡Nuevo récord!' : 'Guardado',
      isPR
        ? (best == null
          ? `${selP.name}${schemeKey ? ' ' + schemeKey : ''}: ${fmt.val(selP, v)} ${unit}. ¡Primera marca!`
          : `${selP.name}${schemeKey && schemeKey !== '1RM' ? ' ' + schemeKey : ''}: ${fmt.gainTxt(selP, g)}. ¡Qué bárbaro!`)
        : `${selP.name}: ${fmt.val(selP, draft)} ${unit}. Constancia es avance.`
    );
  };

  return (
    <>
      <div className="backdrop" data-open={open} onClick={closeSheet} />
      <div className="sheet" data-open={open} data-screen-label="05 Registrar marca" role="dialog" aria-modal="true" aria-labelledby="sheet-title" inert={!open}>
        <span style={{ width: 44, height: 5, borderRadius: 999, background: 'var(--color-neutral-400)', justifySelf: 'center' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 id="sheet-title" ref={titleRef} tabIndex={-1} style={{ outline: 'none', fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 26, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="flex-center" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-accent)', color: 'var(--color-bg)' }}><Icon name="dumbbell" size={22} /></span>
            Registrar marca
          </h2>
          <button className="round-btn" onClick={closeSheet} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        </div>

        <div className="chip-row">
          {shown.map(d => (
            <button key={d.id} className="pill" onClick={() => chooseDisc(d.id)} aria-pressed={sheetDisc === d.id} style={{ fontWeight: 700, ...pillStyle(sheetDisc === d.id) }}>{d.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {data.prs.filter(p => p.disc === sheetDisc).map(p => {
            const on = p.id === sel;
            return (
              <button key={p.id} className="chip hit" onClick={() => pick(p.id)} aria-pressed={on}>{p.name}</button>
            );
          })}
          <button className="new-mov hit" aria-expanded={showNewMov} onClick={() => setShowNewMov(v => !v)}>+ Nuevo</button>
        </div>

        {showNewMov && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
            <input className="input" aria-label="Nombre del movimiento" placeholder="Nombre, p. ej. Thruster" value={newMovName} onChange={e => setNewMovName(e.target.value)} style={{ height: 46, fontSize: 15 }} />
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {NEW_TYPES.map(([k, l]) => <button key={k} className="pill-sm" onClick={() => setNewMovType(k)} aria-pressed={newMovType === k} style={pillStyle(newMovType === k)}>{l}</button>)}
            </div>
            <button onClick={createMov} className="btn btn-primary" style={{ height: 44 }}>Crear en {sheetDiscLabel}</button>
          </div>
        )}

        <div className="surface" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 18 }}>
          <button className="stepper-btn stepper-minus" aria-label="Menos" onClick={() => { setDraftText(null); setDraft(v => Math.max(0, v - step)); }}><Icon name="minus" size={22} /></button>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, width: '100%' }}>
              <input className="draft-input" aria-label="Valor" inputMode="decimal" value={draftText ?? fmt.val(selP, draft)}
                onChange={e => { const t = e.target.value; const v = fmt.parse(selP, t); setDraftText(t); if (v != null) setDraft(v); }}
                onFocus={e => { const el = e.target; setTimeout(() => el.select(), 0); }}
                onBlur={() => setDraftText(null)} />
              {unit && <span style={{ fontSize: 18, fontWeight: 600 }}>{unit}</span>}
            </div>
            {selP.type === 'time' && <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>Formato m:ss</span>}
            <span style={{ fontSize: 13, fontWeight: 600, color: g > 0.01 ? 'var(--color-accent-2-700)' : 'var(--color-neutral-700)', textAlign: 'center' }}>{hint}</span>
          </div>
          <button className="stepper-btn stepper-plus" aria-label="Más" onClick={() => { setDraftText(null); setDraft(v => v + step); }}><Icon name="plus" size={22} /></button>
        </div>

        <button className="more-toggle" aria-expanded={more} aria-controls="sheet-more" onClick={() => setMore(v => !v)}>
          <span>Más detalles</span>
          <span className="more-sum">{[schemeKey, dateLabel, mode, note.trim() && 'Con nota'].filter(Boolean).join(' · ')}</span>
          <span aria-hidden="true" style={{ display: 'flex', transform: `rotate(${more ? 90 : -90}deg)`, transition: 'transform .2s' }}><Icon name="chevronLeft" size={18} /></span>
        </button>

        {more && <div id="sheet-more" style={{ display: 'grid', gap: 'var(--space-4)' }}>
        {isWeight && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="field-label">Repeticiones</span>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {SCHEMES.map(k => <button key={k} className="pill-sm" onClick={() => setScheme(k)} aria-pressed={scheme === k} style={pillStyle(scheme === k)}>{k}</button>)}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="field-label">Fecha</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            {[[todayISO(), 'Hoy'], [yesterdayISO(), 'Ayer']].map(([iso, l]) => <button key={l} className="pill-sm" onClick={() => setDateISO(iso)} aria-pressed={dateISO === iso} style={pillStyle(dateISO === iso)}>{l}</button>)}
            <input type="date" aria-label="Otra fecha" value={dateISO} max={todayISO()} onChange={e => e.target.value && setDateISO(e.target.value)}
              style={{ height: 44, padding: '0 12px', borderRadius: 999, border: '2px solid var(--color-neutral-600)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="field-label">Modalidad</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {MODES.map(k => <button key={k} className="pill-sm" onClick={() => setMode(k)} aria-pressed={mode === k} style={pillStyle(mode === k)}>{k}</button>)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="sheet-note" className="field-label">Nota (opcional)</label>
          <textarea id="sheet-note" className="input" rows={2} placeholder="¿Cómo te sentiste? Técnica, cinturón, rodilleras…" value={note} onChange={e => setNote(e.target.value)}
            style={{ borderRadius: 'var(--radius-md)', padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 15, resize: 'none', height: 'auto', minHeight: 64 }} />
        </div>
        </div>}
        <button className="btn btn-primary btn-block" onClick={save} style={{ height: 56, fontSize: 17 }}>Guardar</button>
      </div>
    </>
  );
}
