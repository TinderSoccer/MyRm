import { useState } from 'react';
import { DeleteButton } from './DeleteButton';
import type { Pr, PrType } from '../data';
import { useCloud, type CloudWod, type WodScore } from '../cloud';
import { logOf, shortDate, withLog } from '../format';
import { pillStyle, useStore } from '../store';

const TYPES: [PrType, string][] = [['time', 'Por tiempo'], ['reps', 'Reps / rondas'], ['kg', 'Peso']];
const MODES = [false, true];

/** The box whiteboard order: RX before scaled, then fastest time or most reps/weight. */
export const rankWod = (w: CloudWod) => [...w.scores].sort((a, b) =>
  a.scaled !== b.scaled ? (a.scaled ? 1 : -1) : w.score_type === 'time' ? a.value - b.value : b.value - a.value);

interface Props { nameOf: (id: string) => string }

/** Today's WOD for the whole group: someone posts it, everyone writes their score, the board ranks RX first like the box whiteboard. */
export function WodBoard({ nameOf }: Props) {
  const cloud = useCloud();
  if (!cloud.wodBoard) return <div className="empty">La pizarra todavía no está activada en el servidor del grupo.</div>;
  // Keyed by WOD so a new day (or a deleted WOD) starts the score form fresh.
  return cloud.wod ? <Board key={cloud.wod.id} nameOf={nameOf} /> : <PostWod />;
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
    // The board may already have replaced this form (someone posted first), so the message also goes in a toast.
    if (err) { setError(err); flash('No se subió tu WOD', err); } else flash('WOD en la pizarra', 'Ahora todos pueden anotar su resultado.');
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

function Board({ nameOf }: Props) {
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

  const ranked = rankWod(w);

  // A benchmark with the same name as one of your marks (Fran, Cindy…) also lands in your history.
  const BOARD_NOTE = 'De la pizarra';
  const benchmark = data.prs.find(x => x.name.trim().toLowerCase() === w.title.trim().toLowerCase() && x.type === w.score_type && x.type !== 'kg');
  const withoutToday = (p: Pr) => logOf(p).filter(e => !(e.iso === w.day && e.note === BOARD_NOTE));
  const alsoMark = (s: Omit<WodScore, 'user_id'>) => {
    if (!benchmark) return false;
    const entry = { v: s.value, date: shortDate(w.day), iso: w.day, scheme: null, mode: s.scaled ? 'Escalado' : 'RX', note: BOARD_NOTE };
    set(d => ({ prs: d.prs.map(x => x.id === benchmark.id ? withLog(x, [...withoutToday(x), entry]) : x) }));
    return true;
  };
  // Taking the score off the board takes it out of your history too.
  const unMark = () => { if (benchmark) set(d => ({ prs: d.prs.map(x => x.id === benchmark.id ? withLog(x, withoutToday(x)) : x) })); };

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

  const unit = fmt.unitOf(measure);
  const form = (
    <div className="dashed">
      <label htmlFor="wod-score" className="label-600">{mine ? 'Cambia tu resultado' : 'Tu resultado de hoy'}</label>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <input id="wod-score" className="input" inputMode={w.score_type === 'time' ? 'numeric' : 'decimal'} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()} placeholder={w.score_type === 'time' ? 'm:ss' : w.score_type === 'reps' ? 'Reps o rondas' : 'Peso'}
          style={{ flex: 1, minWidth: 0, height: 48, fontSize: 17 }} />
        {unit && <span style={{ fontWeight: 600 }}>{unit}</span>}
      </div>
      <div role="group" aria-label="Modalidad" style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {MODES.map(m => <button key={String(m)} className="pill-sm" aria-pressed={scaled === m} onClick={() => setScaled(m)} style={pillStyle(scaled === m)}>{m ? 'Escalado' : 'RX'}</button>)}
      </div>
      <button className="btn btn-primary" onClick={save} disabled={busy || !text.trim()} style={{ height: 48 }}>{busy ? 'Guardando…' : 'Anotar en la pizarra'}</button>
      {error && <p className="note" role="alert" style={{ color: 'var(--color-accent-800)' }}>{error}</p>}
    </div>
  );

  return (
    <div className="stack-3">
      {/* Not scored yet: the action comes first, where the thumb is. */}
      {editing && !mine && form}

      <section className="board" aria-labelledby="board-title">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 id="board-title" className="board-title">{w.title}</h2>
          <span className="board-meta">{TYPES.find(t => t[0] === w.score_type)?.[1]} · {w.created_by === cloud.userId ? 'lo subiste tú' : `lo subió ${nameOf(w.created_by)}`}</span>
        </div>
        {w.description && <p className="board-desc">{w.description}</p>}
        {ranked.length === 0
          ? <p className="board-empty">Nadie ha anotado todavía. Sé el primero.</p>
          : (
            <ol className="board-rows" aria-label="Pizarra">
              {ranked.map((s, i) => {
                const me = s.user_id === cloud.userId;
                const name = me ? 'Tú' : nameOf(s.user_id);
                return (
                  <li key={s.user_id} className="board-row" data-me={me} data-scaled={s.scaled}
                    aria-label={`Puesto ${i + 1}: ${name}, ${fmt.val(measure, s.value)} ${unit}${s.scaled ? ', escalado' : ''}`.replace(/\s+,/g, ',')}>
                    <span className="board-rank" aria-hidden="true">{i + 1}</span>
                    <span className="board-name" aria-hidden="true">{name}</span>
                    {s.scaled && <span className="board-tag" aria-hidden="true">Esc</span>}
                    <span className="board-score" aria-hidden="true">{fmt.val(measure, s.value)}{unit && <span className="board-unit">{unit}</span>}</span>
                  </li>
                );
              })}
            </ol>
          )}
      </section>

      {editing && mine && form}
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {mine && !editing && <button className="btn btn-secondary" onClick={() => setEditing(true)} style={{ minHeight: 44 }}>Cambiar mi resultado</button>}
        {mine && <DeleteButton label="Quitar mi resultado" what="tu resultado de hoy" onDelete={() => { cloud.dropScore(); unMark(); setText(''); setEditing(true); }} />}
        {w.created_by === cloud.userId && <DeleteButton label="Borrar WOD" what={`el WOD ${w.title} y sus resultados`} onDelete={cloud.deleteWod} />}
      </div>
    </div>
  );
}
