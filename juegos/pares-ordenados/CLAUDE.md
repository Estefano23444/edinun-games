# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Juego: Pares ordenados.** Carpeta autocontenida del repo multi-juego
`edinun-games`. **Dos niveles** sobre plano cartesiano cuadrante I
(coordenadas 0..6, rejilla 7×7):

- **basic** (`coords`): aparece UN punto en el plano; el estudiante
  escribe la coordenada (X, Y) en dos slots numéricos con un numpad
  0–6 abajo. Lectura inversa al juego `plano-cartesiano`.
- **medium** (`producto`): conjuntos A y B con |A|=|B|=2; el estudiante
  toca cada intersección del producto A × B en el plano (multi-selección).

Detalle del diseño en `.planning/pares-ordenados-design.md`.

Hereda intacto el shell (`app.jsx`, `characters.jsx`, `logo.jsx`,
`styles.css`) y reusa el componente de la rejilla — `CartesianBoard`
es similar al `CartesianGrid` de `plano-cartesiano`, generalizado: en
lugar de un avatar arrastrable + tesoro, ahora acepta opcionalmente un
`target` decorativo (modo coords) o un `marked`/`toggleMark` para
multi-selección (modo producto), y resalta valores de A y B en los
ejes (`highlightA`, `highlightB`).

EDINUN GAMES en general — juegos de matemáticas para 6–11 años. En
móvil el diseño es horizontal pero el dispositivo se sostiene
**vertical**: el usuario gira físicamente el teléfono para verlo bien
(el contenido NO rota junto con la orientación del sistema).

- **Bitácora del proyecto** y decisiones tomadas: ver `MEMORY.md`.
- **Preferencias del usuario** (principios de usabilidad, metodología responsive, invariantes de diseño): ver `USER.md`. **Léelo antes de cualquier cambio de UI o flujo.**
- **Reglas internas del juego** (rondas, fórmula de estrellas, accuracy): ver `.planning/game-rules.md`. Editar `verify()` o el reporte sin tener en cuenta esas invariantes rompe el log académico.
- **Pinch-zoom custom** (handlers de touch en `DeviceStage` que operan sobre el transform del lienzo, no sobre el visual viewport del browser): ver `.planning/ios-zoom.md`. Si reactivás el zoom nativo del browser (quitando `touch-action: none` del wrapper o `user-scalable=no` del meta), reaparece el "rebote" reportado en iPhone.

## Documentación de cambios importantes

Toda decisión de arquitectura, plan de implementación, o nota técnica relevante se documenta como archivo markdown dentro de la carpeta `.planning/` en la raíz del repo.

- **Un archivo por tema** (ej. `.planning/responsive-strategy.md`, `.planning/print-report.md`).
- **Cada archivo debe tener menos de 200 líneas.** Si un tema crece más, divídelo en sub-documentos enlazados.
- Crear la carpeta si no existe. No es necesario un índice — los nombres de archivo deben ser descriptivos.
- Cambios triviales (renombrados, fixes de copy, ajustes menores de estilo) **no** requieren entrada en `.planning/`. Reservado para decisiones que un futuro mantenedor necesitaría entender para no romper invariantes.

## Running / deploying

No build system, no package manager. Es HTML estático que carga React 18 + Babel Standalone desde unpkg. Pensado para servidores estáticos triviales (GitHub Pages, Netlify, S3, `python -m http.server`).

- **Abrir local:** doble clic en `index.html` o `EDINUN GAMES.html`. Funciona sobre `file://` porque todo el JSX está inline en el HTML — no hace fetch a `.jsx` externos.
- **Servir local (canónico para QA responsive y captura de screenshots):** `python -m http.server 8765` desde la raíz del repo. `index.html` es el entry para hosting; `EDINUN GAMES.html` es una copia idéntica con el nombre del producto.
- No hay tests, lint, ni build step.

## Architecture

### Archivos cargados en runtime
Solo dos: `index.html` (idéntico a `EDINUN GAMES.html`) y `styles.css`. El HTML contiene todo el código React inline en un único bloque `<script type="text/babel" data-presets="react">`, en este orden de dependencia:

