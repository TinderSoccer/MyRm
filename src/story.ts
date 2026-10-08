/** Instagram stories drawn on a canvas: 1080×1920, the content kept clear of what Instagram covers (≈250px on top
 *  for the name and progress bar, ≈340px at the bottom for the reply field). One thing leads each story. */

const W = 1080, H = 1920;
const PAD = 80;
const TEXT_W = W - PAD * 2;
/** Where the content block ends and the watermark sits: just above the reply field. */
const CONTENT_END = 1470;
const MARK_Y = 1560;
const TOP_SAFE = 270;

const CAPRASIMO = '"Caprasimo", system-ui, sans-serif';
const FIGTREE = '"Figtree", system-ui, sans-serif';
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export interface StoryPerson { name: string; color: string; emoji: string }
export interface WodStory { kind: 'wod'; name: string; realName: string; lines: string[]; people: StoryPerson[] }
export interface RecordStory { kind: 'record'; what: string; value: string; unit: string; label: string; line: string }
export interface SkillStory { kind: 'skill'; name: string; label: string }
export interface WeekStory { kind: 'week'; done: number; goal: number; days: boolean[] }
export type Story = WodStory | RecordStory | SkillStory | WeekStory;
const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** The current theme's colours, read from the page so a story looks like the app it came from. */
function palette() {
  const css = getComputedStyle(document.documentElement);
  const v = (k: string) => css.getPropertyValue(`--color-${k}`).trim();
  return { bg: v('bg'), surface: v('surface'), text: v('text'), accent: v('accent'), accent2: v('accent-2'), accent600: v('accent-600'),
    accent2_700: v('accent-2-700'), neutral300: v('neutral-300'), neutral700: v('neutral-700') };
}

/** `var(--color-x)` → the colour it holds now (member colours are stored as variables). */
export function resolveColor(c: string) {
  const m = /var\((--[\w-]+)\)/.exec(c);
  return m ? getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim() || '#555' : c;
}

const font = (size: number, family: string, weight = 400) => `${weight} ${size}px ${family}`;

/** Splits text into lines that fit `width`; words longer than a line are kept whole and trimmed later. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Cuts a line to `width` with an ellipsis. */
function fit(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > width) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

/** The largest size (down to `min`) at which `text` fits in `maxLines` lines. */
function fitSize(ctx: CanvasRenderingContext2D, text: string, family: string, start: number, min: number, maxLines: number) {
  for (let size = start; size >= min; size -= 4) {
    ctx.font = font(size, family);
    const lines = wrap(ctx, text, TEXT_W);
    if (lines.length <= maxLines && lines.every(l => ctx.measureText(l).width <= TEXT_W)) return { size, lines };
  }
  ctx.font = font(min, family);
  return { size: min, lines: wrap(ctx, text, TEXT_W).slice(0, maxLines).map(l => fit(ctx, l, TEXT_W)) };
}

/** The photo, cropped to fill the story. It leads: only the strip at the bottom where the text sits is darkened. */
function drawPhoto(ctx: CanvasRenderingContext2D, photo: CanvasImageSource & { width: number; height: number }) {
  const s = Math.max(W / photo.width, H / photo.height);
  const w = photo.width * s, h = photo.height * s;
  ctx.drawImage(photo, (W - w) / 2, (H - h) / 2, w, h);
  const top = ctx.createLinearGradient(0, 0, 0, 360);
  top.addColorStop(0, 'rgba(0,0,0,.35)'); top.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = top; ctx.fillRect(0, 0, W, 360);
  const from = H * 0.52;
  const bottom = ctx.createLinearGradient(0, from, 0, H);
  bottom.addColorStop(0, 'rgba(0,0,0,0)'); bottom.addColorStop(0.35, 'rgba(0,0,0,.55)'); bottom.addColorStop(1, 'rgba(0,0,0,.8)');
  ctx.fillStyle = bottom; ctx.fillRect(0, from, W, H - from);
}

