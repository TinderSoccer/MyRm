# Grupo compartido (Supabase)

Sin Supabase configurado, MyRm funciona entero en el teléfono: el grupo es local. Con estas variables, la pestaña **Grupo** pasa a ser compartida: login por correo, grupo con link de invitación, feed de logros con felicitaciones, eventos con "Voy / No voy" y cumpleaños desde el perfil de cada uno.

Al entrar con tu correo, tus marcas, skills, recordatorios y ajustes **se respaldan en tu cuenta**: si cambias de teléfono, entras con el mismo correo y aparecen. Sin entrar, todo sigue funcionando solo en el teléfono.

## 1. Crear el proyecto

Cualquiera de las dos:

- **Desde Vercel (recomendado):** proyecto `myrm` → *Storage* → *Create Database* → **Supabase**, conectado a `myrm`. Vercel agrega solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`, que la app ya lee.
- **Desde supabase.com:** *New project*, y en Vercel → *Settings → Environment Variables* agrega
  `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (están en Supabase → *Project Settings → API*).

Para probar en local, copia `.env.example` a `.env.local` y llénalo.

## 2. Crear las tablas

Supabase → *SQL Editor* → pega y ejecuta, en orden:

1. [`supabase/migrations/0001_group.sql`](supabase/migrations/0001_group.sql): perfiles, grupos, miembros, feed, felicitaciones, eventos y asistencia, con reglas (RLS) para que cada persona vea solo su grupo y solo pueda escribir a su nombre.
2. [`supabase/migrations/0002_user_data.sql`](supabase/migrations/0002_user_data.sql): el respaldo personal de marcas y ajustes. Solo su dueño lo puede leer.
3. [`supabase/migrations/0003_wod.sql`](supabase/migrations/0003_wod.sql): la pizarra del WOD de cada día y los resultados de cada uno.
4. [`supabase/migrations/0004_wod_policies.sql`](supabase/migrations/0004_wod_policies.sql): ajusta las reglas de la pizarra para que nadie pueda mover un WOD o un resultado a otro grupo.

## 3. Login por correo

Supabase → *Authentication*:

1. **URL Configuration**
   - *Site URL*: la dirección de Vercel, p. ej. `https://myrm.vercel.app`
   - *Redirect URLs*: esa misma y `http://localhost:4173`
2. **SMTP propio (primero):** en el plan gratis, Supabase solo deja editar los correos con un SMTP propio, y el suyo de fábrica manda muy pocos por hora. Con Gmail: crea una [contraseña de aplicación](https://myaccount.google.com/apppasswords) (pide verificación en dos pasos) y en *Authentication → SMTP Settings* pon host `smtp.gmail.com`, puerto `587`, tu Gmail como usuario y remitente, y esa contraseña. Alcanza para ~500 correos al día.
3. **Email Templates → Confirm signup y Magic Link** (las dos): agrega el código al mensaje, para que en iPhone se pueda entrar escribiéndolo (con la app instalada, el link se abre en Safari y no en la app):

   ```html
   <h2>Entra a MyRm</h2>
   <p>Tu código: <strong>{{ .Token }}</strong></p>
   <p>O toca este link: <a href="{{ .ConfirmationURL }}">Entrar</a></p>
   ```


## Cómo se usa

1. Al abrir la app, después de la bienvenida, entras. La primera vez (o si se te olvidó la clave) con un código de 6 dígitos que llega al correo, y enseguida creas tu clave; desde ahí, con correo y clave. Luego, en **Grupo**, creas el grupo del box.
2. **Invitar a tu gente** comparte un link `…/?join=código`. Quien lo abre pasa por la bienvenida, entra con su correo y queda dentro.
3. Los récords nuevos y las skills logradas se publican solos en el grupo.
4. Tu cumpleaños se pone en **Perfil** (toca tu inicial en Inicio).

## Foto de la pizarra (opcional)

El botón **Foto de la pizarra** al subir el WOD lee una foto de la pizarra del box con IA (función `api/wod-photo.ts` en Vercel). Para activarlo:

1. Crea una clave en https://platform.claude.com → *API Keys*.
2. En Vercel → proyecto → *Settings → Environment Variables*, agrega `ANTHROPIC_API_KEY` (Production) con esa clave. Nunca con prefijo `VITE_` ni `NEXT_PUBLIC_`: quedaría a la vista en la app.
3. Despliega de nuevo para que la tome.

Solo la pueden usar personas con sesión iniciada en MyRm. Cada foto es una llamada a Claude Sonnet 5.5 con esfuerzo bajo (unos US$0,01).