1. `EdinunLogo` / `EdinunLogoMini` (usan `assets/edinun-logo.png` directo)
2. `CHARACTERS` catálogo + 4 SVG components (Mago/Física/Numerólogo/Geómetra) + `CharacterAvatar`
3. `CosmosBg`, `useVisitorCount`, `HomeScreen`, `CharacterScreen`, `MenuScreen` (este último ya no está enrutado)
4. `GameScreen`, `ResultsScreen`; `ProfileScreen` existe en `game-screens.jsx` pero **no** se enruta en `App` — es código muerto residual.
5. `App` shell + `DeviceStage` + `RotateHint` + `ReactDOM.createRoot().render(<App/>)`

**Wiring entre archivos:** `App` referencia las pantallas vía `window.HomeScreen`, `window.GameScreen`, etc. No hay `window.X = X` explícitos en los `.jsx` — el bundle de Babel compila el script en scope global, así que toda `function` top-level queda colgada en `window` automáticamente. Por eso el orden en `bundle.py` (logo → characters → screens → game-screens → app) **es** el orden de dependencia: `App` debe correr último. Si en el futuro se migra a ES modules o `"use strict"` top-level, este atajo deja de funcionar y hay que añadir exports explícitos.

### Archivos `.jsx` editables
Los 5 `.jsx` (`logo`, `characters`, `screens`, `game-screens`, `app`) son la **fuente editable** del bundle inline en el HTML. El HTML no los carga en runtime, pero el flujo de trabajo es: editar el `.jsx` → re-empaquetar al HTML con el script oficial.

```bash
# Re-empaquetar tras editar cualquier .jsx (concatena los 5 fuentes en orden y
# reemplaza el bloque <script type="text/babel"> de index.html y "EDINUN GAMES.html",
# manteniendo ambos idénticos):
python .planning/bundle.py
```

Dos invariantes que `bundle.py` enforza y que un editor podría romper sin darse cuenta:

- **No incluir `</script>` literal en ningún `.jsx`.** El parser HTML del navegador cerraría el bloque `<script type="text/babel">` ahí mismo y todo lo siguiente se renderizaría como texto. El script aborta con error si lo detecta. Workaround si lo necesitás dentro de un template literal: `${"<\\/scr"+"ipt>"}` o equivalente.
- **El bundle reescribe desde `<script type="text/babel">` hasta `</html>`** (no solo el contenido del script). Cualquier markup que se quiera persistir después del script debe ir **antes** en el HTML, o se pierde en el siguiente bundle.

`design-canvas.jsx` y la carpeta `uploads/` son residuos del prototipo original. Están en `.gitignore` y no se publican — un fresh clone no los tiene.

### Routing y estado
Sin react-router. `App` mantiene `route` en `useState` y conmuta entre `HomeScreen | CharacterScreen | GameScreen | ResultsScreen` vía la función `go(route)`. Todo el estado de la sesión (`studentName`, `character`, `level`, `currentCategory`, `lastResult`, etc.) vive en el state `app` del componente `App` y se pasa por props (`{ app, setApp, go }`). No hay backend — persistencia limitada a `localStorage` para el contador de visitantes (`edinun_visitors_v1` + `edinun_visit_counted_v1` en sessionStorage como guarda anti-doble-conteo).

### Flujo
Home (nivel → nombre → ENTRAR) → Personaje (4 personajes Mario-Kart-style, sin mención de niveles) → Game (3 rondas, ecuación protagonista CDU, resolución U→D→C drag-and-drop) → Results (printable). El **nivel** elegido en Home determina la operación en Game: `basic`→suma o resta aleatoria, `medium`→multiplicación, `advanced`→división. No hay menú de categorías ni pantalla de perfil en el flujo actual.

### Device stage (`DeviceStage`)
Lienzo lógico fijo **900×540** (paisaje) escalado con `transform: scale()` al viewport. El fondo (`CosmosBg`) se renderiza fuera del lienzo y llena el viewport completo edge-to-edge — no hay marco de teléfono ni notch decorativo en ningún modo.

Clasifica por viewport en tres modos (sólo se usa para decidir si mostrar el rotate hint):

- `desktop`: lado mayor ≥ 820 y lado menor ≥ 820.
- `tablet`: lado mayor ≥ 820 pero lado menor < 820.
- `mobile`: lado mayor < 820.

