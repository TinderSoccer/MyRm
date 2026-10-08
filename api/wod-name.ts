// Vercel Function: the day's WOD (and how the class ended up) → three funny names for the Instagram story.
// Only signed-in MyRm users can call it (each call spends Anthropic credit). Needs ANTHROPIC_API_KEY in Vercel.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const MAX_NAME = 34;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['names'],
  properties: {
    names: { type: 'array', items: { type: 'string', description: `A funny name for the workout, at most ${MAX_NAME} characters` }, description: 'Exactly three names' }
  }
} as const;

const SYSTEM = `You name CrossFit workouts for a box's Instagram story. Given the day's WOD and the emoji each athlete picked for how they finished, write three short, funny names for it.
Write in Chilean Spanish, the way people at a Chilean box joke with each other: light slang is welcome (pega, cuático, chelas, la raja, me mató), crude words are not.
Joke about the workout itself: its movements, the pain, the sweat, the burpees, the excuses, the beers after. If most finished with 💀 or 😮‍💨, lean into the suffering; if they flew (🤩 💪), into the swagger.
Never mock a person, a body, an ability or a group of people. Nothing sexual, nothing about alcohol beyond a friendly "chelas".
Each name at most ${MAX_NAME} characters and at most five words, like a movie or band title. No hashtags, no emoji, no quotes. Three different angles; none of them the workout's real name.`;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const clean = (s: unknown, max: number) => typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '';

export async function POST(request: Request): Promise<Response> {
  // Who's asking: a valid MyRm session, checked against Supabase.
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL || !SUPABASE_KEY) return json({ error: 'Entra a MyRm para usar los nombres.' }, 401);
  const { data: user, error: authError } = await createClient(SUPABASE_URL, SUPABASE_KEY).auth.getUser(token);
  if (authError || !user.user) return json({ error: 'Tu sesión venció. Vuelve a entrar.' }, 401);

  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'Los nombres todavía no están activados en el servidor.' }, 503);

  let title: string, description: string, moods: string[], avoid: string[];
  try {
    const body = await request.json() as { title?: unknown; description?: unknown; moods?: unknown; avoid?: unknown };
    title = clean(body.title, 80);
    description = typeof body.description === 'string' ? body.description.slice(0, 600) : '';
    moods = Array.isArray(body.moods) ? body.moods.filter((m): m is string => typeof m === 'string').slice(0, 40).map(m => m.slice(0, 8)) : [];
    avoid = Array.isArray(body.avoid) ? body.avoid.map(a => clean(a, MAX_NAME)).filter(Boolean).slice(0, 12) : [];
    if (!title && !description) throw new Error('empty');
  } catch {
    return json({ error: 'Falta el WOD para inventarle nombre.' }, 400);
  }

  const prompt = [
    `Workout: ${title || '(no name)'}`,
    description && `As written on the board:\n${description}`,
    moods.length ? `How the class finished: ${moods.join(' ')}` : 'Nobody said yet how they finished.',
    avoid.length && `Already suggested, write different ones: ${avoid.join(' · ')}`
  ].filter(Boolean).join('\n\n');

  try {
    const response = await new Anthropic().beta.messages.create({
      // Sonnet, like the board photo: a joke in the box's own slang needs more than the smallest model.
      model: 'claude-sonnet-5-5',
      max_tokens: 1000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      // If a safety classifier declines, Anthropic re-runs it on its recommended model instead of failing.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = response.content.find(b => b.type === 'text');
    console.log('wod-name', JSON.stringify({ stop: response.stop_reason, model: response.model, usage: { in: response.usage.input_tokens, out: response.usage.output_tokens } }));
    if (response.stop_reason !== 'end_turn' || !text || text.type !== 'text') return json({ error: 'No se nos ocurrió nada. Prueba otra vez.' }, 502);
    const names = ((JSON.parse(text.text) as { names?: unknown }).names as unknown[] ?? []).map(n => clean(n, MAX_NAME).replace(/^["«“]|["»”]$/g, '')).filter(Boolean).slice(0, 3);
    if (!names.length) return json({ error: 'No se nos ocurrió nada. Prueba otra vez.' }, 502);
    return json({ names });
  } catch (error) {
    console.error('wod-name failed', error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : String(error));
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'Mucha gente pidiendo nombres. Prueba en un minuto.' }, 429);
    return json({ error: 'No se nos ocurrió nada. Prueba otra vez.' }, 502);
  }
}