/** No photo: the theme's paper with the app's bumper plate peeking in from the corner. */
function drawPaper(ctx: CanvasRenderingContext2D, p: ReturnType<typeof palette>) {
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, W, H);
  const plate = (x: number, y: number, r: number) => {
    const ring = (radius: number, color: string) => { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); };
    ring(r, p.accent); ring(r * 0.94, p.accent600); ring(r * 0.92, p.accent); ring(r * 0.36, p.neutral300); ring(r * 0.17, p.text);
  };
  plate(W - 70, 300, 380);
  ctx.beginPath(); ctx.arc(W - 40, H - 120, 230, 0, Math.PI * 2); ctx.fillStyle = p.accent2; ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
}

// The app icon's dumbbell (Lucide), drawn in the watermark.
const DUMBBELL = ['M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z',
  'm2.5 21.5 1.4-1.4', 'm20.1 3.9 1.4-1.4', 'M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z', 'm9.6 14.4 4.8-4.8'];

/** "● MyRm · tu diario de box": the app's mark, on every story. */
function drawMark(ctx: CanvasRenderingContext2D, p: ReturnType<typeof palette>, ink: string) {
  const r = 30, cx = PAD + r, cy = MARK_Y;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = p.accent; ctx.fill();
  ctx.save();
  ctx.translate(cx - 18, cy - 18); ctx.scale(1.5, 1.5);
  ctx.strokeStyle = p.bg; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const d of DUMBBELL) ctx.stroke(new Path2D(d));
  ctx.restore();
  ctx.fillStyle = ink; ctx.textBaseline = 'middle';
  ctx.font = font(44, CAPRASIMO);
  ctx.fillText('MyRm', cx + r + 18, cy + 2);
  const x = cx + r + 18 + ctx.measureText('MyRm').width;
  ctx.font = font(34, FIGTREE, 600);
  ctx.globalAlpha = 0.85; ctx.fillText('  ·  tu diario de box', x, cy + 3); ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
}

/** Who came and how they finished: a colour circle with the initial, the emoji on its edge, the first name below. */
function peopleBlock(people: StoryPerson[]) {
  const cols = 4, cell = TEXT_W / cols, d = 132;
  const shown = people.length > 12 ? people.slice(0, 11) : people;
  const extra = people.length - shown.length;
  const count = shown.length + (extra ? 1 : 0);
  const rows = Math.ceil(count / cols);
  const rowH = d + 72;
  const height = rows ? rows * rowH - 20 : 0;
  const draw = (ctx: CanvasRenderingContext2D, top: number, ink: string, p: ReturnType<typeof palette>) => {
    shown.forEach((person, i) => {
      const cx = PAD + (i % cols) * cell + cell / 2, cy = top + Math.floor(i / cols) * rowH + d / 2;
      ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, Math.PI * 2); ctx.fillStyle = person.color; ctx.fill();
      ctx.fillStyle = p.bg; ctx.font = font(60, CAPRASIMO); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText((person.name.trim()[0] ?? '?').toUpperCase(), cx, cy + 4);
      // The emoji sits on a little paper disc at the circle's lower right.
      const ex = cx + d / 2 - 14, ey = cy + d / 2 - 14;
      ctx.beginPath(); ctx.arc(ex, ey, 40, 0, Math.PI * 2); ctx.fillStyle = p.bg; ctx.fill();
      ctx.font = font(52, EMOJI); ctx.fillText(person.emoji, ex, ey + 3);
      ctx.fillStyle = ink; ctx.font = font(34, FIGTREE, 700); ctx.textBaseline = 'alphabetic';
      ctx.fillText(fit(ctx, person.name.split(' ')[0], cell - 16), cx, cy + d / 2 + 50);
    });
    if (extra) {
      const i = shown.length, cx = PAD + (i % cols) * cell + cell / 2, cy = top + Math.floor(i / cols) * rowH + d / 2;
      ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, Math.PI * 2); ctx.fillStyle = p.surface; ctx.fill();
      ctx.fillStyle = p.text; ctx.font = font(48, CAPRASIMO); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`+${extra}`, cx, cy + 3);
      ctx.fillStyle = ink; ctx.font = font(34, FIGTREE, 700); ctx.textBaseline = 'alphabetic';
      ctx.fillText('más', cx, cy + d / 2 + 50);
    }
    ctx.textAlign = 'left';
  };
  return { height, draw };
}

/** Over a photo: just a caption at the bottom. The nickname, the WOD's real name, and a row of circles with each
 *  person's emoji (no names: their faces are in the photo). */
