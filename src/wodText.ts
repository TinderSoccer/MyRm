/** Reads a WOD's text the way a coach writes the whiteboard: parts (warm-up, strength, the WOD, accessories), each
 *  under its own header, with rest and note lines in between. Works on text the AI transcribed (headers end in ":")
 *  and on text typed by hand (headers recognised by their words). */

export type PartKind = 'warmup' | 'skill' | 'strength' | 'wod' | 'extra' | 'cooldown';
/** `format`: the scheme right under a part's name ("Calentamiento:" then "2 rondas"). */
export interface BoardLine { text: string; kind: 'item' | 'rest' | 'note' | 'format' }
export interface BoardPart { title: string | null; kind: PartKind; lines: BoardLine[] }

const KINDS: [PartKind, RegExp][] = [
  ['warmup', /^(calentamiento|warm[\s-]?up|movilidad|mobility|activaci[oó]n|entrada en calor)/i],
  ['cooldown', /^(cool[\s-]?down|vuelta a la calma|estiramiento|elongaci[oó]n|stretch)/i],
  ['skill', /^(skill|t[eé]cnica|habilidad|gimn[aá]stic)/i],
  ['strength', /^(fuerza|strength|halterofilia|weightlifting|levantamiento|power|ol[ií]mpic)/i],
  ['extra', /^(accesorios?|accessor(y|ies)|core|abs|finisher|buy[\s-]?in|cash[\s-]?out|bonus|extra)/i],
  ['wod', /^(wod|metcon|amrap|emom|e\d+mom|every\b|cada\s+\d|for time|por tiempo|x time|tabata|chipper|death by|\d+\s*(rounds?|rondas?|rft)\b)/i]
];

const PART_LETTER = /^(parte\s+)?[A-E]\s*[).:-]\s*/i;
const REST = /^(\d+\s*(['′’]|min\w*|seg\w*|s\b)?\s*(de\s+)?(rest|descanso|recuperaci[oó]n)\b|(rest|descanso)\b)/i;

const kindOf = (title: string): PartKind | null => {
  const t = title.replace(PART_LETTER, '').trim();
  return KINDS.find(([, re]) => re.test(t))?.[0] ?? null;
};

/** A header: short, and either ends in ":" ("Calentamiento:"), is lettered ("A) Back squat 5x5"), or starts with a
 *  part's word ("AMRAP 12′", "3 Rounds For Time"). Lines that start with a dash or a count of reps are movements. */
function headerOf(line: string): { title: string; kind: PartKind; named: boolean } | null {
  if (line.length > 48 || /^[-•*·]/.test(line)) return null;
  const colon = /:\s*$/.test(line);
  const title = line.replace(/:\s*$/, '').trim();
  const kind = kindOf(title);
  if (colon) return { title, kind: kind ?? 'wod', named: true };
  if (PART_LETTER.test(line)) return { title, kind: kind ?? 'strength', named: true };
  // "4 Rounds" is a part; "15 KB swings" (a number then a movement) is not, and kindOf only matches rounds/rondas.
  if (kind) return { title, kind, named: false };
  return null;
}

export function parseBoard(text: string): BoardPart[] {
  const parts: BoardPart[] = [];
  let cur: BoardPart = { title: null, kind: 'wod', lines: [] };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const h = headerOf(line);
    // A scheme right under a named part ("WOD:" then "AMRAP 12′") describes that part instead of starting another.
    if (h && !h.named && cur.title !== null && cur.lines.length === 0) { cur.lines.push({ text: line, kind: 'format' }); if (cur.kind === 'wod' || h.kind === 'wod') cur.kind = cur.kind === 'wod' ? h.kind : cur.kind; continue; }
    if (h) {
      if (cur.title !== null || cur.lines.length) parts.push(cur);
      cur = { title: h.title, kind: h.kind, lines: [] };
      continue;
    }
    cur.lines.push({ text: line, kind: REST.test(line) ? 'rest' : /^\(.*\)$/.test(line) ? 'note' : 'item' });
  }
  if (cur.title !== null || cur.lines.length) parts.push(cur);
  return parts;
}

/** True when the text has real parts worth drawing apart (two headers, or one header after loose lines). */
export const hasParts = (parts: BoardPart[]) => parts.filter(p => p.title !== null).length >= 2 || (parts.length >= 2 && parts.some(p => p.title !== null));

/** The part people score: the last WOD-like part, else the last one that isn't a warm-up, accessory or cool-down. */
export function mainPart(parts: BoardPart[]): BoardPart | null {
  if (!parts.length) return null;
  const wods = parts.filter(p => p.kind === 'wod');
  if (wods.length) return wods[wods.length - 1];
  const real = parts.filter(p => p.kind !== 'warmup' && p.kind !== 'cooldown' && p.kind !== 'extra');
  return real[real.length - 1] ?? parts[parts.length - 1];
}

const same = (a: string, b: string) => a.replace(/[′’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/[′’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();

/** The lines a story shows: the main part's header (unless it's just "WOD") and its first lines, without repeating
 *  the WOD's own name, which the story already prints. One extra line tells the story to end in "…". */
export function storyLines(text: string, title = '', max = 5): string[] {
  const parts = parseBoard(text);
  const all = hasParts(parts)
    ? (p => [...(p.title && !/^(wod|metcon)$/i.test(p.title) ? [p.title] : []), ...p.lines.map(l => l.text)])(mainPart(parts)!)
    : text.split('\n').map(l => l.trim()).filter(Boolean);
  return all.filter(l => !title || !same(l, title)).slice(0, max + 1);
}
