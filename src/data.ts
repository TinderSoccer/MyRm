export type DiscId = 'cf' | 'hx' | 'mc' | 'gap' | 'bm';
export type PrType = 'kg' | 'time' | 'reps';
export type Screen = 'w1' | 'w2' | 'home' | 'rem' | 'sk' | 'gr' | 'det';
export type Units = 'kg' | 'lb';

export interface Disc { id: DiscId; label: string; color: string }

export interface LogEntry { v: number; date: string; scheme: string | null; mode: string; note: string }

export interface Pr {
  id: string;
  disc: DiscId;
  name: string;
  type: PrType;
  better?: 'up' | 'down';
  unitLabel?: string;
  /** Last five main-scheme values, oldest first — drives the mini chart. */
  hist: number[];
  date: string;
  log?: LogEntry[];
}

/** `tracked`: the user is working on it. Untracked skills are just the catalog offered when adding one. */
export interface Skill { id: string; disc: DiscId; name: string; stage: number; tracked?: boolean }
export interface Member { id: string; name: string; color: string }
export interface Invite { id: string; name: string }

export interface FeedItem {
  id: number | string;
  who: string;
  kind: 'pr' | 'skill';
  disc: DiscId;
  what: string;
  type?: PrType;
  unitLabel?: string;
  value?: number;
  stage?: string;
  ago: string;
  /** When it happened (ms). Older items only carry the `ago` label. */
  at?: number;
  cheers: number;
  cheered: boolean;
}

/** `days` are Mon=0..Sun=6; reminders saved before it existed only carry `sub`. */
export interface Reminder { id: number; title: string; sub: string; time: string; on: boolean; days?: number[] }

export interface AppData {
  screen: Screen;
  /** False until the welcome + profile flow is finished once. */
  onboarded: boolean;
  name: string;
  goals: DiscId[];
  freq: number;
  /** Mon..Sun ticks for the week starting at weekStart. */
  done: boolean[];
  weekStart: string;
  units: Units;
  celebrate: boolean;
  prs: Pr[];
  skills: Skill[];
  members: Member[];
  incoming: Invite[];
  /** Invites the user wrote down; there is no shared backend yet, so they stay on this phone. */
  outgoing: Invite[];
  feed: FeedItem[];
  reminders: Reminder[];
}

export const DISCS: Disc[] = [
  { id: 'cf', label: 'CrossFit', color: 'var(--color-accent-700)' },
  { id: 'hx', label: 'Hyrox', color: 'var(--color-accent-2-700)' },
  { id: 'mc', label: 'Metcon', color: 'var(--color-accent-800)' },
  { id: 'gap', label: 'GAP', color: 'var(--color-accent-2-800)' },
  { id: 'bm', label: 'Bar Mastery', color: 'var(--color-neutral-800)' }
];

export const discOf = (id: DiscId) => DISCS.find(d => d.id === id) ?? DISCS[0];

export const STAGES = ['Por empezar', 'Practicando', 'Con escala', '¡Logrado!', 'Dominado'];

// Dark enough for cream initials to clear 4.5:1.
export const MEMBER_COLORS = ['var(--color-accent-700)', 'var(--color-accent-2-700)', 'var(--color-neutral-700)', 'var(--color-accent-800)', 'var(--color-accent-2-800)'];

/** A fresh install: no marks, no group, no reminders — only a catalog of common movements and skills to pick from. */
export function seedData(weekStart: string): AppData {
  const mov = (id: string, disc: DiscId, name: string, type: PrType, extra: Partial<Pr> = {}): Pr =>
    ({ id, disc, name, type, ...(type === 'time' ? { better: 'down' as const } : {}), ...extra, hist: [], log: [], date: '—' });
  return {
    screen: 'w1',
    onboarded: false,
    name: '', goals: [], freq: 4,
    done: [false, false, false, false, false, false, false],
    weekStart,
    units: 'kg',
    celebrate: true,
    prs: [
      mov('sq', 'cf', 'Back squat', 'kg'),
      mov('fsq', 'cf', 'Front squat', 'kg'),
      mov('dl', 'cf', 'Peso muerto', 'kg'),
      mov('cl', 'cf', 'Clean', 'kg'),
      mov('sn', 'cf', 'Snatch', 'kg'),
      mov('cj', 'cf', 'Clean & jerk', 'kg'),
      mov('sp', 'cf', 'Strict press', 'kg'),
      mov('fr', 'cf', 'Fran', 'time'),
      mov('hxs', 'hx', 'Simulacro completo', 'time'),
      mov('ski', 'hx', 'SkiErg 1000 m', 'time'),
      mov('row', 'hx', 'Remo 1000 m', 'time'),
      mov('wb', 'hx', '100 wall balls', 'time'),
      mov('cin', 'mc', 'AMRAP 20′ Cindy', 'reps', { unitLabel: 'rondas' }),
      mov('bk', 'mc', 'Assault bike 50 cal', 'time'),
      mov('ht', 'gap', 'Hip thrust', 'kg'),
      mov('pl', 'gap', 'Plancha', 'time', { better: 'up' }),
      mov('pu', 'bm', 'Dominadas estrictas', 'reps'),
      mov('mu', 'bm', 'Muscle-up en barra', 'reps'),
      mov('t2b', 'bm', 'Toes to bar seguidos', 'reps')
    ],
    skills: [
      { id: 'du', disc: 'cf', name: 'Double unders', stage: 0 },
      { id: 'hspu', disc: 'cf', name: 'Handstand push-up', stage: 0 },
      { id: 'rc', disc: 'cf', name: 'Rope climb', stage: 0 },
      { id: 'hsw', disc: 'cf', name: 'Handstand walk', stage: 0 },
      { id: 'rmu', disc: 'cf', name: 'Muscle-up en anillas', stage: 0 },
      { id: 'kpu', disc: 'bm', name: 'Kipping pull-up', stage: 0 },
      { id: 'bfu', disc: 'bm', name: 'Butterfly pull-up', stage: 0 },
      { id: 'bmu', disc: 'bm', name: 'Bar muscle-up', stage: 0 },
      { id: 'fl', disc: 'bm', name: 'Front lever', stage: 0 },
      { id: 'ps', disc: 'gap', name: 'Pistol squat', stage: 0 },
      { id: 'sb', disc: 'hx', name: 'Sled push sin parar', stage: 0 }
    ],
    members: [],
    incoming: [],
    outgoing: [],
    feed: [],
    reminders: []
  };
}