function wodOnPhoto(ctx: CanvasRenderingContext2D, story: WodStory, p: ReturnType<typeof palette>) {
  const d = 84, gap = 16, perRow = Math.floor((TEXT_W + gap) / (d + gap));
  const shown = story.people.length > perRow ? story.people.slice(0, perRow - 1) : story.people;
  const extra = story.people.length - shown.length;
  const showReal = story.realName && story.realName.trim().toLowerCase() !== story.name.trim().toLowerCase();
  const title = fitSize(ctx, showReal ? `«${story.name}»` : story.name, CAPRASIMO, 84, 56, 2);
  const rowH = story.people.length ? d + 34 : 0;
  const titleH = title.lines.length * title.size * 1.02;
  let y = CONTENT_END + 20 - rowH - (showReal ? 52 : 0) - titleH;
  ctx.fillStyle = '#ffffff'; ctx.font = font(title.size, CAPRASIMO);
  title.lines.forEach((l, i) => ctx.fillText(l, PAD, y + (i + 1) * title.size * 0.96));
  y += titleH;
  if (showReal) { ctx.font = font(36, FIGTREE, 700); ctx.fillStyle = 'rgba(255,255,255,.9)'; y += 46; ctx.fillText(fit(ctx, story.realName, TEXT_W), PAD, y); y += 6; }
  if (!story.people.length) return;
  y += 30;
  ctx.shadowColor = 'transparent';
  [...shown, ...(extra ? [null] : [])].forEach((person, i) => {
    const cx = PAD + d / 2 + i * (d + gap), cy = y + d / 2;
    ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, Math.PI * 2); ctx.fillStyle = person ? person.color : 'rgba(255,255,255,.9)'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (!person) { ctx.fillStyle = p.text; ctx.font = font(34, CAPRASIMO); ctx.fillText(`+${extra}`, cx, cy + 2); return; }
    ctx.font = font(48, EMOJI); ctx.fillText(person.emoji, cx, cy + 3);
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/** Over a photo: the record as a caption at the bottom, smaller than on paper so the photo stays the picture. */
function recordOnPhoto(ctx: CanvasRenderingContext2D, story: RecordStory) {
  let valueSize = 190;
  ctx.font = font(64, FIGTREE, 700);
  const unitW = story.unit ? ctx.measureText(story.unit).width + 18 : 0;
  for (; valueSize > 110; valueSize -= 10) { ctx.font = font(valueSize, CAPRASIMO); if (ctx.measureText(story.value).width + unitW <= TEXT_W) break; }
  ctx.font = font(60, CAPRASIMO);
  const what = fit(ctx, story.what, TEXT_W);
  const total = 52 + 72 + valueSize * 0.85 + (story.line ? 58 : 0);
  let y = CONTENT_END + 20 - total;
  ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = font(40, FIGTREE, 700); ctx.fillText(story.label, PAD, y + 40); y += 52;
  ctx.fillStyle = '#ffffff'; ctx.font = font(60, CAPRASIMO); ctx.fillText(what, PAD, y + 60); y += 72 + valueSize * 0.85;
  ctx.font = font(valueSize, CAPRASIMO); ctx.fillText(story.value, PAD, y);
  if (story.unit) { const vw = ctx.measureText(story.value).width; ctx.font = font(64, FIGTREE, 700); ctx.fillText(story.unit, PAD + vw + 18, y); }
  if (story.line) { ctx.fillStyle = 'rgba(255,255,255,.88)'; ctx.font = font(36, FIGTREE, 600); ctx.fillText(fit(ctx, story.line, TEXT_W), PAD, y + 58); }
}

/** The medal, drawn as the emoji at whatever size the story needs. */
function medal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save(); ctx.shadowColor = 'transparent'; ctx.font = font(size, EMOJI); ctx.textBaseline = 'alphabetic'; ctx.fillText('🏅', x, y); ctx.restore();
}

/** A skill: the medal, "¡Skill desbloqueada!" and its name big. Over a photo, a caption with a small medal. */
function skillStory(ctx: CanvasRenderingContext2D, story: SkillStory, ink: string, lead: string, onPhoto: boolean) {
  const name = fitSize(ctx, story.name, CAPRASIMO, onPhoto ? 84 : 140, onPhoto ? 56 : 80, onPhoto ? 2 : 3);
  const nameH = name.lines.length * name.size * 1.02;
  const medalSize = onPhoto ? 96 : 220;
  let y = CONTENT_END + (onPhoto ? 20 : 0) - nameH - 64 - (medalSize + 24);
  medal(ctx, PAD - 6, y + medalSize, medalSize); y += medalSize + 24;
  ctx.fillStyle = lead; ctx.font = font(onPhoto ? 40 : 48, FIGTREE, 700); ctx.fillText(story.label, PAD, y + 46); y += 64;
  ctx.fillStyle = ink; ctx.font = font(name.size, CAPRASIMO);
  name.lines.forEach((l, i) => ctx.fillText(l, PAD, y + (i + 1) * name.size * 0.98));
}

/** A week at its goal: "4/4" big and the seven days, ticked. Over a photo, the same smaller. */
function weekStory(ctx: CanvasRenderingContext2D, story: WeekStory, ink: string, lead: string, p: ReturnType<typeof palette>, onPhoto: boolean) {
  const big = onPhoto ? 150 : 300, d = onPhoto ? 72 : 112, step = (TEXT_W - d) / 6;
  const rowH = d + (onPhoto ? 44 : 60);
  const gapBelow = onPhoto ? 36 : 72;
  let y = CONTENT_END + (onPhoto ? 20 : 0) - rowH - gapBelow - big * 0.85 - 64;
  ctx.fillStyle = lead; ctx.font = font(onPhoto ? 40 : 48, FIGTREE, 700); ctx.fillText('¡Semana cumplida!', PAD, y + 46); y += 64 + big * 0.85;
  ctx.fillStyle = ink; ctx.font = font(big, CAPRASIMO);
  const n = `${story.done}/${story.goal}`; ctx.fillText(n, PAD, y);
  const nw = ctx.measureText(n).width;
  ctx.font = font(onPhoto ? 44 : 64, FIGTREE, 700); ctx.fillText('entrenos', PAD + nw + 24, y);
  y += gapBelow;
  ctx.save(); ctx.shadowColor = 'transparent';
  story.days.forEach((on, i) => {
    const cx = PAD + d / 2 + i * step, top = y;
    ctx.fillStyle = onPhoto ? 'rgba(255,255,255,.9)' : p.neutral700; ctx.font = font(onPhoto ? 28 : 36, FIGTREE, 700); ctx.textAlign = 'center';
    ctx.fillText(DAY_LETTERS[i], cx, top + (onPhoto ? 28 : 36));
    const cy = top + (onPhoto ? 44 : 60) + d / 2;
    ctx.beginPath(); ctx.arc(cx, cy, d / 2 - 3, 0, Math.PI * 2);
    if (on) { ctx.fillStyle = onPhoto ? '#ffffff' : p.accent2; ctx.fill(); }
    else { ctx.lineWidth = 5; ctx.strokeStyle = onPhoto ? 'rgba(255,255,255,.7)' : p.neutral700; ctx.globalAlpha = onPhoto ? 1 : 0.45; ctx.stroke(); ctx.globalAlpha = 1; }
    if (on) {
      // The app's check, drawn: the same tick as the week row on Home.
      const k = d / 40;
      ctx.beginPath(); ctx.moveTo(cx - 9 * k, cy); ctx.lineTo(cx - 3 * k, cy + 6 * k); ctx.lineTo(cx + 9 * k, cy - 6 * k);
      ctx.lineWidth = 3.4 * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = p.text; ctx.stroke();
    }
  });
  ctx.textAlign = 'left'; ctx.restore();
}

async function fontsReady() {
  await Promise.all([font(100, CAPRASIMO), font(40, FIGTREE, 600), font(40, FIGTREE, 700)].map(f => document.fonts.load(f).catch(() => null)));
}

/** Draws a story and returns it as a JPEG, ready for the share sheet. */
export async function renderStory(story: Story, photo: ImageBitmap | null): Promise<Blob> {
  await fontsReady();
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const p = palette();
  if (photo) drawPhoto(ctx, photo); else drawPaper(ctx, p);
  // Light text on a photo, the theme's ink on its paper.
  const ink = photo ? '#ffffff' : p.text;
  const soft = photo ? 'rgba(255,255,255,.88)' : p.neutral700;
  const lead = photo ? '#ffffff' : p.accent2_700;
  if (photo) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18; }

  if (story.kind === 'skill') skillStory(ctx, story, ink, lead, !!photo);
  else if (story.kind === 'week') weekStory(ctx, story, ink, lead, p, !!photo);
  else if (photo) {
    if (story.kind === 'wod') wodOnPhoto(ctx, story, p); else recordOnPhoto(ctx, story);
  } else if (story.kind === 'wod') {
    // From the bottom up: the people, the WOD's lines, its real name, then the funny name on top.
    const people = peopleBlock(story.people);
    ctx.font = font(38, FIGTREE, 600);
    const lines = story.lines.flatMap(l => wrap(ctx, l, TEXT_W)).slice(0, 5).map(l => fit(ctx, l, TEXT_W));
    if (story.lines.join(' ').length && lines.length === 5 && story.lines.flatMap(l => wrap(ctx, l, TEXT_W)).length > 5) lines[4] = fit(ctx, lines[4] + '…', TEXT_W);
    const showReal = story.realName && story.realName.trim().toLowerCase() !== story.name.trim().toLowerCase();
    const title = fitSize(ctx, showReal ? `«${story.name}»` : story.name, CAPRASIMO, 124, 72, 3);
    const titleH = title.lines.length * title.size * 1.04;
    const realH = showReal ? 58 : 0;
    const linesH = lines.length * 52;
    const gap = 56;
    let y = CONTENT_END - people.height - (people.height ? gap : 0) - linesH - (linesH ? 20 : 0) - realH - titleH;
    y = Math.max(TOP_SAFE, y);

    ctx.fillStyle = ink; ctx.font = font(title.size, CAPRASIMO);
    title.lines.forEach((l, i) => ctx.fillText(l, PAD, y + (i + 1) * title.size * 0.98));
    y += titleH;
    if (showReal) { ctx.fillStyle = lead; ctx.font = font(40, FIGTREE, 700); y += 54; ctx.fillText(fit(ctx, story.realName, TEXT_W), PAD, y); y += 4; }
    if (linesH) {
      y += 20;
      ctx.fillStyle = soft; ctx.font = font(38, FIGTREE, 600);
      lines.forEach((l, i) => ctx.fillText(l, PAD, y + (i + 1) * 52 - 12));
      y += linesH;
    }
    if (people.height) people.draw(ctx, y + gap, ink, p);
  } else {
    const what = fitSize(ctx, story.what, CAPRASIMO, 96, 64, 2);
    ctx.font = font(300, CAPRASIMO);
    let valueSize = 300;
    ctx.font = font(90, FIGTREE, 700);
    const unitW = story.unit ? ctx.measureText(story.unit).width + 24 : 0;
    for (; valueSize > 140; valueSize -= 10) { ctx.font = font(valueSize, CAPRASIMO); if (ctx.measureText(story.value).width + unitW <= TEXT_W) break; }
    const whatH = what.lines.length * what.size * 1.05;
    const total = 60 + whatH + 24 + valueSize * 0.95 + (story.line ? 70 : 0);
    let y = Math.max(TOP_SAFE + 200, CONTENT_END - total);
    ctx.fillStyle = lead; ctx.font = font(46, FIGTREE, 700);
    ctx.fillText(story.label, PAD, y + 44); y += 60;
    ctx.fillStyle = ink; ctx.font = font(what.size, CAPRASIMO);
    what.lines.forEach((l, i) => ctx.fillText(l, PAD, y + (i + 1) * what.size));
    y += whatH + 24 + valueSize * 0.82;
    ctx.font = font(valueSize, CAPRASIMO); ctx.fillText(story.value, PAD, y);
    const vw = ctx.measureText(story.value).width;
    if (story.unit) { ctx.font = font(90, FIGTREE, 700); ctx.fillText(story.unit, PAD + vw + 24, y); }
    if (story.line) { ctx.fillStyle = soft; ctx.font = font(42, FIGTREE, 600); ctx.fillText(fit(ctx, story.line, TEXT_W), PAD, y + 80); }
  }

  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  drawMark(ctx, p, ink);
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas')), 'image/jpeg', 0.92));
}

/** A photo from the camera or gallery, upright (EXIF) and ready to draw. */
export async function loadPhoto(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}
