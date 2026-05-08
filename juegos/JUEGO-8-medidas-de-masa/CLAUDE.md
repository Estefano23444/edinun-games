# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Juego: Medidas de masa.** Carpeta autocontenida del repo
multi-juego `edinun-games`. **Un solo nivel**: 3 rondas escalonadas
por distancia entre unidades — ronda 1 un escalón (×/÷10), ronda 2
dos escalones (×/÷100), ronda 3 kg ↔ libra. Mecánica única:
ecuación de conversión + numpad. Detalle del diseño en
`.planning/medidas-de-masa-design.md`.

**Audiencia 9 años** (excepción al default 6-8 del repo, ver
`memory/audiencia_por_juego.md` global). El usuario pidió cubrir solo
**múltiplos del gramo** (g, dag, hg, kg) más libra como unidad
imperial. **Tope 3 cifras** (≤ 999) en TODOS los valores; respuestas
**siempre enteras** — esto excluye `kg ↔ g` directo (1 kg = 1000 g) y
restringe libras a un pool de pares enteros (múltiplos de 5 kg / 11 lb).

EDINUN GAMES en general — juegos de matemáticas para estudiantes.
Originado como prototipo handoff de Claude Design (claude.ai/design);
el objetivo actual es llevarlo a producción soportando móvil, tablet y
desktop. En móvil el diseño es horizontal pero el dispositivo se
sostiene **vertical**: el usuario gira físicamente el teléfono para
verlo bien (el contenido NO rota junto con la orientación del sistema).

- **Bitácora del proyecto** y decisiones tomadas: ver `MEMORY.md`.
- **Preferencias del usuario** (principios de usabilidad, metodología responsive, invariantes de diseño): ver `USER.md`. **Léelo antes de cualquier cambio de UI o flujo.**
- **Pinch-zoom custom** (handlers de touch en `DeviceStage` que operan sobre el transform del lienzo, no sobre el visual viewport del browser): ver `juegos/patrones-numericos/.planning/ios-zoom.md` (mismo shell). Si reactivás el zoom nativo del browser (quitando `touch-action: none` del wrapper o `user-scalable=no` del meta), reaparece el "rebote" reportado en iPhone.

## Documentación de cambios importantes

Toda decisión de arquitectura, plan de implementación, o nota técnica relevante se documenta como archivo markdown dentro de `.planning/` del juego.

- **Un archivo por tema**.
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
4. `GameScreen`, `ResultsScreen`
5. `App` shell + `DeviceStage` + `RotateHint` + `ReactDOM.createRoot().render(<App/>)`

**Wiring entre archivos:** `App` referencia las pantallas vía `window.HomeScreen`, `window.GameScreen`, etc. No hay `window.X = X` explícitos en los `.jsx` — el bundle de Babel compila el script en scope global, así que toda `function` top-level queda colgada en `window` automáticamente. Por eso el orden en `bundle.ps1` (logo → characters → screens → game-screens → app) **es** el orden de dependencia: `App` debe correr último.

### Archivos `.jsx` editables
Los 5 `.jsx` (`logo`, `characters`, `screens`, `game-screens`, `app`) son la **fuente editable** del bundle inline en el HTML. El HTML no los carga en runtime, pero el flujo de trabajo es: editar el `.jsx` → re-empaquetar al HTML.

```powershell
# Re-empaquetar tras editar cualquier .jsx (concatena los 5 fuentes en orden y
# reemplaza el bloque <script type="text/babel"> de index.html y "EDINUN GAMES.html",
# manteniendo ambos idénticos):
powershell -ExecutionPolicy Bypass -File .planning\bundle.ps1
```

Dos invariantes que `bundle.ps1` enforza:

- **No incluir `</script>` literal en ningún `.jsx`.** El parser HTML del navegador cerraría el bloque `<script type="text/babel">` ahí mismo.
- **El bundle reescribe desde `<script type="text/babel">` hasta `</html>`** (no solo el contenido del script). Cualquier markup que se quiera persistir después del script debe ir **antes** en el HTML.

### Routing y estado
Sin react-router. `App` mantiene `route` en `useState` y conmuta entre `HomeScreen | CharacterScreen | GameScreen | ResultsScreen` vía la función `go(route)`. Todo el estado de la sesión vive en el state `app` del componente `App` y se pasa por props (`{ app, setApp, go }`). No hay backend — persistencia limitada a `localStorage` para el contador de visitantes.

### Flujo
Home (descripción + nombre → ENTRAR) → Personaje → Game (3 rondas escalonadas) → Results (printable). **No hay chips de dificultad en Home ni tabs en HUD** — el juego es de nivel único. La selección de personaje siempre fija `currentCategory: "masa"` y `currentCatLabel: "Medidas de masa"`; las 3 rondas dentro del juego escalan internamente por `idx` en `makeProblem`.

### Mecánica del juego (`GameScreen`)

`makeProblem(cat, idx)` genera el problema según la ronda:

- **idx 0 — Un escalón (×/÷10):** pares vecinos g↔dag, dag↔hg, hg↔kg. Lado "grande" 1..9; lado "chico" múltiplo de 10 entre 10 y 90. Random elige par y dirección.
- **idx 1 — Dos escalones (×/÷100):** pares g↔hg, dag↔kg. Lado "grande" 1..9; lado "chico" múltiplo de 100 entre 100 y 900.
- **idx 2 — kg ↔ libra:** factor `1 kg = 2,2 lb` mostrado en pantalla. Pool predefinido de pares enteros y ≤ 999 (5↔11, 10↔22, ..., 450↔990). Random elige par y dirección.

`slots = String(answer).length`. Numpad llena izq→der; **sin leading zeros** (si el slot está vacío y se toca 0, se ignora). `verify()` compara `parseInt(slots.join(""))` con `problem.answer` — **comparación entera estricta**. Tras 3 rondas guarda `lastResult` y navega a Results.

### Adaptación del log

| Campo | Valor |
| ----- | ----- |
| `a` | Lado izquierdo (`"5 dag"`) |
| `b` | Unidad destino (`"g"`) |
| `op` | `"="` |
| `correctAnswer` | Valor numérico correcto (`"50"`) |
| `userAnswer` | Lo que escribió el chico |

`ResultsScreen` muestra columnas: "Conversión", "=", "Unidad destino", "Respuesta del estudiante", "Respuesta correcta", "Estado", "Tiempo".

### Personajes
PNGs (`assets/char-<id>.png`, generados con Nano Banana 500×500) renderizados con un overlay SVG de sparkles animados. Catálogo `CHARACTERS` define `id`, `name`, `title`, `specialty`, `quote`, `Component`. **El personaje destacado en el landing es Nova** (`charId: "fisica"`) por la afinidad temática con masa/física, pero el usuario puede elegir cualquiera dentro del juego.

## QA responsive

Antes de declarar un cambio de UI completo, capturar el flujo en al menos: 1920×1080, 1280×800, 1024×768, 768×1024, 667×375, 375×667. Procedimiento + caveats en `USER.md`.
