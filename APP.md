# MyRm · tu diario de box

Implementación de `project/CrossFit Avances.dc.html` (diseño exportado de Claude Design) como app web móvil instalable.

```bash
npm install
npm run dev      # desarrollo
npm run build    # genera dist/ (estático; sirve en cualquier hosting)
```

- **Stack:** React 19 + Vite + TypeScript, sin backend. Los datos se guardan en el navegador (`localStorage`, clave `myrm.v2`).
- **Estilo:** `src/styles/organic.css` es la hoja del sistema Organic sin cambios; `src/styles/app.css` agrega las clases de la app.
- **Pantallas:** Bienvenida y perfil, Inicio (racha semanal + marcas), Detalle de marca, Skills, Grupo, Recordatorios (campana en Inicio) y la hoja "Registrar marca".
- En el teléfono ocupa toda la pantalla (respeta notch y barra inferior); en pantallas anchas se muestra dentro del marco de teléfono del diseño.
- Empieza en cero: sin marcas, grupo ni recordatorios; solo un catálogo de movimientos y skills comunes para elegir.
- La racha semanal se reinicia cada lunes y la fecha de Inicio es la real.

Pendiente, porque necesita un servidor: notificaciones reales para los recordatorios y un grupo con otras personas de verdad (por ahora una invitación enviada se acepta sola a los 4 s, como en el prototipo).
