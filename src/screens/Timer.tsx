import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { useCloud } from '../cloud';
import { joinRounds } from '../format';
import { useStore } from '../store';

type Mode = 'fortime' | 'amrap' | 'emom' | 'tabata';
type Phase = 'setup' | 'countdown' | 'running' | 'paused' | 'done';
type Sound = 'voice' | 'beeps' | 'off';

const MODES: [Mode, string][] = [['fortime', 'For Time'], ['amrap', 'AMRAP'], ['emom', 'EMOM'], ['tabata', 'Tabata']];
const LEAD_IN = 10; // seconds of "get ready" before the clock starts

/** Where the timer was opened from, to go back there. */
let returnTo: 'home' | 'gr' = 'home';
export const openTimerFrom = (from: 'home' | 'gr') => { returnTo = from; };

const mmss = (s: number) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const mmssUp = (s: number) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** Beeps through Web Audio (unlocked on the Start tap, which iOS requires) and Spanish voice through speech synthesis. */
function useCues(sound: Sound) {
  const ctx = useRef<AudioContext | null>(null);
  const unlock = () => {
    try { ctx.current ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); ctx.current.resume(); } catch { /* no audio */ }
  };
  const beep = (freq = 880, ms = 160) => {
    if (sound === 'off' || !ctx.current) return;
    const c = ctx.current, o = c.createOscillator(), g = c.createGain();
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + ms / 1000);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + ms / 1000 + 0.02);
    navigator.vibrate?.(ms > 300 ? 400 : 60);
  };
  const say = (text: string) => {
    if (sound !== 'voice' || typeof speechSynthesis === 'undefined') return;
    const u = new SpeechSynthesisUtterance(text); u.lang = 'es-ES'; u.rate = 1.05;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  };
  return { unlock, beep, say };
}

/** Keeps the phone's screen on while a workout runs. */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const get = () => navigator.wakeLock.request('screen').then(l => { lock = l; }).catch(() => { /* denied or unsupported */ });
    get();
    const onVis = () => { if (document.visibilityState === 'visible') get(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => {}); };
  }, [on]);
}

