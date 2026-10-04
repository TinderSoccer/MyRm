import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DISCS, seedData, type AppData, type DiscId } from './data';
import { makeFormat, weekStartISO, type Format } from './format';
import { fireDueReminders } from './reminders';

const KEY = 'myrm.v2';

function load(): AppData {
  const week = weekStartISO();
  const base = seedData(week);
  let saved: Partial<AppData> | null = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { /* private mode or corrupt */ }
  const data = { ...base, ...(saved || {}) };
  data.outgoing ??= [];
  if (data.screen === 'det') data.screen = 'home';
  // The week strip starts empty every Monday.
  if (data.weekStart !== week) data.done = [false, false, false, false, false, false, false];
  data.weekStart = week;
  return data;
}

export interface SheetRequest { prId?: string; disc?: DiscId }

interface Store {
  data: AppData;
  set: (fn: (d: AppData) => Partial<AppData>) => void;
  fmt: Format;
  toast: { show: boolean; title: string; text: string };
  flash: (title: string, text: string) => void;
  detId: string | null;
  openDetail: (id: string) => void;
  sheet: SheetRequest | null;
  openSheet: (req: SheetRequest) => void;
  closeSheet: () => void;
  homeFilter: DiscId | 'all';
  setHomeFilter: (f: DiscId | 'all') => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);
  const [toast, setToast] = useState({ show: false, title: '', text: '' });
  const [detId, setDetId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetRequest | null>(null);
  const [homeFilter, setHomeFilter] = useState<DiscId | 'all'>('all');
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(data);
  latest.current = data;

  // Save shortly after edits settle (typing a name shouldn't write on every key), and always before the page hides.
  useEffect(() => {
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(latest.current)); } catch { /* storage full or blocked */ } };
    const t = window.setTimeout(save, 300);
    const onHide = () => { if (document.visibilityState === 'hidden') save(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', save);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', save); };
  }, [data]);

  // A clock for things that depend on the time while the app stays open: the Monday reset and due reminders.
  useEffect(() => {
    const tick = () => {
      const week = weekStartISO();
      if (latest.current.weekStart !== week) setData(d => ({ ...d, weekStart: week, done: d.done.map(() => false) }));
      fireDueReminders(latest.current.reminders);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);

  const set = useCallback((fn: (d: AppData) => Partial<AppData>) => setData(d => ({ ...d, ...fn(d) })), []);
  const flash = useCallback((title: string, text: string) => {
    setToast({ show: true, title, text });
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(t => ({ ...t, show: false })), 2600);
  }, []);
  const openDetail = useCallback((id: string) => { setDetId(id); set(() => ({ screen: 'det' })); }, [set]);
  const openSheet = useCallback((req: SheetRequest) => setSheet(req), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const fmt = useMemo(() => makeFormat(data.units === 'lb'), [data.units]);

  const value = { data, set, fmt, toast, flash, detId, openDetail, sheet, openSheet, closeSheet, homeFilter, setHomeFilter };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

/** Disciplines the user trains (falls back to all when none picked). */
export function useShownDiscs() {
  const { data } = useStore();
  return useMemo(() => {
    const mine = DISCS.filter(d => data.goals.includes(d.id));
    return mine.length ? mine : DISCS;
  }, [data.goals]);
}

/** Selected/unselected outline pill colors used across every chip row. */
export function pillStyle(on: boolean) {
  return {
    background: on ? 'var(--color-text)' : 'transparent',
    color: on ? 'var(--color-bg)' : 'var(--color-text)',
    borderColor: on ? 'var(--color-text)' : 'var(--color-neutral-600)'
  };
}
