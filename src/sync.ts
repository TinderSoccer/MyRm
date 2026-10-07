import type { AppData, LogEntry, Pr, Skill } from './data';
import { logOf, withLog } from './format';

/** What a person keeps in their account: their marks, skills, settings and hand-added birthdays. Group things already live in the group. */
const KEYS = ['name', 'goals', 'freq', 'units', 'bar', 'prs', 'skills', 'birthdays'] as const;
export type Personal = Pick<AppData, typeof KEYS[number]>;

export const personalOf = (d: AppData): Personal => Object.fromEntries(KEYS.map(k => [k, d[k]])) as Personal;

/** JSON with keys sorted at every level: Postgres stores jsonb with its own key order, so compare this, not raw text. */
export const canon = (x: unknown) => JSON.stringify(x, (_k, v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);

const byId = <T extends { id: string | number }>(a: T[], b: T[], both: (x: T, y: T) => T) => {
  const out = new Map(a.map(x => [x.id, x]));
  for (const y of b) { const x = out.get(y.id); out.set(y.id, x ? both(x, y) : y); }
  return [...out.values()];
};

const entryKey = (e: LogEntry) => [e.iso ?? e.date, e.v, e.scheme, e.mode, e.note].join('|');

/** First sync on a phone: nothing on either side is lost. Logs are joined, skills keep the furthest stage. */
export function mergePersonal(local: Personal, remote: Personal): Personal {
  return {
    ...remote,
    name: local.name.trim() || remote.name,
    prs: byId<Pr>(local.prs, remote.prs, (x, y) => {
      const seen = new Map([...logOf(x), ...logOf(y)].map(e => [entryKey(e), e]));
      return withLog(x, [...seen.values()]);
    }),
    skills: byId<Skill>(local.skills, remote.skills, (x, y) => ({ ...x, stage: Math.max(x.stage, y.stage), tracked: !!(x.tracked || y.tracked) || undefined })),
    birthdays: byId(local.birthdays, remote.birthdays, x => x)
  };
}
