export type DiscId = 'cf' | 'hx' | 'gap';
export type PrType = 'kg' | 'time' | 'reps';
export type Screen = 'w1' | 'w2' | 'home' | 'sk' | 'gr' | 'det' | 'tm';
export type Units = 'kg' | 'lb';

export interface Disc { id: DiscId; label: string; color: string }

/** The plates on one side of the bar, by plate ('45lb', '2.5kg') → how many; with the bar and the unit it was loaded in. */
export interface PlateSet { bar: 'big' | 'small' | 'tech'; lb: boolean; side: Record<string, number> }

/** `iso` (YYYY-MM-DD) orders the history; entries saved before it existed only have the short `date` label. */
export interface LogEntry { v: number; date: string; scheme: string | null; mode: string; note: string; iso?: string; plates?: PlateSet }

export interface Pr {
  id: string;
  disc: DiscId;
  name: string;
  type: PrType;
  better?: 'up' | 'down';
  /** Rep label ("rondas"); on a weight, 'kg' means kettlebell/dumbbell, always shown in kilos. */
  unitLabel?: string;
  /** Last five main-scheme values, oldest first — drives the mini chart. */
  hist: number[];
  date: string;
  log?: LogEntry[];
}

/** `tracked`: the user is working on it. Untracked skills are just the catalog offered when adding one. */
export interface Skill { id: string; disc: DiscId; name: string; stage: number; tracked?: boolean }

export type EventKind = 'carrete' | 'competencia' | 'otro';
/** `md` is MM-DD: the year doesn't matter for a birthday. */
export interface Birthday { id: string; name: string; md: string }

export interface AppData {
  screen: Screen;
  /** False until the welcome + profile flow is finished once. */
  onboarded: boolean;
  /** Account these marks belong to; null before signing in (or after signing out). Another account never merges into them. */
  owner: string | null;
  name: string;
  goals: DiscId[];
  freq: number;
  /** Mon..Sun ticks for the week starting at weekStart. */
  done: boolean[];
  weekStart: string;
  units: Units;
  /** The bar you train with: men's 45 lb / 20 kg, women's 35 lb / 15 kg, or a technique bar (15 lb / 10 kg). */
  bar: 'big' | 'small' | 'tech';
  prs: Pr[];
  skills: Skill[];
  /** Pastel look of the app (see theme.ts). */
  theme: string;
  /** How you usually train: the default for RX/Escalado when logging and on the WOD board. */
  level: 'RX' | 'Escalado';
  /** What you're training for, in your words ("mi primer muscle-up"); shown on Home. */
  aim: string;
  /** Birthdays added by hand, for people who aren't in the app. */
  birthdays: Birthday[];
}

export const DISCS: Disc[] = [
  { id: 'cf', label: 'CrossFit', color: 'var(--color-accent-700)' },
  { id: 'hx', label: 'Hyrox', color: 'var(--color-accent-2-700)' },
  { id: 'gap', label: 'GAP', color: 'var(--color-neutral-800)' }
];

/** Disciplines that were folded into CrossFit: Metcon is a kind of WOD and Bar Mastery is CrossFit gymnastics. */
export const MERGED_DISCS: Record<string, DiscId> = { mc: 'cf', bm: 'cf' };

export const discOf = (id: DiscId) => DISCS.find(d => d.id === id) ?? DISCS[0];

export const STAGES = ['Por empezar', 'Practicando', 'Con escala', '¡Logrado!', 'Dominado'];

// Dark enough for cream initials to clear 4.5:1.
export const MEMBER_COLORS = ['var(--color-accent-700)', 'var(--color-accent-2-700)', 'var(--color-neutral-700)', 'var(--color-accent-800)', 'var(--color-accent-2-800)'];

const mov = (id: string, disc: DiscId, name: string, type: PrType, extra: Partial<Pr> = {}): Pr =>
  ({ id, disc, name, type, ...(type === 'time' ? { better: 'down' as const } : {}), ...extra, hist: [], log: [], date: '—' });

