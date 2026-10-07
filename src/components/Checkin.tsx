import { useState } from 'react';
import { useCloud, type Checkin } from '../cloud';
import { initialOf, todayISO, todayIndex } from '../format';
import { useStore } from '../store';

/** Mood on arrival and on leaving, 1 (low) to 5 (high). The emoji are the answer; the words say what each means. */
export const MOOD_IN: [string, string][] = [['😫', 'Sin pilas'], ['😕', 'Cansado'], ['😐', 'Normal'], ['🙂', 'Bien'], ['🔥', 'A full']];
export const MOOD_OUT: [string, string][] = [['💀', 'Me mató'], ['😮‍💨', 'Duro'], ['😊', 'Bien'], ['💪', 'Fuerte'], ['🤩', 'Volé']];

const SKIP_KEY = 'myrm.noclass.';
const skippedToday = () => { try { return localStorage.getItem(SKIP_KEY + todayISO()) === '1'; } catch { return false; } };
const shortTime = (t: string) => t ? t.replace(/^0/, '') : '';

function Faces({ set: faces, label, picked, onPick }: { set: [string, string][]; label: string; picked?: number | null; onPick: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="mood-row">
      {faces.map(([face, word], i) => (
        <button key={word} type="button" role="radio" aria-checked={picked === i + 1} className="mood-btn" onClick={() => onPick(i + 1)} aria-label={word}>
          <span className="mood-face" aria-hidden="true">{face}</span>
          <span className="mood-word" aria-hidden="true">{word}</span>
        </button>
      ))}
    </div>
  );
}

/** The light way to take part: "how do you arrive?" and "how did it end?", one tap each. A score is optional, never asked for.
 *  On Home it's the first thing you see; in Grupo → Hoy it sits above the board. */
export function CheckinCard({ where }: { where: 'home' | 'group' }) {
  const cloud = useCloud();
  const { data, set, flash } = useStore();
  const [skip, setSkip] = useState(skippedToday);
  // Your usual class from the profile, else this hour.
  const [time, setTime] = useState(() => data.classTime || `${String(new Date().getHours()).padStart(2, '0')}:00`);
  const [changing, setChanging] = useState(false);
  if (!cloud.group || !cloud.checkinsOn) return null;
  const mine = cloud.checkins.find(c => c.user_id === cloud.userId);

  const arrive = async (mood: number) => {
    const err = await cloud.checkIn(time, mood);
    if (err) { flash('No se guardó', err); return; }
    // Coming to class is training: today is ticked in the week.
    set(d => ({ done: d.done.map((x, i) => x || i === todayIndex()) }));
    try { localStorage.removeItem(SKIP_KEY + todayISO()); } catch { /* private mode */ }
    setSkip(false);
  };
  const leave = async (mood: number) => {
    const err = await cloud.checkOut(mood);
    if (err) flash('No se guardó', err); else setChanging(false);
  };
  const noClass = () => { try { localStorage.setItem(SKIP_KEY + todayISO(), '1'); } catch { /* private mode */ } setSkip(true); };
  const toScore = () => {
    if (where === 'home') set(() => ({ screen: 'gr' }));
    else document.getElementById('wod-score')?.focus();
  };

  if (!mine && skip) {
    return where === 'group'
      ? <p className="note">Hoy no vas a clase. <button className="link-btn" onClick={() => { try { localStorage.removeItem(SKIP_KEY + todayISO()); } catch { /* */ } setSkip(false); }}>Sí voy</button></p>
      : null;
  }

  if (!mine) {
    return (
      <section className="checkin" aria-labelledby={`ci-${where}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <h2 id={`ci-${where}`} className="checkin-title">¿Cómo llegas hoy?</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            Clase
            <input className="input checkin-time" type="time" value={time} onChange={e => setTime(e.target.value)} aria-label="Hora de tu clase" />
          </label>
        </div>
        <Faces set={MOOD_IN} label="¿Cómo llegas hoy?" onPick={arrive} />
        <button className="link-btn" style={{ alignSelf: 'center' }} onClick={noClass}>Hoy no voy</button>
      </section>
    );
  }

  const [inFace, inWord] = MOOD_IN[mine.mood_in - 1];
  const asking = mine.mood_out == null || changing;
  return (
    <section className="checkin" aria-labelledby={`ci-${where}`}>
      <p id={`ci-${where}`} className="checkin-title" style={{ fontSize: 18 }}>
        Llegaste <span aria-hidden="true">{inFace}</span> {inWord.toLowerCase()}{mine.class_time ? ` a la de las ${shortTime(mine.class_time)}` : ''}
        {mine.mood_out != null && !changing && <> · terminaste <span aria-hidden="true">{MOOD_OUT[mine.mood_out - 1][0]}</span> {MOOD_OUT[mine.mood_out - 1][1].toLowerCase()}</>}
      </p>
      {asking && <>
        <span className="field-label">¿Cómo terminaste?</span>
        <Faces set={MOOD_OUT} label="¿Cómo terminaste?" picked={mine.mood_out} onPick={leave} />
      </>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        {cloud.wod && !cloud.wod.scores.some(s => s.user_id === cloud.userId)
          ? <button className="btn btn-secondary" onClick={toScore} style={{ minHeight: 44 }}>Anotar mi resultado (opcional)</button>
          : <span />}
        <div style={{ display: 'flex', gap: 4 }}>
          {mine.mood_out != null && !changing && <button className="link-btn" onClick={() => setChanging(true)}>Cambiar</button>}
          <button className="link-btn" onClick={cloud.undoCheckin}>No fui</button>
        </div>
      </div>
    </section>
  );
}

/** "Hoy vinieron": who came, by class, with how they arrived and left. */
export function TodayAttendance({ nameOf, colorOf }: { nameOf: (id: string) => string; colorOf: (id: string) => string }) {
  const cloud = useCloud();
  if (!cloud.checkinsOn || cloud.checkins.length === 0) return null;
  const byClass = new Map<string, Checkin[]>();
  for (const c of cloud.checkins) byClass.set(c.class_time, [...(byClass.get(c.class_time) ?? []), c]);
  return (
    <section className="stack-3" aria-labelledby="came-h">
      <h3 id="came-h" className="label-600" style={{ margin: 0 }}>Hoy vinieron {cloud.checkins.length}</h3>
      {[...byClass.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([time, list]) => (
        <div key={time} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {time && <span className="muted-13">Clase de las {shortTime(time)}</span>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {list.map(c => {
              const name = c.user_id === cloud.userId ? 'Tú' : nameOf(c.user_id);
              const moods = `${MOOD_IN[c.mood_in - 1][0]}${c.mood_out ? ` → ${MOOD_OUT[c.mood_out - 1][0]}` : ''}`;
              return (
                <span key={c.user_id} className="came-chip"
                  aria-label={`${name}: llegó ${MOOD_IN[c.mood_in - 1][1].toLowerCase()}${c.mood_out ? `, terminó ${MOOD_OUT[c.mood_out - 1][1].toLowerCase()}` : ''}`}>
                  <span className="came-dot" style={{ background: colorOf(c.user_id) }} aria-hidden="true">{initialOf(name)}</span>
                  <span aria-hidden="true">{name.split(' ')[0]}</span>
                  <span aria-hidden="true">{moods}</span>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
