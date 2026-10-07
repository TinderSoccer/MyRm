import { useState } from 'react';
import { DeleteButton } from './DeleteButton';
import type { Pr, PrType } from '../data';
import { useCloud, type WodScore } from '../cloud';
import { initialOf, logOf, shortDate, todayISO, withLog } from '../format';
import { pillStyle, useStore } from '../store';

const TYPES: [PrType, string][] = [['time', 'Por tiempo'], ['reps', 'Reps / rondas'], ['kg', 'Peso']];
const MODES = [false, true];

interface Props { nameOf: (id: string) => string; colorOf: (id: string) => string }

/** Today's WOD for the whole group: someone posts it, everyone writes their score, the board ranks RX first like the box whiteboard. */
export function WodBoard({ nameOf, colorOf }: Props) {
  const cloud = useCloud();
  if (!cloud.wodBoard) return <div className="empty">La pizarra todavía no está activada en el servidor del grupo.</div>;
  // Keyed by WOD so a new day (or a deleted WOD) starts the score form fresh.
  return cloud.wod ? <Board key={cloud.wod.id} nameOf={nameOf} colorOf={colorOf} /> : <PostWod />;
}

function PostWod() {
  const cloud = useCloud();
  const { flash } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PrType>('time');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const post = async () => {
    if (!title.trim() || busy) return;
    setBusy(true); setError(null);
    const err = await cloud.postWod({ title: title.trim(), description: description.trim(), score_type: type });
    setBusy(false);
    if (err) setError(err); else flash('WOD en la pizarra', 'Ahora todos pueden anotar su resultado.');
  };
  return (
    <div className="dashed">
      <label htmlFor="wod-title" className="label-600">Nadie ha subido el WOD de hoy</label>
      <p className="note">Súbelo tú y el grupo anota sus resultados en la misma pizarra.</p>
      <input id="wod-title" className="input" placeholder="Nombre, p. ej. Fran o AMRAP 12′" value={title} onChange={e => setTitle(e.target.value)} style={{ height: 48, fontSize: 15 }} />
      <textarea className="input" aria-label="Descripción del WOD" rows={4} placeholder={'21-15-9\nThrusters 95/65 lb\nPull-ups'} value={description} onChange={e => setDescription(e.target.value)}
        style={{ borderRadius: 'var(--radius-md)', padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 15, resize: 'none', height: 'auto', minHeight: 96 }} />
      <div role="group" aria-label="Cómo se mide" style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {TYPES.map(([t, l]) => <button key={t} className="pill-sm" aria-pressed={type === t} onClick={() => setType(t)} style={pillStyle(type === t)}>{l}</button>)}
      </div>
      <button className="btn btn-primary" onClick={post} disabled={busy || !title.trim()} style={{ height: 48 }}>{busy ? 'Subiendo…' : 'Subir a la pizarra'}</button>
      {error && <p className="note" role="alert" style={{ color: 'var(--color-accent-800)' }}>{error}</p>}
    </div>
  );
}

