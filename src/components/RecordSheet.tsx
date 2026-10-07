import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Segmented } from './Segmented';
import { PlateCounter, UnitPicker, countsFromLoad, countsWords, totalKgOf, type Counts } from './BarSetup';
import { discOf, type DiscId, type Pr, type PrType } from '../data';
import { SCHEMES, barLoad, barWeight, fixedKg, bestOf, bestWord, currentOf, joinRounds, lastOf, repsWord, logOf, shortDate, splitRounds, todayISO, weekIndexOf, withLog, yesterdayISO } from '../format';
import { pillStyle, useShownDiscs, useStore } from '../store';
import { useCloud } from '../cloud';

/** Smaller than any real difference: 0.1 kg, 1 s, or one extra rep in a rounds + reps score (0.001). */
const EPS = 0.0005;
const MODES = ['RX', 'Escalado'];
type NewType = PrType | 'kb';
const NEW_TYPES: [NewType, string][] = [['kg', 'Barra'], ['kb', 'KB / manc.'], ['time', 'Tiempo'], ['reps', 'Reps']];

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
  // Barbell lifts are logged by counting plates; `typing` is the way back to writing the number.
  const [typing, setTyping] = useState(false);
  const [counts, setCounts] = useState<Counts>({});
  const lb = data.units === 'lb';
  const onBar = (p: Pr) => p.type === 'kg' && !fixedKg(p);

  /** Plates for a weight: the ones you used last time at this rep count, or else the calculator's pick for it. */
  const suggestPlates = (p: Pr, scheme: string | null, kg: number): Counts => {
    const prev = [...logOf(p)].reverse().find(e => (e.scheme || null) === (scheme || null) && e.plates);
    if (prev?.plates && prev.plates.lb === lb && prev.plates.bar === data.bar) return prev.plates.side;
    const l = barLoad(kg, lb, data.bar);
    return countsFromLoad(l.bigN, l.smallN, lb);
  };
  /** A fresh attempt on a mark: your last weight at that rep count, as plates when it goes on a bar. */
  const startAttempt = (p: Pr, scheme: string | null) => {
    const v = lastOf(p, scheme) ?? (p.hist.length ? currentOf(p) : fmt.startOf(p));
    setDraft(v); setDraftText(null);
    if (onBar(p)) setCounts(suggestPlates(p, scheme, v));
  };

  const firstOf = (disc: DiscId) => data.prs.find(p => p.disc === disc);
  const pick = (id: string) => { const p = data.prs.find(x => x.id === id); if (p) { setSel(id); startAttempt(p, p.type === 'kg' ? scheme : null); } };

  // Every open starts a fresh attempt on the requested mark (or on the filtered discipline, or the last one used).
  useEffect(() => {
    if (!sheet) return;
    const target = (sheet.prId && data.prs.find(p => p.id === sheet.prId))
      || (sheet.disc && firstOf(sheet.disc))
      || data.prs.find(p => p.id === sel) || data.prs[0];
    setDraftText(null); setShowNewMov(false); setNote(''); setDateISO(todayISO()); setScheme('1RM'); setMode(data.level || 'RX'); setMore(false); setTyping(false);
    const editing = target && sheet.editAt != null ? logOf(target)[sheet.editAt] : undefined;
    if (target && editing) {
      // Correcting a past entry: everything as it was saved, plates included when they were counted in today's unit.
      setSel(target.id); setSheetDisc(target.disc);
      setDraft(editing.v); setScheme(editing.scheme ?? '1RM'); setMode(editing.mode || 'RX'); setNote(editing.note);
      setDateISO(editing.iso ?? todayISO());
      setMore(!!editing.note || (!!editing.iso && editing.iso !== todayISO()));
      if (editing.plates && editing.plates.lb === lb) { set(() => ({ bar: editing.plates!.bar })); setCounts(editing.plates.side); }
      else setTyping(true);
    } else if (target) { setSel(target.id); setSheetDisc(target.disc); startAttempt(target, target.type === 'kg' ? '1RM' : null); }
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

  // Pound bumpers don't turn into kilo ones: when the unit flips, re-plate the same weight in the new unit.
  useEffect(() => {
    setCounts(c => {
      const foreign = Object.keys(c).some(k => c[k] > 0 && (lb ? (k.endsWith('kg') && parseFloat(k) >= 5) : k.endsWith('lb')));
      if (!foreign) return c;
      const l = barLoad(totalKgOf(c, !lb, data.bar), lb, data.bar);
      return countsFromLoad(l.bigN, l.smallN, lb);
    });
  }, [lb]); // eslint-disable-line react-hooks/exhaustive-deps

  const selRaw = data.prs.find(p => p.id === sel) ?? data.prs[0];
  if (!selRaw) return null;
  const editAt = sheet?.editAt ?? null;
  const editingEntry = editAt != null ? logOf(selRaw)[editAt] : undefined;
  // While correcting an entry, records and "last weight" are judged without it.
  const selP = editingEntry ? withLog(selRaw, logOf(selRaw).filter((_, i) => i !== editAt)) : selRaw;
  const plateMode = onBar(selP) && !typing;
  // The attempt's weight: added up from the plates, or what was typed.
  const value = plateMode ? totalKgOf(counts, lb, data.bar) : draft;

  const isWeight = selP.type === 'kg';
  const schemeKey = isWeight ? scheme : null;
  const scaled = mode === 'Escalado';
  const best = bestOf(selP, schemeKey, scaled);
  // What this attempt is compared with, in words: "tu récord", "tu mejor de 5 reps", "tu mejor escalado".
  const rec = scaled ? 'tu mejor escalado' : schemeKey && schemeKey !== '1RM' ? `tu mejor de ${repsWord(schemeKey)}` : 'tu récord';
  const g0 = best == null ? 1 : fmt.gain(selP, best, value);
  const g = best != null && isWeight && fmt.sameShown(selP, best, value) ? 0 : g0;
  const unit = fmt.unitOf(selP);
  const sheetDiscLabel = discOf(sheetDisc).label;
  const dateLabel = dateISO === todayISO() ? 'Hoy' : dateISO === yesterdayISO() ? 'Ayer' : shortDate(dateISO);

  const hint = best == null
    ? (schemeKey ? `¡Tu primera marca a ${repsWord(schemeKey)}${scaled ? ' escalada' : ''}!` : `¡Primer registro${scaled ? ' escalado' : ''}!`)
    : g > EPS
      ? (selP.better === 'down' ? `¡${fmt.fmtD(g)} más rápido que ${rec}!` : `¡${fmt.gainTxt(selP, best, value)} sobre ${rec}!`)
      : g < -EPS ? `${scaled ? 'Mejor escalado' : bestWord(schemeKey)}: ${fmt.val(selP, best)} ${unit}` : `Igual a ${rec}`;

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
    setSel(id); setDraft(fmt.startOf({ type, unitLabel: kb ? 'kg' : undefined, hist: [] } as unknown as Pr)); setDraftText(null); setShowNewMov(false); setNewMovName('');
  };

  // Marks scored in rounds (Cindy…): the stepper moves whole rounds, a small field takes the reps left over.
  const byRounds = selP.type === 'reps' && selP.unitLabel === 'rondas';
  const [rounds, extraReps] = splitRounds(draft);
  const save = () => {
    const better = g > EPS;
    // Only RX records count as records: they go to the group. A better scaled attempt is celebrated here, not posted.
    const isPR = better && !scaled;
    // Kilos to 0.1, rounds + reps keep their extra reps (thousandths).
    const v = selP.type === 'reps' ? Math.round(value * 1000) / 1000 : Math.round(value * 10) / 10;
    const side = Object.fromEntries(Object.entries(counts).filter(([, c]) => c > 0));
    // An old entry without a calendar date keeps its label unless the date was changed.
    const keepDate = editingEntry && !editingEntry.iso && dateISO === todayISO();
    const entry = { v, date: keepDate ? editingEntry!.date : shortDate(dateISO), ...(keepDate ? {} : { iso: dateISO }), scheme: schemeKey, mode, note: note.trim(), ...(plateMode ? { plates: { bar: data.bar, lb, side } } : {}) };
    if (editingEntry) {
      set(d => ({ prs: d.prs.map(x => x.id === selRaw.id ? withLog(x, logOf(x).map((e, i) => i === editAt ? entry : e)) : x) }));
      closeSheet(); setDraftText(null);
      flash('Registro corregido', `${selP.name}: ${fmt.val(selP, v)} ${unit}${schemeKey && schemeKey !== '1RM' ? ` a ${repsWord(schemeKey)}` : ''}.`);
      return;
    }
    // Logging a mark means you trained that day.
    const day = weekIndexOf(dateISO, data.weekStart);
    set(d => ({
      prs: d.prs.map(x => x.id === selP.id ? withLog(x, [...logOf(x), entry]) : x),
      done: day >= 0 ? d.done.map((x, i) => x || i === day) : d.done
    }));
    // The group must not read a best set of 5 as a max: the reps go with the name.
    const what = schemeKey && schemeKey !== '1RM' ? `${selP.name} (${repsWord(schemeKey)})` : selP.name;
    if (isPR) cloud.post({ kind: 'pr', disc: selP.disc, what, type: selP.type, unit_label: selP.unitLabel ?? null, value: v });
    closeSheet();
    setDraftText(null);
    const label = schemeKey && schemeKey !== '1RM' ? `${selP.name} a ${repsWord(schemeKey)}` : selP.name;
    flash(
      isPR ? '¡Nuevo récord!' : better ? '¡Mejor escalado!' : 'Guardado',
      better
        ? (best == null ? `${label}: ${fmt.val(selP, v)} ${unit}. ¡Primera marca${scaled ? ' escalada' : ''}!` : `${label}: ${fmt.gainTxt(selP, best, v)}. ${isPR ? '¡Qué bárbaro!' : 'Vas camino al RX.'}`)
        : `${selP.name}: ${fmt.val(selP, v)} ${unit}. Constancia es avance.`
    );
  };

  return (
    <>
      <div className="backdrop" data-open={open} onClick={closeSheet} />
      <div className="sheet" data-open={open} data-screen-label="05 Registrar marca" role="dialog" aria-modal="true" aria-labelledby="sheet-title" inert={!open}>
        <span style={{ width: 44, height: 5, borderRadius: 999, background: 'var(--color-neutral-400)', justifySelf: 'center' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 id="sheet-title" ref={titleRef} tabIndex={-1} style={{ outline: 'none', fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 26, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="flex-center" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}><Icon name="barbell" size={22} /></span>
            {editingEntry ? 'Editar registro' : 'Registrar marca'}
          </h2>
          <button className="round-btn" onClick={closeSheet} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        </div>

        {editingEntry ? (
          <p className="note" style={{ fontSize: 15 }}><strong>{selRaw.name}</strong> · registro del {editingEntry.date}</p>
        ) : <>
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
            <input className="input" aria-label="Nombre del movimiento" placeholder="Nombre, p. ej. Thruster" value={newMovName} onChange={e => setNewMovName(e.target.value)} style={{ height: 46, fontSize: 16 }} />
            <Segmented label="Cómo se mide" value={newMovType} onChange={setNewMovType} options={NEW_TYPES} />
            <button onClick={createMov} className="btn btn-primary" style={{ height: 44 }}>Crear en {sheetDiscLabel}</button>
          </div>
        )}
        </>}

        {plateMode ? (
          <div className="surface" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '16px 18px' }}>
            <div aria-live="polite" style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 44, lineHeight: 1 }}>{fmt.val(selP, value)}</span>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{unit}</span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
              Barra {barWeight(lb, data.bar)} {lb ? 'lb' : 'kg'} + 2 lados de {countsWords(counts)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: g > EPS ? 'var(--color-accent-2-700)' : 'var(--color-neutral-700)', textAlign: 'center' }}>{hint}</span>
          </div>
        ) : (
        <div className="surface" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 18 }}>
          <button className="stepper-btn stepper-minus" aria-label="Menos" onClick={() => { setDraftText(null); setDraft(v => fmt.nudge(selP, v, -1)); }}><Icon name="minus" size={22} /></button>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, width: '100%' }}>
              <input className="draft-input" aria-label={byRounds ? 'Rondas' : 'Valor'} inputMode={byRounds ? 'numeric' : 'decimal'}
                value={draftText ?? (byRounds ? String(rounds) : fmt.val(selP, draft))}
                onChange={e => {
                  const t = e.target.value; const v = fmt.parse(selP, t); setDraftText(t);
                  if (v != null) setDraft(byRounds && Number.isInteger(v) ? joinRounds(v, extraReps) : v);
                }}
                onFocus={e => { const el = e.target; setTimeout(() => el.select(), 0); }}
                onBlur={() => setDraftText(null)} />
              {unit && <span style={{ fontSize: 18, fontWeight: 600 }}>{unit}</span>}
            </div>
            {selP.type === 'time' && <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>Formato m:ss</span>}
            {onBar(selP) && <span style={{ fontSize: 12, color: 'var(--color-neutral-700)' }}>Peso total, con la barra</span>}
            {byRounds && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
                +
                <input className="input" inputMode="numeric" value={extraReps || ''} placeholder="0"
                  onChange={e => { const n = Number(e.target.value.replace(/\D/g, '') || 0); setDraft(joinRounds(rounds, Math.min(n, 999))); }}
                  style={{ width: 64, height: 36, padding: '0 10px', fontSize: 16, textAlign: 'center' }} />
                reps
              </label>
            )}
            <span style={{ fontSize: 13, fontWeight: 600, color: g > EPS ? 'var(--color-accent-2-700)' : 'var(--color-neutral-700)', textAlign: 'center' }}>{hint}</span>
          </div>
          <button className="stepper-btn stepper-plus" aria-label="Más" onClick={() => { setDraftText(null); setDraft(v => fmt.nudge(selP, v, 1)); }}><Icon name="plus" size={22} /></button>
        </div>
        )}

        {onBar(selP) && (
          // Pounds or kilos is part of the number; counting plates beats adding them up in your head.
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <UnitPicker />
              <button type="button" className="link-btn" onClick={() => {
                if (plateMode) { setDraft(value); setTyping(true); }
                else { const l = barLoad(draft, lb, data.bar); setCounts(countsFromLoad(l.bigN, l.smallN, lb)); setTyping(false); }
              }}>{plateMode ? 'Escribir el peso' : 'Contar discos'}</button>
            </div>
            {plateMode && <PlateCounter counts={counts} onChange={setCounts} />}
          </div>
        )}

        {isWeight && (
          // Always in sight: a set of 5 logged as a 1-rep max would skew the record and every percentage.
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="field-label" id="reps-label">¿Cuántas reps hiciste con ese peso?</span>
            <Segmented label="¿Cuántas reps hiciste con ese peso?" value={scheme}
              onChange={k => { setScheme(k); if (lastOf(selP, k) != null) startAttempt(selP, k); }}
              options={SCHEMES.map(k => [k, k === '1RM' ? '1 · máx.' : String(parseInt(k, 10))] as const)} />
          </div>
        )}

        <button className="more-toggle" aria-expanded={more} aria-controls="sheet-more" onClick={() => setMore(v => !v)}>
          <span>Más detalles</span>
          <span className="more-sum">{[dateLabel, mode, note.trim() && 'Con nota'].filter(Boolean).join(' · ')}</span>
          <span aria-hidden="true" style={{ display: 'flex', transform: `rotate(${more ? 90 : -90}deg)`, transition: 'transform .2s' }}><Icon name="chevronLeft" size={18} /></span>
        </button>

        {more && <div id="sheet-more" style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="field-label">Fecha</span>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Segmented label="Día" fit value={dateISO === todayISO() || dateISO === yesterdayISO() ? dateISO : null} onChange={setDateISO}
              options={[[todayISO(), 'Hoy'], [yesterdayISO(), 'Ayer']]} />
            <input type="date" aria-label="Otra fecha" value={dateISO} max={todayISO()} onChange={e => e.target.value && setDateISO(e.target.value)}
              style={{ height: 44, padding: '0 12px', borderRadius: 999, border: '2px solid var(--color-neutral-600)', background: 'transparent', fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="field-label">Modalidad</span>
          <Segmented label="Modalidad" fit value={mode} onChange={setMode} options={MODES.map(k => [k, k] as const)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="sheet-note" className="field-label">Nota (opcional)</label>
          <textarea id="sheet-note" className="input" rows={2} placeholder="¿Cómo te sentiste? Técnica, cinturón, rodilleras…" value={note} onChange={e => setNote(e.target.value)}
            style={{ borderRadius: 'var(--radius-md)', padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 16, resize: 'none', height: 'auto', minHeight: 64 }} />
        </div>
        </div>}
        <button className="btn btn-primary btn-block" onClick={save} style={{ height: 56, fontSize: 17 }}>{editingEntry ? 'Guardar cambios' : 'Guardar'}</button>
      </div>
    </>
  );
}
