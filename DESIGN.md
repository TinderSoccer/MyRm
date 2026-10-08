---
name: MyRm
description: Tu diario de box: marcas, skills, grupo y pizarra del WOD para CrossFit, Halterofilia, Hyrox y GAP.
colors:
  chalk-cream: "#f5ead8"
  worn-plywood: "#ebddc5"
  board-ink: "#201e1d"
  pr-terracotta: "#c67139"
  pr-terracotta-light: "#d67f48"
  pr-terracotta-deep: "#8c491a"
  progress-olive: "#7a8a5e"
  progress-olive-deep: "#56633f"
  progress-olive-mist: "#e1eecc"
  dust-line: "#c0b6a5"
  dust-line-strong: "#82796a"
  pencil-gray: "#645c50"
typography:
  display:
    fontFamily: "Caprasimo, system-ui, sans-serif"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 1.02
  headline:
    fontFamily: "Caprasimo, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.1
  title:
    fontFamily: "Caprasimo, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: 1.12
  numeral:
    fontFamily: "Caprasimo, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  kicker:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.04em"
rounded:
  sm: "8px"
  md: "16px"
  lg: "28px"
  sheet: "36px"
  pill: "999px"
spacing:
  "1": "4.4px"
  "2": "8.8px"
  "3": "13.2px"
  "4": "17.6px"
  "6": "26.4px"
  "8": "35.2px"
  gutter: "22px"
components:
  button-primary:
    backgroundColor: "{colors.pr-terracotta}"
    textColor: "{colors.board-ink}"
    rounded: "{rounded.pill}"
    height: "56px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.pr-terracotta-light}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.board-ink}"
    rounded: "{rounded.pill}"
    height: "44px"
  chip-filter:
    backgroundColor: "transparent"
    textColor: "{colors.board-ink}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  chip-filter-selected:
    backgroundColor: "{colors.board-ink}"
    textColor: "{colors.chalk-cream}"
  chip-choice-selected:
    backgroundColor: "{colors.pr-terracotta}"
    textColor: "{colors.board-ink}"
    rounded: "{rounded.pill}"
    height: "40px"
  card-surface:
    backgroundColor: "{colors.worn-plywood}"
    rounded: "{rounded.lg}"
    padding: "16px 18px"
  card-board:
    backgroundColor: "{colors.board-ink}"
    textColor: "{colors.chalk-cream}"
    rounded: "{rounded.lg}"
    padding: "22px"
  input:
    backgroundColor: "{colors.worn-plywood}"
    textColor: "{colors.board-ink}"
    rounded: "{rounded.pill}"
    height: "48px"
  tabbar:
    backgroundColor: "{colors.board-ink}"
    textColor: "{colors.chalk-cream}"
    rounded: "{rounded.pill}"
    height: "72px"
  toast:
    backgroundColor: "{colors.progress-olive-deep}"
    textColor: "{colors.chalk-cream}"
    rounded: "{rounded.lg}"
    padding: "16px 18px"
---

# Design System: MyRm

## Overview

**Creative North Star: "La pizarra del box"**

MyRm se ve como la pizarra de tiza donde el box anota los récords del día: fondo crema como de tiza, tinta casi negra para lo importante, naranja terracota cuando alguien supera una marca y verde oliva para lo que avanza. Es cálida y de comunidad, no clínica ni de gimnasio de cadena. Los números mandan: una marca se lee de un vistazo, grande y con la tipografía más gorda del sistema.

La densidad es baja y la interfaz se siente táctil y amable: píldoras gordas, esquinas muy redondas, nada afilado. La app empuja sin regañar; el tono visual nunca es de alerta ni de culpa. La bandeja oscura (`card-board`) es la "pizarra" de cada pantalla: el resumen de la semana en Inicio y la mejor marca en el Detalle.

Es una app de teléfono primero. En pantallas de 600px o más se presenta dentro de un marco de teléfono de 390×844, no como un layout de escritorio.

**Key Characteristics:**
- Crema + tinta + terracota + oliva; ningún otro tono de marca.
- Caprasimo para títulos y para cada número que importa; Figtree para todo lo demás.
- Todo lo que se toca es una píldora o un círculo, de 44px o más.
- Plano por defecto: la profundidad viene del contraste tonal, y la sombra queda para lo que flota.

## Colors

Una paleta terrosa de cuatro roles sobre rampas tonales OKLCH que comparten la misma escala de luminosidad (`src/styles/organic.css`).

### Primary
- **Terracota de PR** (`pr-terracotta`): el color del logro y de la acción. Se usa en el botón principal, en el FAB "+", en la opción elegida de un selector y en la barra del mejor intento del gráfico. El texto y los íconos encima van siempre en tinta (`--color-on-accent`), nunca en crema.
- **Terracota profunda** (`pr-terracotta-deep`): para relleno detrás de texto crema (avatares, círculos de hora) y para los kickers de disciplina.