export function Timer() {
  const { data, set, fmt, flash } = useStore();
  const cloud = useCloud();
  const wod = cloud.wodBoard ? cloud.wod : null;

  // Set up from today's WOD when there is one: "AMRAP 12′" opens as a 12-minute AMRAP, a timed WOD as For Time.
  const fromWod = (() => {
    if (!wod) return null;
    const text = `${wod.title} ${wod.description}`;
    const min = Number(text.match(/(\d{1,2})\s*(?:′|'|’|min)/i)?.[1] ?? 0);
    if (/emom/i.test(text)) return { mode: 'emom' as Mode, minutes: min || 10 };
    if (/tabata/i.test(text)) return { mode: 'tabata' as Mode, minutes: 0 };
    if (wod.score_type === 'reps' || /amrap/i.test(text)) return { mode: 'amrap' as Mode, minutes: min || 12 };
    return { mode: 'fortime' as Mode, minutes: min };
  })();

  const [mode, setMode] = useState<Mode>(fromWod?.mode ?? 'fortime');
  const [minutes, setMinutes] = useState(fromWod?.minutes ?? 0);
  const [work, setWork] = useState(20);
  const [rest, setRest] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [sound, setSound] = useState<Sound>('voice');
  const [phase, setPhase] = useState<Phase>('setup');
  const [now, setNow] = useState(Date.now());
  const [laps, setLaps] = useState(0);        // AMRAP rounds counted
  const [extraReps, setExtraReps] = useState('');
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [capped, setCapped] = useState(false);
  const [saving, setSaving] = useState(false);
  const t = useRef({ startAt: 0, pausedAt: 0, pausedTotal: 0, leadAt: 0 });
  const fired = useRef(new Set<string>());
  const cues = useCues(sound);
  useWakeLock(phase === 'countdown' || phase === 'running');

  // The clock reads the real time on every tick, so a phone locked mid-WOD still shows the right time on return.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'running') return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [phase]);

  const total = mode === 'tabata' ? rounds * (work + rest) - rest : mode === 'fortime' ? minutes * 60 : minutes * 60;
  const elapsed = phase === 'running' ? (now - t.current.startAt - t.current.pausedTotal) / 1000
    : phase === 'paused' ? (t.current.pausedAt - t.current.startAt - t.current.pausedTotal) / 1000 : 0;
  const lead = phase === 'countdown' ? LEAD_IN - (now - t.current.leadAt) / 1000 : 0;

  const once = (key: string, fn: () => void) => { if (!fired.current.has(key)) { fired.current.add(key); fn(); } };
  const finish = (opts: { capped?: boolean; time?: number } = {}) => {
    setPhase('done'); setCapped(!!opts.capped); setFinalTime(opts.time ?? null);
    cues.beep(660, 700); cues.say(opts.capped ? 'Tiempo. Se acabó el tope.' : '¡Tiempo!');
  };

  // Lead-in: 3, 2, 1, go.
  useEffect(() => {
    if (phase !== 'countdown') return;
    for (const s of [3, 2, 1]) if (lead <= s && lead > s - 1) once(`lead${s}`, () => { cues.beep(880, 150); cues.say(String(s)); });
    if (lead <= 0) once('go', () => {
      cues.beep(1320, 450); cues.say('¡Vamos!');
      t.current.startAt = Date.now(); t.current.pausedTotal = 0;
      setPhase('running');
    });
  });

  // Cues while it runs, and the end.
  useEffect(() => {
    if (phase !== 'running') return;
    const left = total - elapsed;
    if (mode === 'fortime') {
      if (total > 0) {
        if (left <= 60 && total > 60) once('last-min', () => cues.say('Último minuto'));
        for (const s of [3, 2, 1]) if (left <= s && left > s - 1) once(`end${s}`, () => cues.beep(880, 120));
        if (left <= 0) finish({ capped: true });
      }
    } else if (mode === 'amrap') {
      if (left <= 60 && total > 60) once('last-min', () => cues.say('Último minuto'));
      for (const s of [3, 2, 1]) if (left <= s && left > s - 1) once(`end${s}`, () => cues.beep(880, 120));
      if (left <= 0) finish();
    } else if (mode === 'emom') {
      const m = Math.floor(elapsed / 60) + 1, inMin = 60 - (elapsed % 60);
      if (m > 1 && m <= minutes) once(`min${m}`, () => { cues.beep(1320, 300); cues.say(m === minutes ? 'Último minuto' : `Minuto ${m}`); });
      for (const s of [3, 2, 1]) if (inMin <= s && inMin > s - 1 && m < minutes) once(`m${m}s${s}`, () => cues.beep(880, 100));
      if (left <= 0) finish();
    } else {
      const cycle = work + rest, i = Math.floor(elapsed / cycle), into = elapsed % cycle;
      const working = into < work, segLeft = working ? work - into : cycle - into;
      if (i < rounds) once(`r${i}${working ? 'w' : 'r'}`, () => { cues.beep(working ? 1320 : 520, 300); if (i > 0 || !working) cues.say(working ? `Ronda ${i + 1}` : 'Descanso'); });
      for (const s of [3, 2, 1]) if (segLeft <= s && segLeft > s - 1 && left > 1) once(`r${i}${working ? 'w' : 'r'}${s}`, () => cues.beep(880, 100));
      if (left <= 0) finish();
    }
  });

  const start = () => {
    cues.unlock(); cues.say('Prepárate');
    fired.current = new Set(); setLaps(0); setExtraReps(''); setFinalTime(null); setCapped(false);
    t.current = { startAt: 0, pausedAt: 0, pausedTotal: 0, leadAt: Date.now() };
    setNow(Date.now()); setPhase('countdown');
  };
  const pause = () => { t.current.pausedAt = Date.now(); setPhase('paused'); window.speechSynthesis?.cancel(); };
  const resume = () => { t.current.pausedTotal += Date.now() - t.current.pausedAt; setNow(Date.now()); setPhase('running'); };
  const leave = () => { window.speechSynthesis?.cancel(); set(() => ({ screen: returnTo })); };

  // ── What the big display says ──
  let big = '', top = '', sub = '';
  if (phase === 'countdown') { big = String(Math.max(1, Math.ceil(lead))); top = 'Prepárate'; sub = MODES.find(m => m[0] === mode)![1]; }
  else if (phase === 'running' || phase === 'paused') {
    if (mode === 'fortime') { big = mmssUp(elapsed); top = 'For Time'; sub = total ? `Tope ${mmss(total)}` : 'Sin tope'; }
    else if (mode === 'amrap') { big = mmss(total - elapsed); top = 'Quedan'; sub = `AMRAP ${minutes}′`; }
    else if (mode === 'emom') { big = mmss(60 - (elapsed % 60)); top = `EMOM ${minutes}′`; sub = `Minuto ${Math.min(minutes, Math.floor(elapsed / 60) + 1)} de ${minutes}`; }
    else {
      const cycle = work + rest, i = Math.floor(elapsed / cycle), into = elapsed % cycle, working = into < work;
      big = mmss(working ? work - into : cycle - into); top = working ? 'Trabajo' : 'Descanso'; sub = `Ronda ${Math.min(rounds, i + 1)} de ${rounds}`;
    }
  }
  const restNow = mode === 'tabata' && (phase === 'running' || phase === 'paused') && (elapsed % (work + rest)) >= work;
  const progress = phase === 'running' || phase === 'paused' ? (total > 0 ? Math.min(1, elapsed / total) : 0) : 0;

  // ── Result → the group's board, when today's WOD is scored the same way ──
  const amrapScore = mode === 'amrap' ? joinRounds(laps, Math.min(999, Number(extraReps || 0))) : null;
  const result = mode === 'fortime' && finalTime != null ? finalTime : amrapScore;
  const boardFits = !!wod && cloud.group && result != null && result > 0 &&
    ((mode === 'fortime' && wod.score_type === 'time' && !capped) || (mode === 'amrap' && wod.score_type === 'reps'));
  const toBoard = async () => {
    if (!boardFits || result == null) return;
    setSaving(true);
    const err = await cloud.saveScore({ value: result, scaled: data.level === 'Escalado', note: '' });
    setSaving(false);
    if (err) { flash('No se anotó', err); return; }
    flash('Resultado en la pizarra', `${wod!.title}: ${mode === 'fortime' ? mmssUp(result) : fmt.val({ type: 'reps' }, result)}`);
    returnTo = 'gr'; leave();
  };

  const stepper = (label: string, value: number, setV: (n: number) => void, opts: { min: number; max: number; step: number; show: (n: number) => string }) => (
    <div className="timer-field">
      <span className="field-label">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="stepper-btn stepper-minus" aria-label={`${label}: menos`} onClick={() => setV(Math.max(opts.min, value - opts.step))}><Icon name="minus" size={20} /></button>
        <span aria-live="polite" style={{ fontFamily: 'var(--font-heading)', fontSize: 30, minWidth: 92, textAlign: 'center' }}>{opts.show(value)}</span>
        <button className="stepper-btn stepper-plus" aria-label={`${label}: más`} onClick={() => setV(Math.min(opts.max, value + opts.step))}><Icon name="plus" size={20} /></button>
      </div>
    </div>
  );

  if (phase === 'setup') {
    return (
      <div className="screen" data-screen-label="08 Cronómetro" style={{ paddingBottom: 'calc(40px + var(--bottom))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="round-btn" onClick={leave} aria-label="Volver"><Icon name="chevronLeft" size={20} /></button>
          <h1 className="title" style={{ fontSize: 30 }}>Cronómetro</h1>
        </div>
        {wod && (
          <div className="surface" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
            <span className="icon-badge" aria-hidden="true"><Icon name="board" size={20} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="label-600" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wod.title}</div>
              <span className="muted-13">WOD de hoy · {wod.score_type === 'time' ? 'por tiempo' : wod.score_type === 'reps' ? 'reps o rondas' : 'peso'}</span>
            </div>
          </div>
        )}
        <Segmented label="Tipo de WOD" size="lg" value={mode} onChange={m => {
          // Each mode starts from its own sensible minutes (or today's WOD), not the last mode's: an AMRAP's 12 isn't a cap.
          setMode(m);
          setMinutes(fromWod?.mode === m ? fromWod.minutes : m === 'amrap' ? 12 : m === 'emom' ? 10 : 0);
        }} options={MODES} />
        <p className="note">
          {mode === 'fortime' && 'Corre hacia arriba hasta que toques ¡Terminé! Con tope, se corta solo.'}
          {mode === 'amrap' && 'Cuenta regresiva. Toca +1 ronda cada vez que cierres una.'}
          {mode === 'emom' && 'Un pitido al empezar cada minuto.'}
          {mode === 'tabata' && 'Trabajo y descanso alternados, con aviso en cada cambio.'}
        </p>
        {mode === 'fortime' && stepper('Tope de tiempo', minutes, setMinutes, { min: 0, max: 90, step: 1, show: n => n ? `${n} min` : 'Sin tope' })}
        {(mode === 'amrap' || mode === 'emom') && stepper('Minutos', minutes || 1, setMinutes, { min: 1, max: 90, step: 1, show: n => `${n} min` })}
        {mode === 'tabata' && <>
          {stepper('Trabajo', work, setWork, { min: 5, max: 120, step: 5, show: n => `${n} s` })}
          {stepper('Descanso', rest, setRest, { min: 5, max: 120, step: 5, show: n => `${n} s` })}
          {stepper('Rondas', rounds, setRounds, { min: 1, max: 30, step: 1, show: n => String(n) })}
        </>}
        <div className="timer-field">
          <span className="field-label">Avisos</span>
          <Segmented label="Avisos" value={sound} onChange={setSound} options={[['voice', 'Voz y pitidos'], ['beeps', 'Solo pitidos'], ['off', 'Silencio']]} />
        </div>
        <button className="btn btn-primary btn-block" onClick={start} style={{ height: 60, fontSize: 19 }}>Empezar</button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="timer-run" data-screen-label="08 Cronómetro · Fin">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <span className="timer-top">{capped ? 'Se acabó el tope' : '¡Tiempo!'}</span>
          {mode === 'fortime' && !capped && finalTime != null && <span className="timer-big">{mmssUp(finalTime)}</span>}
          {mode === 'amrap' && <>
            <span className="timer-big">{laps}</span>
            <span className="timer-sub">{laps === 1 ? 'ronda' : 'rondas'} completas</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
              + <input className="input" inputMode="numeric" value={extraReps} onChange={e => setExtraReps(e.target.value.replace(/\D/g, ''))} placeholder="0"
                style={{ width: 84, height: 48, textAlign: 'center', fontSize: 20 }} aria-label="Reps extra de la última ronda" /> reps extra
            </label>
          </>}
          {(mode === 'emom' || mode === 'tabata') && <span className="timer-sub">{mode === 'emom' ? `${minutes} minutos` : `${rounds} rondas`} completados. ¡Bien!</span>}
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {boardFits && <button className="btn btn-primary btn-block" disabled={saving} onClick={toBoard} style={{ height: 58, fontSize: 18 }}>{saving ? 'Anotando…' : 'Anotar en la pizarra'}</button>}
          <button className="btn btn-block timer-ghost" onClick={() => setPhase('setup')} style={{ height: 52 }}>Otro cronómetro</button>
          <button className="btn btn-block timer-ghost" onClick={leave} style={{ height: 52 }}>Salir</button>
        </div>
      </div>
    );
  }

  return (
    <div className="timer-run" data-rest={restNow || undefined} data-screen-label="08 Cronómetro · Corriendo">
      <div className="timer-track" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="round-btn timer-round" onClick={leave} aria-label="Salir del cronómetro"><Icon name="x" size={18} /></button>
        <span className="timer-sub" aria-live="polite">{sub}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <span className="timer-top">{phase === 'paused' ? 'En pausa' : top}</span>
        <span className="timer-big" role="timer" aria-live="off">{big}</span>
        {mode === 'amrap' && phase !== 'countdown' && <span className="timer-sub">{laps} {laps === 1 ? 'ronda' : 'rondas'}</span>}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {mode === 'amrap' && phase !== 'countdown' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn timer-ghost" onClick={() => setLaps(l => Math.max(0, l - 1))} style={{ height: 72, width: 72, flex: 'none', fontSize: 22 }} aria-label="Quitar una ronda">−1</button>
            <button className="btn btn-primary" onClick={() => { setLaps(l => l + 1); cues.beep(1100, 80); }} style={{ height: 72, flex: 1, fontSize: 22 }}>+1 ronda</button>
          </div>
        )}
        {mode === 'fortime' && phase !== 'countdown' && (
          <button className="btn btn-primary btn-block" onClick={() => finish({ time: elapsed })} style={{ height: 72, fontSize: 22 }}>¡Terminé!</button>
        )}
        {phase !== 'countdown' && (
          <button className="btn btn-block timer-ghost" onClick={phase === 'paused' ? resume : pause} style={{ height: 52 }}>{phase === 'paused' ? 'Seguir' : 'Pausa'}</button>
        )}
      </div>
    </div>
  );
}