function Board({ nameOf, colorOf }: Props) {
  const cloud = useCloud();
  const { data, set, fmt, flash } = useStore();
  const w = cloud.wod!;
  const measure = { type: w.score_type, better: w.score_type === 'time' ? 'down' as const : undefined, unitLabel: w.score_type === 'reps' ? 'reps' : undefined };
  const asPr = { ...measure, hist: [] } as unknown as Pr;
  const mine = w.scores.find(s => s.user_id === cloud.userId);
  const [editing, setEditing] = useState(!mine);
  const [text, setText] = useState(mine ? fmt.val(measure, mine.value) : '');
  const [scaled, setScaled] = useState(mine?.scaled ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ranked = [...w.scores].sort((a, b) =>
    a.scaled !== b.scaled ? (a.scaled ? 1 : -1) : w.score_type === 'time' ? a.value - b.value : b.value - a.value);

  // A benchmark with the same name as one of your marks (Fran, Cindy…) also lands in your history.
  const alsoMark = (s: Omit<WodScore, 'user_id'>) => {
    const p = data.prs.find(x => x.name.trim().toLowerCase() === w.title.trim().toLowerCase() && x.type === w.score_type && x.type !== 'kg');
    if (!p) return false;
    const iso = todayISO();
    const entry = { v: s.value, date: shortDate(iso), iso, scheme: null, mode: s.scaled ? 'Escalado' : 'RX', note: 'De la pizarra' };
    set(d => ({ prs: d.prs.map(x => x.id === p.id ? withLog(x, [...logOf(x).filter(e => !(e.iso === iso && e.note === 'De la pizarra')), entry]) : x) }));
    return true;
  };

  const save = async () => {
    const value = fmt.parse(asPr, text);
    if (value == null || value <= 0) { setError(w.score_type === 'time' ? 'Escribe el tiempo como m:ss, p. ej. 4:32.' : 'Escribe un número.'); return; }
    setBusy(true); setError(null);
    const s = { value, scaled, note: '' };
    const err = await cloud.saveScore(s);
    setBusy(false);
    if (err) { setError(err); return; }
    setEditing(false);
    flash('Resultado en la pizarra', alsoMark(s) ? `También quedó en tus marcas de ${w.title}.` : `${fmt.val(measure, value)} ${fmt.unitOf(measure)}`.trim());
  };

  return (
    <div className="stack-3">
      <div className="surface" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 18px 14px' }}>
        <span className="kicker">WOD de hoy · {TYPES.find(t => t[0] === w.score_type)?.[1]}</span>
        <h2 className="section-title" style={{ margin: 0 }}>{w.title}</h2>
        {w.description && <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.5 }}>{w.description}</p>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span className="muted-13">{w.created_by === cloud.userId ? 'Lo subiste tú' : `Lo subió ${nameOf(w.created_by)}`}</span>
          {w.created_by === cloud.userId && <DeleteButton label="Borrar" what={`el WOD ${w.title} y sus resultados`} onDelete={cloud.deleteWod} />}
        </div>
      </div>

      {editing ? (
        <div className="dashed">
          <label htmlFor="wod-score" className="label-600">Tu resultado</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input id="wod-score" className="input" inputMode={w.score_type === 'time' ? 'numeric' : 'decimal'} value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()} placeholder={w.score_type === 'time' ? 'm:ss' : w.score_type === 'reps' ? 'Reps o rondas' : 'Peso'}
              style={{ flex: 1, minWidth: 0, height: 48, fontSize: 17 }} />
            {fmt.unitOf(measure) && <span style={{ fontWeight: 600 }}>{fmt.unitOf(measure)}</span>}
          </div>
          <div role="group" aria-label="Modalidad" style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {MODES.map(m => <button key={String(m)} className="pill-sm" aria-pressed={scaled === m} onClick={() => setScaled(m)} style={pillStyle(scaled === m)}>{m ? 'Escalado' : 'RX'}</button>)}
          </div>
          <button className="btn btn-primary" onClick={save} disabled={busy || !text.trim()} style={{ height: 48 }}>{busy ? 'Guardando…' : 'Anotar en la pizarra'}</button>
          {error && <p className="note" role="alert" style={{ color: 'var(--color-accent-800)' }}>{error}</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setEditing(true)} style={{ minHeight: 44 }}>Cambiar mi resultado</button>
          <DeleteButton label="Quitar" what="tu resultado de hoy" onDelete={() => { cloud.dropScore(); setText(''); setEditing(true); }} />
        </div>
      )}

      <h3 className="label-600" style={{ margin: '8px 0 0' }}>Pizarra</h3>
      {ranked.length === 0 && <div className="empty">Nadie ha anotado todavía. Sé el primero.</div>}
      {ranked.map((s, i) => (
        <div key={s.user_id} className="surface" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
          <span style={{ width: 22, fontFamily: 'var(--font-heading)', fontSize: 18, textAlign: 'center', flex: 'none' }}>{i + 1}</span>
          <span className="flex-center" style={{ width: 36, height: 36, borderRadius: '50%', background: colorOf(s.user_id), color: 'var(--color-bg)', fontFamily: 'var(--font-heading)', fontSize: 15, flex: 'none' }}>
            {s.user_id === cloud.userId ? 'Tú' : initialOf(nameOf(s.user_id))}
          </span>
          <span style={{ flex: 1, minWidth: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(s.user_id)}</span>
          {s.scaled && <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: 'var(--color-accent-200)', color: 'var(--color-accent-800)', flex: 'none' }}>Escalado</span>}
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 22, flex: 'none' }}>
            {fmt.val(measure, s.value)}<span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, marginLeft: 3 }}>{fmt.unitOf(measure)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