### Secondary
- **Oliva de progreso** (`progress-olive`): el avance y lo logrado. Solo como superficie decorativa o como fondo detrás de texto grande.
- **Oliva profunda** (`progress-olive-deep`): el toast de celebración, la etiqueta "Récord", la skill "¡Logrado!" y los textos de ganancia ("+10 kg").
- **Niebla oliva** (`progress-olive-mist`): el fondo del panel de progreso de Skills.

### Neutral
- **Crema de tiza** (`chalk-cream`): el fondo de la app y el texto sobre la pizarra.
- **Madera gastada** (`worn-plywood`): las tarjetas, los inputs y los controles sin elegir.
- **Tinta de pizarra** (`board-ink`): el texto, la tabbar, la pizarra y los filtros elegidos.
- **Lápiz** (`pencil-gray`): el texto secundario (fechas, ayudas).
- **Polvo** (`dust-line`): bordes decorativos (cajas punteadas, barras inactivas del gráfico).
- **Polvo marcado** (`dust-line-strong`): bordes de controles sin elegir; llega a 3:1 contra el fondo.

### Named Rules
**The Ink-on-Terracotta Rule.** Sobre terracota el texto va en tinta (4.6:1). La crema sobre terracota da 3.0:1 y queda prohibida para texto.

**The Deep-Fill Rule.** Cuando un relleno lleva texto crema encima (avatares, hora del recordatorio, toast, etiquetas), se usa el paso 700 u 800 de la rampa, nunca el tono base.

**The Control-Edge Rule.** Todo borde o relleno que comunique estado (pill sin elegir, punto de skill, input de fecha) usa `neutral-600` o un tono más oscuro para mantener 3:1 sobre el fondo. `neutral-400` es solo decorativo.

## Typography

**Display Font:** Caprasimo (con system-ui)
**Body Font:** Figtree (con system-ui)

**Character:** Caprasimo es gorda, redondeada y con algo de rótulo de tiza; le da voz a los títulos y peso a los números. Figtree es una sans geométrica y cálida que se mantiene legible en tamaños chicos.

### Hierarchy
- **Display** (400, 48px, 1.02): solo en la bienvenida ("Cada marca cuenta.").
- **Headline** (400, 32px, 1.1): el título de cada pantalla.
- **Title** (400, 22–26px, 1.12): los títulos de sección ("Mis marcas", "Historial") y de la hoja.
- **Numeral** (400, 24–56px, 1): las marcas. 56px en el Detalle, 38px en el campo editable y 24px en las tarjetas de la lista. La unidad va en Figtree 600, a un tercio del tamaño.
- **Body** (400, 15–17px, 1.55): textos de entrada y estados vacíos.
- **Label** (600, 14–16px): nombres de movimientos, etiquetas de campos y botones de píldora (700).
- **Kicker** (700, 11px, 0.04em, mayúsculas): el nombre de la disciplina, en el color de la disciplina.

### Named Rules
**The Number-Is-the-Hero Rule.** Toda marca se muestra en Caprasimo, con la unidad más chica y en Figtree. Un número de marca nunca va en el cuerpo de texto.

## Layout

Una sola columna en una pantalla de teléfono. El margen lateral es de 22px (24px en la hoja), los bloques de una pantalla se separan 26.4px (`space-6`) y los ítems de una lista 13.2px (`space-3`). Cada pantalla deja 120px abajo para que la tabbar flotante no tape contenido. Las filas de filtros se desplazan en horizontal y llegan hasta el borde: anulan el margen y lo vuelven a meter como padding. Se respetan las zonas seguras (`env(safe-area-inset-*)`). En 600px o más la app se centra en un marco de teléfono de 390×844, con barra de estado simulada.

## Elevation & Depth

Es plano por defecto y la profundidad es tonal: crema → madera → tinta. Solo hay sombra en lo que flota sobre el contenido: la tabbar, el toast y el marco del teléfono en escritorio. Las sombras son de tinta suave, nunca de color.

### Shadow Vocabulary
- **Flotante** (`box-shadow: 0 12px 32px color-mix(in srgb, #2e2b25 22%, transparent)`): la tabbar, el toast y el marco del teléfono.
- **Perilla** (`box-shadow: 0 1px 2px color-mix(in srgb, #2e2b25 14%, transparent)`): la perilla del switch.

### Named Rules
**The Float-Only Rule.** Una tarjeta nunca lleva sombra. Si algo necesita destacar, cambia de tono (madera → tinta), no de elevación.

## Shapes

