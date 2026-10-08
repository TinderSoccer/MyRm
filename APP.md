# MyRm · tu diario de box

Implementación de `project/CrossFit Avances.dc.html` (diseño exportado de Claude Design) como app web móvil instalable.

```bash
npm install
npm run dev      # desarrollo
npm run build    # genera dist/ (estático; sirve en cualquier hosting)
```

- **Stack:** React 19 + Vite + TypeScript. Los datos viven en el navegador (`localStorage`, clave `myrm.v2`) y, al entrar con correo, se respaldan en Supabase junto con el grupo (ver `SUPABASE.md`).
- **Estilo:** `src/styles/organic.css` es la hoja del sistema Organic sin cambios; `src/styles/app.css` agrega las clases de la app.
- **Pantallas:** Bienvenida y perfil, Inicio (racha semanal + marcas), Detalle de marca (con calculadora de discos), Skills, Grupo (Hoy: mensajes, check-in y pizarra del WOD · Logros · Próximos) y la hoja "Registrar marca".
- En el teléfono ocupa toda la pantalla (respeta notch y barra inferior); en pantallas anchas se muestra dentro del marco de teléfono del diseño.
- Empieza en cero: sin marcas ni grupo; solo un catálogo de movimientos y skills de CrossFit, Halterofilia, Hyrox y GAP para elegir.
- La racha semanal se reinicia cada lunes y la fecha de Inicio es la real.

Sin recordatorios ni notificaciones: sin un servidor de push no llegaban, así que se quitaron.
