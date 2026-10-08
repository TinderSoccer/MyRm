import { useState } from 'react';
import { DeleteButton } from './DeleteButton';
import { Segmented } from './Segmented';
import { Icon } from './Icon';
import { openTimerFrom } from '../screens/Timer';
import { MEMBER_COLORS, type Pr, type PrType } from '../data';
import { MOOD_IN, MOOD_OUT } from './Checkin';
import { StoryComposer } from './StoryComposer';
import { resolveColor, type StoryPerson } from '../story';
import { useCloud, type CloudWod, type WodScore } from '../cloud';
import { joinRounds, logOf, shortDate, splitRounds, withLog } from '../format';
import { pillStyle, useStore } from '../store';

const TYPES: [PrType, string][] = [['time', 'Tiempo'], ['reps', 'Rondas o reps'], ['kg', 'Peso']];
/** What each person will write as their result, and who wins: said in words under the choice. */
const TYPE_HELP: Record<PrType, string> = {
  time: 'For Time: cada uno anota cuánto se demoró, como 7:45. Gana el menor tiempo.',
  reps: 'AMRAP o máximo de reps: cada uno anota sus rondas (y reps extra) o sus reps. Gana el que hizo más.',
  kg: 'Fuerza: cada uno anota el peso que levantó. Gana el más pesado.'
};
const MODES = [[false, 'RX'], [true, 'Escalado']] as const;

/** The box whiteboard order: RX before scaled, then fastest time or most reps/weight. */
export const rankWod = (w: CloudWod) => [...w.scores].sort((a, b) =>
  a.scaled !== b.scaled ? (a.scaled ? 1 : -1) : w.score_type === 'time' ? a.value - b.value : b.value - a.value);

interface Props { nameOf: (id: string) => string }

/** Today's WOD for the whole group: someone posts it, everyone writes their score, the board ranks RX first like the box whiteboard. */
export function WodBoard({ nameOf }: Props) {
  const cloud = useCloud();
  const [adding, setAdding] = useState(false);
  if (!cloud.wodBoard) return <div className="empty">La pizarra todavía no está activada en el servidor del grupo.</div>;
  if (!cloud.wods.length) return <WodForm />;
  return (
    <>
      {/* Each class can have its own WOD: pick whose board to see, or post your class's. */}
      <div className="chip-row" role="group" aria-label="Clase">
        {cloud.wods.map(w => (
          <button key={w.id} className="pill" aria-pressed={!adding && cloud.wod?.id === w.id} style={pillStyle(!adding && cloud.wod?.id === w.id)}
            onClick={() => { setAdding(false); cloud.selectClass(w.class_time); }}>
            {w.class_time ? `${w.class_time.replace(/^0/, '')} · ` : ''}{w.title.length > 18 ? w.title.slice(0, 17) + '…' : w.title}
          </button>
        ))}
        <button className="new-mov hit" aria-expanded={adding} onClick={() => setAdding(a => !a)}>+ Otra clase</button>
      </div>
      {adding
        ? <WodForm onDone={() => setAdding(false)} />
        // Keyed by WOD so another class (or a deleted WOD) starts the score form fresh.
        : cloud.wod && <Board key={cloud.wod.id} nameOf={nameOf} />}
    </>
  );
}