Todo es redondo. Las tarjetas usan 28px de radio. La hoja inferior usa 36px en las esquinas de arriba. Botones, inputs, chips y tabbar son píldoras (999px), y los avatares, steppers, el FAB y los puntos de skill son círculos. Las únicas formas decorativas son círculos sólidos que se salen del borde de la pizarra o de la bienvenida, como gotas de tiza de color. Los bordes punteados de 2px marcan las zonas donde se crea algo ("Subir el WOD", "Invitar", "+ Nuevo").

## Components

### Buttons
- **Shape:** píldora completa (999px).
- **Primary:** terracota con texto en tinta, Caprasimo de 14–17px y 44–56px de alto. El CTA de pantalla ocupa todo el ancho y mide 56px.
- **Hover / Active:** se aclara a `accent-500` y luego a `accent-400`. El foco es un anillo terracota de 2px separado 2px.
- **Secondary:** fondo transparente con un borde fino de divisor; se oscurece apenas al pasar el cursor.
- **Round icon:** un círculo de madera de 44px para volver o cerrar; al pasar el cursor toma `accent-200`.
- **FAB:** un círculo terracota de 60px en el centro de la tabbar, con el "+" en tinta. Abre "Registrar marca".

### Chips
- **Filtro** (`.pill`): una píldora delineada de 40px. Sin elegir lleva borde `neutral-600`; elegida, se rellena de tinta con texto crema. Siempre usa `aria-pressed`.
- **Elección** (`.chip`): una píldora rellena. Sin elegir es madera; elegida, terracota con texto en tinta. Se usa para elegir el movimiento, los días de la semana y la frecuencia.
- **Pequeño** (`.pill-sm`): 38px visibles con un área táctil de 44px. Se usa para RM, fecha y modalidad.

### Cards / Containers
- **Corner Style:** 28px.
- **Background:** madera para las listas. La pizarra (tinta) se reserva para el resumen principal de la pantalla y lleva un círculo decorativo que se sale del borde.
- **Shadow Strategy:** ninguna (ver Float-Only).
- **Internal Padding:** 16–18px en las listas y 22px en la pizarra.
- **Empty state** (`.empty`): una caja punteada de 2px con texto en `neutral-800` que dice qué hacer a continuación.

### Inputs / Fields
- **Style:** píldora de madera de 44–52px, texto de 15–17px y cursor terracota.
- **Focus:** el borde pasa a terracota.
- **Valor editable de la marca:** número en Caprasimo de 38px sobre una línea punteada de 3px que se vuelve terracota al enfocarse, flanqueado por steppers de 56px (− en crema, + en terracota).

### Navigation
- **Tabbar:** una píldora flotante de tinta de 72px con cuatro pestañas y el FAB en el centro. La pestaña activa va en crema y las inactivas en `neutral-500`, con etiqueta de 12px/600 bajo un ícono Lucide de 24px.

### Registrar marca (signature)
Es una hoja inferior modal con esquinas de 36px. Al abrirse, el foco pasa al título, Escape la cierra y el foco vuelve al botón que la abrió. El resto de la app queda `inert` mientras está abierta. Sube con `cubic-bezier(.2, .9, .3, 1)` en 320ms; con movimiento reducido, en cambio, aparece con un fundido de 200ms.

### Toast de celebración
Es una píldora oliva profunda que baja desde arriba con un ease-out exponencial (`cubic-bezier(.16, 1, .3, 1)`, 450ms), sin rebote. Lleva el título en Caprasimo y el detalle en Figtree, y se anuncia con `role="status"`.

## Do's and Don'ts

### Do:
- **Do** poner texto en tinta sobre terracota y crema sobre los pasos 700–800 de cualquier rampa.
- **Do** darle a cada control un área táctil de 44px o más; si el diseño lo pide más chico, extiende el área con un pseudo-elemento (`.hit`).
- **Do** mostrar cada marca en Caprasimo con la unidad más chica en Figtree.
- **Do** usar íconos Lucide con trazo de 2.75 para todo ícono, incluidos el check y "Todos".
- **Do** marcar el estado elegido con `aria-pressed`, además del color.
- **Do** escribir con voz cercana y alentadora ("Constancia es avance", "Un empujoncito, nunca un sermón").

### Don't:
- **Don't** poner texto crema sobre terracota u oliva base: no llega a 4.5:1.
- **Don't** usar `neutral-400` como el único borde de un control.
- **Don't** usar emoji ni glifos Unicode (✓, ★) como íconos.
- **Don't** usar easings con rebote ni animar con `transition: all`.
- **Don't** poner sombra en las tarjetas.
- **Don't** mostrar una función como si funcionara cuando no funciona (invitaciones aceptadas solas, avisos que nunca suenan).
