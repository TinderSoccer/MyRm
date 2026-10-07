import type { LogEntry, Pr, PrType } from './data';

const LB = 2.2046;
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Anything with a type and (optionally) a custom rep label — a Pr or a feed item. */
type Measured = { type?: PrType; unitLabel?: string; better?: 'up' | 'down' };

export const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayISO = () => isoOf(new Date());
export const yesterdayISO = () => { const d = new Date(); d.setDate(d.getDate() - 1); return isoOf(d); };
export const shortDate = (iso: string) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };
export const longToday = () => { const d = new Date(); return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`; };
/** ISO date of this week's Monday. */
export const weekStartISO = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return isoOf(d); };

/** Weights marked `unitLabel: 'kg'` (kettlebells, dumbbells) stay in kilos even when the bar is loaded in pounds. */
export const fixedKg = (p: Measured) => p.type === 'kg' && p.unitLabel === 'kg';

/** AMRAP scores are rounds + reps, kept as one sortable number: 5 rounds + 12 reps = 5.012 (reps under 1000). */
const ROUND = 1000;
/** Whole rounds and the extra reps of a rounds + reps score. */
export const splitRounds = (v: number) => { const r = Math.floor(v + 1e-9); return [r, Math.round((v - r) * ROUND)] as const; };
export const joinRounds = (rounds: number, reps: number) => rounds + Math.min(Math.max(reps, 0), ROUND - 1) / ROUND;
const fmtReps = (v: number) => { const [r, extra] = splitRounds(v); return extra ? `${r}+${extra}` : String(r); };

/** `lb`: the bar is loaded in pounds. Everything is stored in kg; only what is shown changes. */
export function makeFormat(lb: boolean) {
  // Only bar weights change unit; reps, rounds and times never do.
  const inLb = (p: Measured) => lb && p.type === 'kg' && !fixedKg(p);
  const fmtKg = (kg: number) => kg % 1 ? kg.toFixed(1).replace('.', ',') : String(kg);
  const fmtW = (p: Measured, kg: number) => inLb(p) ? String(Math.round(kg * LB)) : fmtKg(kg);
  const fmtT = (sec: number) => {
    sec = Math.round(sec);
    const hh = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), ss = String(sec % 60).padStart(2, '0');
    return hh ? `${hh}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  };
  const fmtD = (sec: number) => { sec = Math.round(Math.abs(sec)); return sec < 60 ? `${sec} s` : fmtT(sec); };
  const val = (p: Measured, v: number) => p.type === 'kg' ? fmtW(p, v) : p.type === 'time' ? fmtT(v) : fmtReps(v);
  const unitOf = (p: Measured) => p.type === 'kg' ? (inLb(p) ? 'lb' : 'kg') : p.type === 'reps' ? (p.unitLabel || 'reps') : '';
  const gain = (p: Measured, a: number, b: number) => (p.better === 'down' ? a - b : b - a);
  /** How much better `to` is than `from`, in the mark's own terms ("+5 kg", "−0:12", "+3 reps", "+1 ronda"). */
  const gainTxt = (p: Measured, from: number, to: number) => {
    const g = gain(p, from, to);
    if (p.type === 'kg') return `+${fmtW(p, g)} ${unitOf(p)}`;
    if (p.type === 'time') return p.better === 'down' ? `−${fmtD(g)}` : `+${fmtD(g)}`;
    const [ra, ea] = splitRounds(from), [rb, eb] = splitRounds(to);
    if (!ea && !eb) return `+${Math.round(g)} ${unitOf(p)}`;
    // Rounds + reps can't be subtracted as numbers: same round → the extra reps; otherwise the rounds gained.
    if (ra === rb) return `+${eb - ea} reps`;
    return `+${rb - ra} ${rb - ra === 1 ? 'ronda' : 'rondas'}`;
  };
  const stepOf = (p: Pr) => p.type === 'kg' ? (fixedKg(p) ? 2 : lb ? 5 / LB : 2.5) : p.type === 'reps' ? 1 : ((p.hist[p.hist.length - 1] ?? 0) > 1800 ? 30 : 5);
  /** Parses what the user typed into the value field; weights come back in kg. */
  const parse = (p: Pr, raw: string): number | null => {
    const t = String(raw).trim().replace(',', '.');
    if (!t) return null;
    if (p.type === 'time') {
      const parts = t.split(':').map(Number);
      if (parts.some(isNaN)) return null;
      return parts.reduce((a, x) => a * 60 + x, 0);
    }
    // "18+5": 18 rounds and 5 reps.
    const rr = p.type === 'reps' ? t.match(/^(\d+)\s*\+\s*(\d+)$/) : null;
    if (rr) return Number(rr[2]) < ROUND ? Number(rr[1]) + Number(rr[2]) / ROUND : null;
    const n = Number(t);
    if (isNaN(n)) return null;
    return inLb(p) ? n / LB : n;
  };
  /** True when two kg values print the same in pounds (so lb rounding never fakes a PR). */
  const sameShown = (p: Measured, a: number, b: number) => inLb(p) && Math.abs(Math.round(a * LB) - Math.round(b * LB)) < 1;
  /** The stepper's next value. Bar weights move on the plate grid of the unit you load in (5 lb or 2.5 kg; bells 2 kg),
   *  snapping odd values like 220.5 lb to 225 instead of walking 220.5 → 225.5. */
  const nudge = (p: Pr, v: number, dir: 1 | -1) => {
    if (p.type !== 'kg') return Math.max(0, v + dir * stepOf(p));
    const perUnit = inLb(p) ? 1 / LB : 1;
    const grid = fixedKg(p) ? 2 : inLb(p) ? 5 : 2.5;
    const shown = v / perUnit;
    const next = dir > 0 ? Math.floor(shown / grid + 1e-6) * grid + grid : Math.ceil(shown / grid - 1e-6) * grid - grid;
    return Math.max(0, next * perUnit);
  };
  /** Where a mark with no history starts: an empty-ish bar in your unit, a mid bell, five minutes, ten reps. */
  const startOf = (p: Pr) => p.type === 'kg' ? (fixedKg(p) ? 16 : inLb(p) ? 95 / LB : 40) : p.type === 'time' ? 300 : 10;
  return { fmtD, val, unitOf, gain, gainTxt, stepOf, parse, sameShown, nudge, startOf };
}

