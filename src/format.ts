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

export function makeFormat(lb: boolean) {
  const wu = lb ? 'lb' : 'kg';
  const fmtKg = (kg: number) => lb ? String(Math.round(kg * LB)) : (kg % 1 ? kg.toFixed(1).replace('.', ',') : String(kg));
  const fmtT = (sec: number) => {
    sec = Math.round(sec);
    const hh = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), ss = String(sec % 60).padStart(2, '0');
    return hh ? `${hh}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  };
  const fmtD = (sec: number) => { sec = Math.round(Math.abs(sec)); return sec < 60 ? `${sec} s` : fmtT(sec); };
  const val = (p: Measured, v: number) => p.type === 'kg' ? fmtKg(v) : p.type === 'time' ? fmtT(v) : String(Math.round(v));
  const unitOf = (p: Measured) => p.type === 'kg' ? wu : p.type === 'reps' ? (p.unitLabel || 'reps') : '';
  const gain = (p: Measured, a: number, b: number) => (p.better === 'down' ? a - b : b - a);
  const gainTxt = (p: Measured, g: number) =>
    p.type === 'kg' ? `+${fmtKg(g)} ${wu}` : p.type === 'reps' ? `+${Math.round(g)} ${unitOf(p)}` : (p.better === 'down' ? `−${fmtD(g)}` : `+${fmtD(g)}`);
  const stepOf = (p: Pr) => p.type === 'kg' ? (lb ? 5 / LB : 2.5) : p.type === 'reps' ? 1 : ((p.hist[p.hist.length - 1] ?? 0) > 1800 ? 30 : 5);
  /** Parses what the user typed into the value field; weights come back in kg. */
  const parse = (p: Pr, raw: string): number | null => {
    const t = String(raw).trim().replace(',', '.');
    if (!t) return null;
    if (p.type === 'time') {
      const parts = t.split(':').map(Number);
      if (parts.some(isNaN)) return null;
      return parts.reduce((a, x) => a * 60 + x, 0);
    }
    const n = Number(t);
    if (isNaN(n)) return null;
    return p.type === 'kg' && lb ? n / LB : n;
  };
  /** True when two kg values print the same in the current unit (so lb rounding never fakes a PR). */
  const sameShown = (a: number, b: number) => lb && Math.abs(Math.round(a * LB) - Math.round(b * LB)) < 1;
  return { wu, fmtD, val, unitOf, gain, gainTxt, stepOf, parse, sameShown };
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

export function bestOf(p: Pr, scheme: string | null): number | null {
  const vs = logOf(p).filter(e => (e.scheme || null) === (scheme || null)).map(e => e.v);
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

/** Entries of one scheme, in the order they were logged. */
export const entriesOf = (p: Pr, scheme: string | null) => logOf(p).filter(e => (e.scheme || null) === (scheme || null));

/** Recomputes the derived fields (mini-chart history, last date) after the log changes. */
export function withLog(p: Pr, log: LogEntry[]): Pr {
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