**Centrado del lienzo (invariante crítico):** el lienzo se posiciona con `position: absolute; left:50%; top:50%; transform: translate(-50%,-50%) scale(...)`. **No** usar `display:grid; placeItems:center` — bug confirmado: cuando el viewport es más pequeño que 900×540 (mobile portrait típico), las grid tracks auto-dimensionan al contenido y el lienzo queda alineado a la esquina superior izquierda en vez de centrado, dejando el contenido fuera del viewport.

**El contenido nunca rota** según orientación del dispositivo. En móvil portrait el lienzo paisaje queda letterboxed (pequeño en vertical), y aparece un hint discreto `↻ Gira tu dispositivo` (no bloqueante, descartable) para invitar al usuario a rotar el teléfono físicamente. Al rotar, el viewport pasa a landscape y el lienzo escala naturalmente al ancho.

Drag-and-drop HTML5 funciona con mouse (desktop) y trackpad; en móvil táctil el fallback es **tap-to-place** (toca un dígito → llena el siguiente slot vacío U→D→C; toca un slot lleno → lo borra).

**Pinch-zoom y pan táctil custom.** El wrapper de `DeviceStage` lleva `touch-action: none` y handlers de `touchstart/move/end` con `{passive: false}` que aplican `userZoom` y `pan` al `transform` del lienzo. El zoom nativo del browser está desactivado en el meta viewport (`user-scalable=no`) — si reaparece, el "rebote" en iPhone vuelve. Detalle de la math y los modos de gesto (`pinch` / `pan-armed` / `pan`) en `.planning/ios-zoom.md`.

### Sistema de diseño (`styles.css`)
Variables CSS bajo `:root` con prefijo `--ed-*` definen toda la paleta (cosmic violet/cyan + EDINUN gold), tipografía (Fredoka display, Nunito UI, JetBrains Mono), radios, sombras y glows. Clases reutilizables: `.ed-cosmos` (fondo cósmico animado), `.ed-glyphs` (símbolos matemáticos flotantes), `.ed-card`, `.ed-btn` + variantes (`-primary`, `-ghost`, `-verify`, `-erase`, `-hint`), `.ed-numpad-key`, `.ed-answer-slot` (con estados `.active`, `.filled`, `.drag-over`), `.ed-chip-{basic|medium|advanced}`, `.ed-dice-{c|d|u}`. Bloque `@media print` recorta a `.ed-print-area` para el reporte de resultados.

### Mecánica del juego (`GameScreen`)
- `makeProblem(cat)` genera el problema según categoría.
- `slots = digits(answer).length`. El layout calcula `columns = Math.max(maxLen, slots)` para que la rejilla CDU cubra tanto operandos como resultado (clave: `59+74=133` necesita 3 columnas aunque los operandos tengan 2 dígitos).
- `press(d)` rellena de derecha a izquierda (unidades primero). `eraseAt(i)` borra una posición específica al hacer click en un slot lleno. `erase()` (botón) borra el dígito más a la izquierda colocado.
- Drag-and-drop: las fichas 0-9 son `draggable`; los slots aceptan drop vía `dataTransfer.getData("text/plain")`. Tap también funciona como fallback.
- Tras 3 aciertos guarda `lastResult` en `app` e invoca `incrementGamesCompleted()` (no-op heredado) antes de navegar a Results.

### Personajes
PNGs (`assets/char-<id>.png`, generados con Nano Banana 500×500) renderizados con un overlay SVG de sparkles animados. La fábrica `makeCharacter(id, sparkleColor, seed)` produce los 4 componentes (`MagoCharacter`, `FisicaCharacter`, `NumerologoCharacter`, `GeometraCharacter`); `CharacterAvatar` compone el marco circular para HUD/perfil. Catálogo `CHARACTERS` define `id`, `name`, `title`, `specialty`, `quote`, `Component`. Las descripciones **no deben mencionar niveles, álgebra ni fracciones** — son personajes estilo Mario Kart asociados a profesiones (mago, física, numerólogo, geómetra).

## QA responsive

Antes de declarar un cambio de UI completo, capturar el flujo en al menos: 1920×1080, 1280×800, 1024×768, 768×1024, 667×375, 375×667. Procedimiento + caveats en `USER.md`. La invariante de centrado del `DeviceStage` (sección anterior) sale de esta sesión de testing — re-introducirla rompe el responsive en mobile portrait.