export type BarSize = 'big' | 'small';

/** Bumpers by bar unit (the heaviest can repeat, the rest one each per side); change plates are kilos, one of each. */
const PLATES = { lb: [45, 35, 25, 15, 10], kg: [20, 15, 10, 5] };
const SMALL_KG = [2.5, 2, 1.5, 1, 0.5];
/** Each extra plate on a side costs as much as being this many kg off: a box loads fewer plates over hitting it exactly. */
const PLATE_COST = 0.3;

const subsets = <T,>(xs: T[]) => Array.from({ length: 1 << xs.length }, (_, m) => xs.filter((_, i) => m & (1 << i)));

export interface BarLoad { totalKg: number; bar: string; big: string[]; small: string[] }

/** How to load a bar for a target weight: bumpers in the bar's unit plus kilo change plates, close to the target with few plates. */
export function barLoad(targetKg: number, lb: boolean, size: BarSize): BarLoad {
  const unitKg = lb ? 1 / LB : 1;
  const barKg = (lb ? (size === 'big' ? 45 : 35) : (size === 'big' ? 20 : 15)) * unitKg;
  const side = Math.max(0, (targetKg - barKg) / 2);
  const [top, ...rest] = PLATES[lb ? 'lb' : 'kg'];
  const smalls = subsets(SMALL_KG).map(xs => ({ xs, kg: xs.reduce((a, x) => a + x, 0) }));
  let best = { big: [] as number[], small: [] as number[], kg: 0, score: side };
  for (let n = 0; n <= Math.floor(side / (top * unitKg)) + 1; n++) {
    for (const mid of subsets(rest)) {
      const big = [...Array(n).fill(top), ...mid];
      const bigKg = big.reduce((a, x) => a + x * unitKg, 0);
      if (bigKg > side + 2) continue;
      for (const sm of smalls) {
        const kg = bigKg + sm.kg;
        const score = Math.abs(side - kg) + PLATE_COST * (big.length + sm.xs.length);
        if (score < best.score - 0.001) best = { big, small: sm.xs, kg, score };
      }
    }
  }
  const n = (x: number) => String(x).replace('.', ',');
  return { totalKg: barKg + 2 * best.kg, bar: lb ? `${size === 'big' ? 45 : 35} lb` : `${size === 'big' ? 20 : 15} kg`, big: best.big.map(n), small: best.small.map(n) };
}

export type Format = ReturnType<typeof makeFormat>;

const SEED_DATES = ['12 may', '16 jun', '14 jul', '18 ago'];

/** Full history of a mark; seeded marks only carry `hist`, so a log is derived from it. */
export function logOf(p: Pr): LogEntry[] {
  if (p.log) return p.log;
  return p.hist.map((v, i) => ({
    v,
    date: i === p.hist.length - 1 ? p.date : SEED_DATES[i],
    scheme: p.type === 'kg' ? '1RM' : null,
    mode: 'RX',
    note: i === p.hist.length - 1 ? 'Salió limpio, con cinturón.' : ''
  }));
}

export const isScaled = (e: LogEntry) => e.mode === 'Escalado';

