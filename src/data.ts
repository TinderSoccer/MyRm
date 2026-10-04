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

export interface Skill { id: string; disc: DiscId; name: string; stage: number }
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
  cheers: number;
  cheered: boolean;
}

export interface Reminder { id: number; title: string; sub: string; time: string; on: boolean }

export interface AppData {
  screen: Screen;
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

export const MEMBER_COLORS = ['var(--color-accent)', 'var(--color-accent-2)', 'var(--color-neutral-700)', 'var(--color-accent-700)', 'var(--color-accent-2-700)'];

export function seedData(weekStart: string): AppData {
  return {
    screen: 'w1',
    name: 'Ana', goals: ['cf', 'hx', 'gap', 'bm'], freq: 4,
    done: [true, true, false, true, false, false, false],
    weekStart,
    units: 'kg',
    celebrate: true,
    prs: [
      { id: 'sq', disc: 'cf', name: 'Back squat', type: 'kg', hist: [95, 100, 100, 105, 110], date: '28 sep' },
      { id: 'cl', disc: 'cf', name: 'Clean', type: 'kg', hist: [60, 65, 67.5, 70, 72.5], date: '14 sep' },
      { id: 'fr', disc: 'cf', name: 'Fran', type: 'time', better: 'down', hist: [372, 355, 341, 330, 318], date: '20 sep' },
      { id: 'hxs', disc: 'hx', name: 'Simulacro completo', type: 'time', better: 'down', hist: [5400, 5210, 5040, 4890, 4720], date: '27 sep' },
      { id: 'ski', disc: 'hx', name: 'SkiErg 1000 m', type: 'time', better: 'down', hist: [262, 255, 251, 246, 240], date: '24 sep' },
      { id: 'wb', disc: 'hx', name: '100 wall balls', type: 'time', better: 'down', hist: [430, 412, 400, 391, 383], date: '17 sep' },
      { id: 'cin', disc: 'mc', name: 'AMRAP 20′ Cindy', type: 'reps', unitLabel: 'rondas', hist: [14, 15, 15, 16, 17], date: '22 sep' },
      { id: 'bk', disc: 'mc', name: 'Assault bike 50 cal', type: 'time', better: 'down', hist: [205, 198, 190, 186, 181], date: '15 sep' },
      { id: 'ht', disc: 'gap', name: 'Hip thrust', type: 'kg', hist: [70, 80, 85, 90, 100], date: '30 sep' },
      { id: 'pl', disc: 'gap', name: 'Plancha', type: 'time', better: 'up', hist: [60, 75, 90, 100, 120], date: '30 sep' },
      { id: 'pu', disc: 'bm', name: 'Dominadas estrictas', type: 'reps', hist: [4, 5, 6, 7, 8], date: '26 sep' },
      { id: 'mu', disc: 'bm', name: 'Muscle-up en barra', type: 'reps', hist: [0, 1, 1, 2, 3], date: '19 sep' },
      { id: 't2b', disc: 'bm', name: 'Toes to bar seguidos', type: 'reps', hist: [8, 10, 12, 12, 15], date: '12 sep' }
    ],
    skills: [
      { id: 'du', disc: 'cf', name: 'Double unders', stage: 3 },
      { id: 'hspu', disc: 'cf', name: 'Handstand push-up', stage: 1 },
      { id: 'rc', disc: 'cf', name: 'Rope climb', stage: 3 },
      { id: 'hsw', disc: 'cf', name: 'Handstand walk', stage: 1 },
      { id: 'rmu', disc: 'cf', name: 'Muscle-up en anillas', stage: 0 },
      { id: 'kpu', disc: 'bm', name: 'Kipping pull-up', stage: 4 },
      { id: 'bfu', disc: 'bm', name: 'Butterfly pull-up', stage: 1 },
      { id: 'bmu', disc: 'bm', name: 'Bar muscle-up', stage: 3 },
      { id: 'fl', disc: 'bm', name: 'Front lever', stage: 0 },
      { id: 'ps', disc: 'gap', name: 'Pistol squat', stage: 2 },
      { id: 'sb', disc: 'hx', name: 'Sled push sin parar', stage: 2 }
    ],
    members: [
      { id: 'lu', name: 'Luis', color: 'var(--color-accent)' },
      { id: 'mj', name: 'Majo', color: 'var(--color-accent-2)' },
      { id: 'pa', name: 'Pato', color: 'var(--color-neutral-700)' },
      { id: 'da', name: 'Dani', color: 'var(--color-accent-700)' }
    ],
    incoming: [{ id: 'ca', name: 'Caro' }],
    feed: [
      { id: 1, who: 'mj', kind: 'pr', disc: 'hx', what: 'Simulacro completo', type: 'time', value: 4510, ago: 'Hace 2 h', cheers: 3, cheered: false },
      { id: 2, who: 'lu', kind: 'pr', disc: 'cf', what: 'Back squat', type: 'kg', value: 140, ago: 'Hace 5 h', cheers: 5, cheered: true },
      { id: 3, who: 'pa', kind: 'skill', disc: 'bm', what: 'Bar muscle-up', stage: '¡Logrado!', ago: 'Ayer', cheers: 8, cheered: false },
      { id: 4, who: 'da', kind: 'pr', disc: 'gap', what: 'Hip thrust', type: 'kg', value: 120, ago: 'Ayer', cheers: 2, cheered: false },
      { id: 5, who: 'lu', kind: 'pr', disc: 'mc', what: 'AMRAP 20′ Cindy', type: 'reps', unitLabel: 'rondas', value: 21, ago: 'Hace 2 días', cheers: 4, cheered: false },
      { id: 6, who: 'mj', kind: 'skill', disc: 'cf', what: 'Double unders', stage: 'Dominado', ago: 'Hace 3 días', cheers: 6, cheered: true }
    ],
    reminders: [
      { id: 1, title: 'CrossFit en el box', sub: 'Lun · Mié · Vie', time: '7:00', on: true },
      { id: 2, title: 'Clase de Hyrox', sub: 'Mar · Jue', time: '19:00', on: true },
      { id: 3, title: '¿Hubo marca hoy?', sub: 'Después de cada entreno', time: '20:30', on: true },
      { id: 4, title: 'GAP + movilidad', sub: 'Sábado', time: '10:00', on: false }
    ]
  };
}