/** Posting today's WOD, or (for whoever posted it) fixing it. Can start from a photo of the real whiteboard. */
function WodForm({ edit, onDone }: { edit?: CloudWod; onDone?: () => void }) {
  const cloud = useCloud();
  const { flash } = useStore();
  const myClass = cloud.checkins.find(c => c.user_id === cloud.userId)?.class_time;
  // The class this WOD is for: yours from today's check-in, else your usual one, else this hour.
  const { data } = useStore();
  const [classTime, setClassTime] = useState(() => myClass || data.classTime || `${String(new Date().getHours()).padStart(2, '0')}:00`);
  const [title, setTitle] = useState(edit?.title ?? '');
  const [description, setDescription] = useState(edit?.description ?? '');
  const [type, setType] = useState<PrType>(edit?.score_type ?? 'time');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [fromPhoto, setFromPhoto] = useState(false);
  // Scores already on the board were written as times (or reps, or weights): the type can't change under them.
  const typeLocked = !!edit && edit.scores.length > 0;
  // A photo of the real whiteboard, read by AI into the fields below; the person checks it before posting.
  const readPhoto = async (file: File | undefined) => {
    if (!file) return;
    setReading(true); setError(null);
    const out = await cloud.readBoardPhoto(file);
    setReading(false);
    if (typeof out === 'string') { setError(out); flash('No se leyó la foto', out); return; }
    setTitle(out.title); setDescription(out.description); if (!typeLocked) setType(out.score_type); setFromPhoto(true);
  };
  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true); setError(null);
    const w = { title: title.trim(), description: description.trim(), score_type: type };
    const err = edit ? await cloud.updateWod(w) : await cloud.postWod(w, classTime);
    setBusy(false);
    // The board may already have replaced this form (someone posted first), so the message also goes in a toast.
    if (err) { setError(err); flash(edit ? 'No se guardó el cambio' : 'No se subió tu WOD', err); return; }
    flash(edit ? 'WOD corregido' : 'WOD en la pizarra', edit ? 'Los resultados siguen ahí.' : 'Ahora todos pueden anotar su resultado.');
    onDone?.();
  };
  return (
    <div className="dashed">
      <label htmlFor="wod-title" className="label-600">{edit ? 'Corregir el WOD' : cloud.wods.length ? 'WOD de otra clase' : 'Nadie ha subido el WOD de hoy'}</label>
      <p className="note">{edit ? 'Los resultados que ya anotaron se mantienen.' : 'Súbelo tú y los de tu clase anotan sus resultados en la misma pizarra.'}</p>
      {!edit && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 'var(--text-sm)' }}>
          ¿De qué clase es?
          <input className="input" type="time" value={classTime} onChange={e => setClassTime(e.target.value)} style={{ width: 150, height: 44, borderRadius: 999 }} />
        </label>
      )}
      <label className="btn btn-secondary" style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: reading ? 'progress' : 'pointer', position: 'relative' }} aria-busy={reading}>
        <Icon name="board" size={20} />{reading ? 'Leyendo la pizarra…' : edit ? 'Leer otra foto' : 'Foto de la pizarra'}
        <input type="file" accept="image/*" capture="environment" disabled={reading} onChange={e => { readPhoto(e.target.files?.[0]); e.target.value = ''; }}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
      </label>
      {fromPhoto && <p className="note" role="status" style={{ color: 'var(--color-accent-2-700)', fontWeight: 600 }}>Lo leímos de la foto. Revisa que esté bien antes de {edit ? 'guardar' : 'subirlo'}.</p>}
      <input id="wod-title" className="input" placeholder="Nombre, p. ej. Fran o AMRAP 12′" value={title} onChange={e => setTitle(e.target.value)} style={{ height: 48, fontSize: 'var(--text-md)' }} />
      <textarea className="input" aria-label="Descripción del WOD" rows={4} placeholder={'21-15-9\nThrusters 95/65 lb\nPull-ups'} value={description} onChange={e => setDescription(e.target.value)}
        style={{ borderRadius: 'var(--radius-md)', padding: '12px 16px', fontFamily: 'var(--font-body)', fontSize: 'var(--text-md)', resize: 'vertical', height: 'auto', minHeight: edit ? 180 : 96 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="field-label">¿Cómo anota cada uno su resultado?</span>
        {!typeLocked && <Segmented label="¿Cómo anota cada uno su resultado?" value={type} onChange={setType} options={TYPES} />}
        <p className="note">{TYPE_HELP[type]}{typeLocked ? ' Ya hay resultados anotados así, por eso no se puede cambiar.' : ''}</p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {edit && <button className="btn btn-secondary" onClick={onDone} style={{ height: 48, flex: 1 }}>Cancelar</button>}
        <button className="btn btn-primary" onClick={save} disabled={busy || !title.trim()} style={{ height: 48, flex: 2 }}>{busy ? 'Guardando…' : edit ? 'Guardar cambios' : 'Subir a la pizarra'}</button>
      </div>
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
  const [fixing, setFixing] = useState(false);  // the author correcting the WOD itself
  const [story, setStory] = useState(false);
  const isReps = w.score_type === 'reps';
  // Reps WODs take rounds and extra reps in two number fields: a phone's number pad has no "+" key.
  const [text, setText] = useState(mine ? (isReps ? String(splitRounds(mine.value)[0]) : fmt.val(measure, mine.value)) : '');
  const [extraText, setExtraText] = useState(mine && isReps && splitRounds(mine.value)[1] ? String(splitRounds(mine.value)[1]) : '');
  const [scaled, setScaled] = useState(mine?.scaled ?? data.level === 'Escalado');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ranked = rankWod(w);
  const copyFrom = cloud.otherScores.find(o => o.score_type === w.score_type);

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
    const extra = extraText.trim() ? Number(extraText) : 0;
    const main = fmt.parse(asPr, text);
    const value = isReps && main != null ? (Number.isInteger(main) && Number.isInteger(extra) && extra >= 0 && extra < 1000 ? joinRounds(main, extra) : null) : main;
    if (value == null || value <= 0) { setError(w.score_type === 'time' ? 'Escribe el tiempo como m:ss, p. ej. 4:32.' : 'Escribe números enteros: rondas, y reps extra si sobraron.'); return; }
    setBusy(true); setError(null);
    const s = { value, scaled, note: '' };
    const err = await cloud.saveScore(s);
    setBusy(false);
    if (err) { setError(err); return; }
    setEditing(false);
    flash('Resultado en la pizarra', alsoMark(s) ? `También quedó en tus marcas de ${w.title}.` : `${fmt.val(measure, value)} ${fmt.unitOf(measure)}`.trim());
  };

  const unit = fmt.unitOf(measure);
  // How a score is read out: "5 rondas y 12 reps", "4:05", "120 reps".
  const scoreWords = (v: number) => {
    const [r, extra] = splitRounds(v);
    return isReps && extra ? `${r} rondas y ${extra} reps` : `${fmt.val(measure, v)} ${unit}`.trim();
  };
  const form = (
    <div className="dashed">
      <label htmlFor="wod-score" className="label-600">{mine ? 'Cambia tu resultado' : 'Tu resultado de hoy'}</label>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <input id="wod-score" className="input" inputMode={w.score_type === 'time' ? 'numeric' : isReps ? 'numeric' : 'decimal'} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()} placeholder={w.score_type === 'time' ? 'm:ss' : isReps ? 'Rondas o reps' : 'Peso'}
          style={{ flex: 1, minWidth: 0, height: 48, fontSize: 'var(--text-lg)' }} />
        {isReps ? (
          <>
            <span aria-hidden="true" style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--display-md)' }}>+</span>
            <input className="input" inputMode="numeric" aria-label="Reps extra (opcional)" placeholder="reps" value={extraText} onChange={e => setExtraText(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && save()} style={{ width: 88, flex: 'none', height: 48, fontSize: 'var(--text-lg)' }} />
          </>
        ) : unit && <span style={{ fontWeight: 600 }}>{unit}</span>}
      </div>
      <Segmented label="Modalidad" fit value={scaled} onChange={setScaled} options={MODES} />
      <button className="btn btn-primary" onClick={save} disabled={busy || !text.trim()} style={{ height: 48 }}>{busy ? 'Guardando…' : 'Anotar en la pizarra'}</button>
      {error && <p className="note" role="alert" style={{ color: 'var(--color-accent-800)' }}>{error}</p>}
    </div>
  );

  return (
    <div className="stack-3">
      {/* Not scored yet: the action comes first, where the thumb is. */}
      {/* Already scored this in another of your groups (same kind of score): bring it here in one tap. */}
      {!mine && copyFrom && (
        <div className="checkin" style={{ gap: 10 }}>
          <span style={{ fontWeight: 600 }}>Ya anotaste <strong>{fmt.val(measure, copyFrom.value)}{unit && !(isReps && splitRounds(copyFrom.value)[1]) ? ` ${unit}` : ''}</strong> en {copyFrom.group} ({copyFrom.title}).</span>
          <button className="btn btn-primary" disabled={busy} onClick={async () => {
            setBusy(true);
            const err = await cloud.saveScore({ value: copyFrom.value, scaled: copyFrom.scaled, note: '' });
            setBusy(false);
            if (err) flash('No se anotó', err); else { setEditing(false); flash('Resultado anotado', `Lo copiamos de ${copyFrom.group}.`); }
          }} style={{ minHeight: 48 }}>Agregarlo aquí también</button>
        </div>
      )}
      {editing && !mine && form}

      {/* The fix form opens above the board: bring it into view instead of leaving it off-screen. */}
      {fixing && <div ref={el => el?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><WodForm edit={w} onDone={() => setFixing(false)} /></div>}
      <section className="board" aria-labelledby="board-title">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 id="board-title" className="board-title">{w.title}</h2>
          <span className="board-meta">{{ time: 'Por tiempo', reps: 'Por rondas o reps', kg: 'Por peso' }[w.score_type]} · {w.created_by === cloud.userId ? 'lo subiste tú' : `lo subió ${nameOf(w.created_by)}`}</span>
        </div>
        {w.description && <BoardText text={w.description} />}
        {ranked.length === 0
          ? <p className="board-empty">Nadie ha anotado todavía. Sé el primero.</p>
          : (
            <ol className="board-rows" aria-label="Pizarra">
              {ranked.map((s, i) => {
                const me = s.user_id === cloud.userId;
                const name = me ? 'Tú' : nameOf(s.user_id);
                return (
                  <li key={s.user_id} className="board-row" data-me={me} data-scaled={s.scaled}
                    aria-label={`Puesto ${i + 1}: ${name}, ${scoreWords(s.value)}${s.scaled ? ', escalado' : ''}`}>
                    <span className="board-rank" aria-hidden="true">{i + 1}</span>
                    <span className="board-name" aria-hidden="true">{name}</span>
                    {s.scaled && <span className="board-tag" aria-hidden="true">Esc</span>}
                    <span className="board-score" aria-hidden="true">{fmt.val(measure, s.value)}{unit && !(isReps && splitRounds(s.value)[1]) && <span className="board-unit">{unit}</span>}</span>
                  </li>
                );
              })}
            </ol>
          )}
      </section>

      {editing && mine && form}
      <button className="btn btn-primary btn-block" onClick={() => setStory(true)} style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="share" size={20} />Historia para Instagram
      </button>
      {story && <StoryComposer kind="wod" wod={w} {...storyCrew(cloud, w)} onClose={() => setStory(false)} />}
      <button className="btn btn-secondary btn-block" onClick={() => { openTimerFrom('gr'); set(() => ({ screen: 'tm' })); }} style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Icon name="timer" size={20} />Cronometrar este WOD
      </button>
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {mine && !editing && <button className="btn btn-secondary" onClick={() => setEditing(true)} style={{ minHeight: 44 }}>Cambiar mi resultado</button>}
        {mine && <DeleteButton label="Quitar mi resultado" what="tu resultado de hoy" onDelete={() => { cloud.dropScore(); unMark(); setText(''); setExtraText(''); setEditing(true); }} />}
        {w.created_by === cloud.userId && !fixing && <button className="del-btn" onClick={() => setFixing(true)}>Editar WOD</button>}
        {w.created_by === cloud.userId && <DeleteButton label="Borrar WOD" what={`el WOD ${w.title} y sus resultados`} onDelete={cloud.deleteWod} />}
      </div>
    </div>
  );
}