/** Best of one scheme, RX and scaled kept apart: a scaled Fran never beats an RX one. */
export function bestOf(p: Pr, scheme: string | null, scaled = false): number | null {
  const vs = entriesOf(p, scheme, scaled).map(e => e.v);
  if (!vs.length) return null;
  return p.better === 'down' ? Math.min(...vs) : Math.max(...vs);
}

export function currentOf(p: Pr): number {
  return p.hist.length ? p.hist[p.hist.length - 1] : (p.type === 'kg' ? 40 : p.type === 'time' ? 300 : 10);
}

export const initialOf = (name: string, fallback = '?') => ((name || '').trim()[0] || fallback).toUpperCase();

/** The scheme a mark is judged by: 1RM for weights (or the latest scheme if there's no 1RM yet), none otherwise. */
export function mainSchemeOf(p: Pr): string | null {
  if (p.type !== 'kg') return null;
  const log = logOf(p);
  if (!log.length || log.some(e => e.scheme === '1RM')) return '1RM';
  return log[log.length - 1].scheme ?? '1RM';
}

/** The 1RM that percentages are worked from: the real one, or else estimated (Epley) from the best 3RM/5RM/10RM. */
export function oneRepMaxOf(p: Pr): { kg: number; estimated: boolean } | null {
  if (p.type !== 'kg') return null;
  const real = bestOf(p, '1RM') ?? bestOf(p, '1RM', true);
  if (real != null) return { kg: real, estimated: false };
  const est = logOf(p).map(e => { const n = parseInt(e.scheme ?? '', 10); return n > 1 ? e.v * (1 + n / 30) : 0; });
  const kg = Math.max(0, ...est);
  return kg > 0 ? { kg, estimated: true } : null;
}

/** Entries of one scheme, in the order they were logged. */
export const entriesOf = (p: Pr, scheme: string | null, scaled = false) =>
  logOf(p).filter(e => (e.scheme || null) === (scheme || null) && isScaled(e) === scaled);

/** Which record a mark shows: the RX one, or the scaled one while there are only scaled attempts. */
export const recordIsScaled = (p: Pr, scheme: string | null) => !entriesOf(p, scheme).length && entriesOf(p, scheme, true).length > 0;

/** Recomputes the derived fields (mini-chart history, last date) after the log changes.
 *  The log is kept in date order, so a mark entered late for an earlier day lands in its place.
 *  Undated (older) entries sort first and keep their logged order; the sort is stable. */
export function withLog(p: Pr, entries: LogEntry[]): Pr {
  const log = [...entries].sort((a, b) => (a.iso ?? '').localeCompare(b.iso ?? ''));
  const main = log.filter(e => (e.scheme || null) === (p.type === 'kg' ? '1RM' : null));
  return { ...p, log, hist: main.slice(-5).map(e => e.v), date: main.length ? main[main.length - 1].date : '—' };
}

/** "Ahora", "Hace 5 min", "Hace 3 h", "Ayer", "Hace 4 días", then a short date. */
export function timeAgo(ts: number) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return shortDate(isoOf(new Date(ts)));
}

/** Index (Mon=0..Sun=6) of a date inside the week starting at weekStart, or -1 when it falls outside. */
export function weekIndexOf(iso: string, weekStart: string) {
  const days = Math.round((new Date(iso + 'T12:00').getTime() - new Date(weekStart + 'T12:00').getTime()) / 86400000);
  return days >= 0 && days < 7 ? days : -1;
}

export const todayIndex = () => (new Date().getDay() + 6) % 7;

const WEEKDAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const atNoon = (iso: string) => new Date(iso + 'T12:00');
export const monthShort = (iso: string) => MONTHS[atNoon(iso).getMonth()];
export const dayOfMonth = (iso: string) => atNoon(iso).getDate();
/** "sábado 10 de octubre" */
export const longDate = (iso: string) => { const d = atNoon(iso); return `${WEEKDAYS[d.getDay()].toLowerCase()} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`; };

/** Whole days from today to a date (negative when past). */
export const daysUntil = (iso: string) => Math.round((atNoon(iso).getTime() - atNoon(todayISO()).getTime()) / 86400000);

/** Next time a MM-DD birthday comes around, today included. */
export function nextBirthdayISO(md: string) {
  const year = new Date().getFullYear();
  const thisYear = `${year}-${md}`;
  return daysUntil(thisYear) >= 0 ? thisYear : `${year + 1}-${md}`;
}

/** "Hoy", "Mañana", "En 3 días", then "sáb 24 oct". */
export function countdown(iso: string) {
  const n = daysUntil(iso);
  if (n === 0) return 'Hoy';
  if (n === 1) return 'Mañana';
  if (n < 7) return `En ${n} días`;
  const d = atNoon(iso);
  return `${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