/** Common movements offered when logging. Lifts first (they drive the percentages), then benchmarks. */
export const CATALOG_PRS: Pr[] = [
  mov('sq', 'cf', 'Back squat', 'kg'),
  mov('fsq', 'cf', 'Front squat', 'kg'),
  mov('dl', 'cf', 'Peso muerto', 'kg'),
  mov('sp', 'cf', 'Strict press', 'kg'),
  mov('pp', 'cf', 'Push press', 'kg'),
  mov('cl', 'cf', 'Clean', 'kg'),
  mov('pc', 'cf', 'Power clean', 'kg'),
  mov('cj', 'cf', 'Clean & jerk', 'kg'),
  mov('sn', 'cf', 'Snatch', 'kg'),
  mov('psn', 'cf', 'Power snatch', 'kg'),
  mov('ohs', 'cf', 'Overhead squat', 'kg'),
  mov('fr', 'cf', 'Fran', 'time'),
  mov('gr', 'cf', 'Grace', 'time'),
  mov('he', 'cf', 'Helen', 'time'),
  mov('di', 'cf', 'Diane', 'time'),
  mov('ka', 'cf', 'Karen', 'time'),
  mov('mur', 'cf', 'Murph', 'time'),
  mov('cin', 'cf', 'AMRAP 20′ Cindy', 'reps', { unitLabel: 'rondas' }),
  mov('bk', 'cf', 'Assault bike 50 cal', 'time'),
  mov('pu', 'cf', 'Dominadas estrictas', 'reps'),
  mov('t2b', 'cf', 'Toes to bar seguidos', 'reps'),
  mov('mu', 'cf', 'Bar muscle-ups seguidos', 'reps'),
  mov('hxs', 'hx', 'Hyrox completo', 'time'),
  mov('run', 'hx', 'Trote 1 km', 'time'),
  mov('ski', 'hx', 'SkiErg 1000 m', 'time'),
  mov('slp', 'hx', 'Sled push 50 m', 'time'),
  mov('sll', 'hx', 'Sled pull 50 m', 'time'),
  mov('bbj', 'hx', 'Burpee broad jumps 80 m', 'time'),
  mov('row', 'hx', 'Remo 1000 m', 'time'),
  mov('fc', 'hx', 'Farmers carry 200 m', 'time'),
  mov('sbl', 'hx', 'Sandbag lunges 100 m', 'time'),
  mov('wb', 'hx', '100 wall balls', 'time'),
  mov('ht', 'gap', 'Hip thrust', 'kg'),
  mov('pl', 'gap', 'Plancha', 'time', { better: 'up' })
];

export const CATALOG_SKILLS: Skill[] = [
  { id: 'du', disc: 'cf', name: 'Double unders', stage: 0 },
  { id: 'kpu', disc: 'cf', name: 'Kipping pull-up', stage: 0 },
  { id: 'ttb', disc: 'cf', name: 'Toes to bar', stage: 0 },
  { id: 'bfu', disc: 'cf', name: 'Butterfly pull-up', stage: 0 },
  { id: 'rc', disc: 'cf', name: 'Rope climb', stage: 0 },
  { id: 'hspu', disc: 'cf', name: 'Handstand push-up', stage: 0 },
  { id: 'bmu', disc: 'cf', name: 'Bar muscle-up', stage: 0 },
  { id: 'rmu', disc: 'cf', name: 'Muscle-up en anillas', stage: 0 },
  { id: 'hsw', disc: 'cf', name: 'Handstand walk', stage: 0 },
  { id: 'ps', disc: 'cf', name: 'Pistol squat', stage: 0 },
  { id: 'fl', disc: 'cf', name: 'Front lever', stage: 0 }
];

/** A fresh install: no marks, no group, no reminders — only a catalog of common movements and skills to pick from. */
export function seedData(weekStart: string): AppData {
  return {
    screen: 'w1',
    onboarded: false,
    owner: null,
    name: '', goals: [], freq: 4,
    done: [false, false, false, false, false, false, false],
    weekStart,
    units: 'lb',
    bar: 'big',
    prs: CATALOG_PRS,
    skills: CATALOG_SKILLS,
    level: 'RX',
    theme: 'crema',
    aim: '',
    birthdays: []
  };
}
