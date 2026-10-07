// Vercel Function: a photo of the box's whiteboard → the day's WOD as text, for the group's board.
// Only signed-in MyRm users can call it (each call spends Anthropic credit). Needs ANTHROPIC_API_KEY in Vercel.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type MediaType = typeof MEDIA_TYPES[number];
// The app sends ~1600px JPEGs (a few hundred KB); this leaves room while staying under Vercel's 4.5 MB body limit.
const MAX_BASE64 = 4_000_000;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['found', 'title', 'description', 'score_type'],
  properties: {
    found: { type: 'boolean', description: 'false when the photo shows no readable workout' },
    title: { type: 'string', description: 'Short name of the WOD: its benchmark name (Fran, Cindy…) or its format (AMRAP 12′, For Time, EMOM 10′, 5x5 Back squat)' },
    description: { type: 'string', description: 'The workout as written on the board, one line per line on the board, separated by \\n' },
    score_type: { type: 'string', enum: ['time', 'reps', 'kg'], description: 'time for For Time; reps for AMRAP / max reps / rounds; kg for a heavy lift or max-weight day' }
  }
} as const;

const SYSTEM = `You transcribe photos of a CrossFit box whiteboard into the day's workout for the gym's app.
Boards often hold several parts (warm-up, skill, strength, WOD/metcon). Return the main scored workout: the WOD/metcon.
If the board only has a strength piece (e.g. 5x5 back squat, find a 1RM), that is the workout.
Copy what is written: keep numbers, rep schemes (21-15-9), weights and units (95/65 lb, 24/16 kg), distances and calories exactly, in the board's language.
Write movement names as CrossFitters write them. Put each line of the board on its own line. Mark an unreadable word with (?) instead of guessing.
Do not add coaching notes, scaling suggestions or anything that is not on the board.
Set found to false only when the photo has no workout at all (it isn't a whiteboard or a written workout, or nothing on it can be read).
Glare, angles, messy handwriting or several sections are not reasons to give up: transcribe what you can read and mark the rest with (?).`;

type Result = { found: boolean; title: string; description: string; score_type: 'time' | 'reps' | 'kg' };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
  // Who's asking: a valid MyRm session, checked against Supabase.
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL || !SUPABASE_KEY) return json({ error: 'Entra a MyRm para usar la foto.' }, 401);
  const { data: user, error: authError } = await createClient(SUPABASE_URL, SUPABASE_KEY).auth.getUser(token);
  if (authError || !user.user) return json({ error: 'Tu sesión venció. Vuelve a entrar.' }, 401);

  if (!process.env.ANTHROPIC_API_KEY) return json({ error: 'La lectura de fotos todavía no está activada en el servidor.' }, 503);

  let image: string, mediaType: MediaType;
  try {
    const body = await request.json() as { image?: unknown; mediaType?: unknown };
    if (typeof body.image !== 'string' || !body.image || body.image.length > MAX_BASE64) throw new Error('image');
    if (!MEDIA_TYPES.includes(body.mediaType as MediaType)) throw new Error('type');
    image = body.image; mediaType = body.mediaType as MediaType;
  } catch {
    return json({ error: 'La foto no llegó bien. Intenta otra vez.' }, 400);
  }

  const client = new Anthropic();
  // One reading of the photo at a given effort, logged so a miss can be explained from Vercel's logs
  // (never the image or the user's token).
  const read = async (effort: 'low' | 'medium') => {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 8000,
      output_config: { effort, format: { type: 'json_schema', schema: SCHEMA } },
      // If a safety classifier declines, Anthropic re-runs it on its recommended model instead of failing.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
          { type: 'text', text: 'Transcribe the workout on this whiteboard.' }
        ]
      }]
    });
    const text = response.content.find(b => b.type === 'text');
    const answer = text && text.type === 'text' ? text.text : null;
    console.log('wod-photo', JSON.stringify({
      effort, stop: response.stop_reason, model: response.model, refusal: response.stop_details ?? null,
      usage: { in: response.usage.input_tokens, out: response.usage.output_tokens }, answer: answer?.slice(0, 300) ?? null
    }));
    return { stop: response.stop_reason, result: answer && response.stop_reason === 'end_turn' ? JSON.parse(answer) as Result : null };
  };

  try {
    // Low effort reads most boards cheaply but sometimes gives up on a readable one (same photo: once "no workout",
    // once a perfect transcription). A miss gets one more look at medium effort before telling the person.
    let { stop, result } = await read('low');
    if (stop === 'end_turn' && result && !result.found) ({ stop, result } = await read('medium'));

    if (stop === 'refusal') return json({ error: 'No pudimos leer esta foto. Escribe el WOD a mano.' }, 422);
    if (stop === 'max_tokens') return json({ error: 'La pizarra traía demasiado. Prueba con una foto solo del WOD.' }, 422);
    if (!result) return json({ error: 'No pudimos leer esta foto. Escribe el WOD a mano.' }, 502);
    if (!result.found) return json({ error: 'No encontramos un WOD en la foto. Prueba más de cerca y con luz.' }, 422);
    return json({ title: result.title.slice(0, 80), description: result.description.slice(0, 600), score_type: result.score_type });
  } catch (error) {
    console.error('wod-photo failed', error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : String(error));
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'Hay mucha gente leyendo fotos. Prueba en un minuto.' }, 429);
    if (error instanceof Anthropic.BadRequestError) return json({ error: 'La foto no se pudo procesar. Prueba con otra.' }, 400);
    if (error instanceof Anthropic.AuthenticationError) return json({ error: 'La lectura de fotos no está bien configurada en el servidor.' }, 503);
    if (error instanceof Anthropic.APIError) return json({ error: 'El servicio de lectura falló. Intenta de nuevo.' }, 502);
    if (error instanceof SyntaxError) return json({ error: 'No pudimos leer esta foto. Escribe el WOD a mano.' }, 502);
    return json({ error: 'No hay conexión con el servicio de lectura.' }, 502);
  }
}
