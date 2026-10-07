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

## 3. Login por correo

Supabase → *Authentication*:

1. **URL Configuration**
   - *Site URL*: la dirección de Vercel, p. ej. `https://myrm.vercel.app`
   - *Redirect URLs*: esa misma y `http://localhost:4173`
2. **Email Templates → Magic Link**: agrega el código al mensaje, para que en iPhone se pueda entrar escribiéndolo (con la app instalada, el link se abre en Safari y no en la app):

   ```html
   <h2>Entra a MyRm</h2>
   <p>Tu código: <strong>{{ .Token }}</strong></p>
   <p>O toca este link: <a href="{{ .ConfirmationURL }}">Entrar</a></p>
   ```

3. **Ojo con el límite de correos:** el correo que trae Supabase de fábrica manda muy pocos por hora y es solo para pruebas. Antes de invitar al box, configura un SMTP propio en *Authentication → SMTP Settings* (p. ej. [Resend](https://resend.com), gratis hasta 3.000 correos al mes).

## Cómo se usa

1. Entras a **Grupo** con tu correo y creas el grupo del box.
2. **Invitar a tu gente** comparte un link `…/?join=código`. Quien lo abre pasa por la bienvenida, entra con su correo y queda dentro.
3. Los récords nuevos y las skills logradas se publican solos en el grupo.
4. Tu cumpleaños se pone en **Perfil** (toca tu inicial en Inicio).