/** Who came to this WOD's class and how they finished (or arrived, if they haven't said), for the story. */
function storyCrew(cloud: ReturnType<typeof useCloud>, w: CloudWod): { people: StoryPerson[]; moods: string[] } {
  const came = cloud.checkins.filter(c => !w.class_time || c.class_time === w.class_time);
  const people = came.map(c => {
    const i = cloud.members.findIndex(m => m.id === c.user_id);
    const emoji = c.mood_out ? MOOD_OUT[c.mood_out - 1][0] : MOOD_IN[c.mood_in - 1][0];
    // Same colours as in the group: yours is the ink, everyone else's from the member palette.
    const color = resolveColor(c.user_id === cloud.userId ? 'var(--color-text)' : MEMBER_COLORS[Math.max(0, i) % MEMBER_COLORS.length]);
    return { name: cloud.members[i]?.name || 'Alguien', color, emoji, me: c.user_id === cloud.userId };
  }).sort((a, b) => Number(b.me) - Number(a.me) || a.name.localeCompare(b.name));
  return { people: people.map(({ me: _, ...p }) => p), moods: came.filter(c => c.mood_out).map(c => MOOD_OUT[c.mood_out! - 1][0]) };
}

/** A long board (11 lines from a photo) shows its first lines and opens on request, so the ranking stays in reach. */
function BoardText({ text }: { text: string }) {
  const SHOWN = 6;
  const lines = text.split('\n');
  const [open, setOpen] = useState(false);
  const long = lines.length > SHOWN + 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
      <p className="board-desc">{long && !open ? lines.slice(0, SHOWN).join('\n') + '…' : text}</p>
      {long && <button type="button" className="board-more" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Ver menos' : `Ver todo (${lines.length} líneas)`}</button>}
    </div>
  );
}
