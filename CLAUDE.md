# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

EDINUN GAMES — juegos de matemáticas para estudiantes. Originado como prototipo handoff de Claude Design (claude.ai/design); el objetivo actual es llevarlo a producción soportando móvil, tablet y desktop. En móvil el diseño es horizontal pero el dispositivo se sostiene **vertical**: el usuario gira físicamente el teléfono para verlo bien (el contenido NO rota junto con la orientación del sistema).

## Running / deploying

No build system, no package manager. Es HTML estático que carga React 18 + Babel Standalone desde unpkg. Pensado para servidores estáticos triviales (GitHub Pages, Netlify, S3, `python -m http.server`).

- **Abrir local:** doble clic en `index.html` o `EDINUN GAMES.html`. Funciona sobre `file://` porque todo el JSX está inline en el HTML — no hace fetch a `.jsx` externos.
- **Servir:** cualquier static server sirviendo el directorio raíz. `index.html` es el entry canónico para hosting; `EDINUN GAMES.html` es una copia idéntica con el nombre del producto.
- No hay tests, lint, ni build step.

## Architecture

### Archivos cargados en runtime
Solo dos: `index.html` (idéntico a `EDINUN GAMES.html`) y `styles.css`. El HTML contiene todo el código React inline en un único bloque `<script type="text/babel" data-presets="react">`, en este orden de dependencia:

1. `EdinunLogo` / `EdinunLogoMini` (usan `assets/edinun-logo.png` directo)
2. `CHARACTERS` catálogo + 4 SVG components (Mago/Física/Numerólogo/Geómetra) + `CharacterAvatar`
3. `CosmosBg`, `useVisitorCount`, `HomeScreen`, `CharacterScreen`, `MenuScreen` (este último ya no está enrutado pero permanece exportado)
4. `GameScreen`, `ResultsScreen`, `ProfileScreen` (los dos últimos no enrutados)
5. `App` shell + `DeviceStage` + `RotateHint` + `ReactDOM.createRoot().render(<App/>)`

### Archivos `.jsx` y `design-canvas.jsx` en disco
Son la **fuente editable** del bundle inline en el HTML. El HTML no los carga en runtime, pero el flujo de trabajo es: editar el `.jsx` → re-empaquetar al HTML.

```bash
# Re-empaquetar tras editar cualquier .jsx
cat logo.jsx characters.jsx screens.jsx game-screens.jsx app.jsx > /tmp/combined.jsx
# Reemplazar el contenido entre <script type="text/babel" data-presets="react"> y </script>
# en index.html y "EDINUN GAMES.html" (mantenerlos idénticos)
```

`design-canvas.jsx` es residuo del prototipo Claude Design y no se usa.

### Routing y estado
Sin react-router. `App` mantiene `route` en `useState` y conmuta entre `HomeScreen | CharacterScreen | GameScreen | ResultsScreen` vía la función `go(route)`. Todo el estado de la sesión (`studentName`, `character`, `level`, `currentCategory`, `lastResult`, etc.) vive en el state `app` del componente `App` y se pasa por props (`{ app, setApp, go }`). No hay backend — persistencia limitada a `localStorage` para el contador de visitantes (`edinun_visitors_v1` + `edinun_visit_counted_v1` en sessionStorage como guarda anti-doble-conteo).

### Flujo
Home (nombre + nivel) → Personaje (4 personajes Mario-Kart-style, sin mención de niveles) → Game (3 rondas, ecuación protagonista CDU, resolución U→D→C drag-and-drop) → Results (printable). El **nivel** elegido en Home determina la operación en Game: `basic`→suma o resta aleatoria, `medium`→multiplicación, `advanced`→división. No hay menú de categorías ni pantalla de perfil en el flujo actual.

### Device stage (`DeviceStage`)
Lienzo lógico fijo **900×540** (paisaje) escalado con `transform: scale()` al viewport. Clasifica por viewport en tres modos:

- `desktop` (lado mayor ≥ 820 y lado menor ≥ 820): marco redondeado + notch decorativo, padding cómodo de 24px.
- `tablet` (lado mayor ≥ 820 pero menor < 820): mismo marco con padding de 12px.
- `mobile` (lado mayor < 820): sin marco, sin notch, sin padding.

**El contenido nunca rota** según orientación del dispositivo. En móvil portrait el lienzo paisaje queda letterboxed (pequeño en vertical), y aparece un hint discreto `↻ Gira tu dispositivo` (no bloqueante, descartable) para invitar al usuario a rotar el teléfono físicamente. Al rotar, el viewport pasa a landscape y el lienzo escala naturalmente al ancho.

Drag-and-drop HTML5 funciona con mouse (desktop) y trackpad; en móvil táctil el fallback es **tap-to-place** (toca un dígito → llena el siguiente slot vacío U→D→C; toca un slot lleno → lo borra).

### Sistema de diseño (`styles.css`)
Variables CSS bajo `:root` con prefijo `--ed-*` definen toda la paleta (cosmic violet/cyan + EDINUN gold), tipografía (Fredoka display, Nunito UI, JetBrains Mono), radios, sombras y glows. Clases reutilizables: `.ed-cosmos` (fondo cósmico animado), `.ed-glyphs` (símbolos matemáticos flotantes), `.ed-card`, `.ed-btn` + variantes (`-primary`, `-ghost`, `-verify`, `-erase`, `-hint`), `.ed-numpad-key`, `.ed-answer-slot` (con estados `.active`, `.filled`, `.drag-over`), `.ed-chip-{basic|medium|advanced}`, `.ed-dice-{c|d|u}`. Bloque `@media print` recorta a `.ed-print-area` para el reporte de resultados.

### Mecánica del juego (`GameScreen`)
- `makeProblem(cat)` genera el problema según categoría.
- `slots = digits(answer).length`. El layout calcula `columns = Math.max(maxLen, slots)` para que la rejilla CDU cubra tanto operandos como resultado (clave: `59+74=133` necesita 3 columnas aunque los operandos tengan 2 dígitos).
- `press(d)` rellena de derecha a izquierda (unidades primero). `eraseAt(i)` borra una posición específica al hacer click en un slot lleno. `erase()` (botón) borra el dígito más a la izquierda colocado.
- Drag-and-drop: las fichas 0-9 son `draggable`; los slots aceptan drop vía `dataTransfer.getData("text/plain")`. Tap también funciona como fallback.
- Tras 3 aciertos guarda `lastResult` en `app` e invoca `incrementGamesCompleted()` (no-op heredado) antes de navegar a Results.

### Personajes
SVG inline con gradientes radiales para simular volumen 3D. Catálogo `CHARACTERS` define `id`, `name`, `title`, `specialty`, `quote`, `Component`. Las descripciones **no deben mencionar niveles, álgebra ni fracciones** — son personajes estilo Mario Kart asociados a profesiones (mago, física, numerólogo, geómetra).
