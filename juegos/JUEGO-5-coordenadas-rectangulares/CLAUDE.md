# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Juego: Sistema de coordenadas rectangulares.** Carpeta autocontenida del repo
multi-juego `edinun-games`. **Un solo nivel, 3 rondas con mecánicas
distintas** mapeadas 1:1 al Tema 1 del libro de mate del usuario:
identificar coordenadas en formato `(letra, número)`, leer pares ordenados
`(x, y)` en plano cartesiano numérico, y trazar el camino del perro Kody
(2 componentes: pasos a la derecha + pasos hacia arriba). Detalle del diseño
en `.planning/coordenadas-rectangulares-design.md`.

**Audiencia 9 años** (excepción al default 6-8 del repo, ver
`memory/audiencia_por_juego.md` global). A esta edad introducen formalmente
el sistema de coordenadas y los pares ordenados.

EDINUN GAMES en general — juegos de matemáticas para estudiantes.
Originado como prototipo handoff de Claude Design (claude.ai/design);
el objetivo actual es llevarlo a producción soportando móvil, tablet y
desktop. En móvil el diseño es horizontal pero el dispositivo se
sostiene **vertical**: el usuario gira físicamente el teléfono.

- **Bitácora del proyecto** y decisiones tomadas: ver `MEMORY.md`.
- **Preferencias del usuario** (principios de usabilidad, metodología responsive, invariantes de diseño): ver `USER.md`. **Léelo antes de cualquier cambio de UI o flujo.**
- **Pinch-zoom custom**: ver `.planning/ios-zoom.md`.

## Documentación de cambios importantes

Toda decisión de arquitectura, plan de implementación, o nota técnica relevante se documenta como archivo markdown dentro de `.planning/` del juego.

- **Un archivo por tema**.
- **Cada archivo debe tener menos de 200 líneas.**
- Cambios triviales no requieren entrada en `.planning/`.

## Running / deploying

No build system, no package manager. Es HTML estático que carga React 18 + Babel Standalone desde unpkg.

- **Abrir local:** doble clic en `index.html` o `EDINUN GAMES.html`.
- **Servir local:** `python -m http.server 8765` desde la raíz del repo.

## Architecture

Mismo shell que los demás juegos. Los 5 `.jsx` (`logo`, `characters`, `screens`, `game-screens`, `app`) son la fuente editable. Tras editar, re-empaquetar:

```powershell
powershell -ExecutionPolicy Bypass -File .planning\bundle.ps1
```

Invariantes:
- **No incluir `</script>` literal en ningún `.jsx`.**
- **El bundle reescribe desde `<script type="text/babel">` hasta `</html>`**.

### Mecánica del juego (`GameScreen`)

Tres rondas con mecánicas distintas. `makeProblem(cat, idx)` ramifica:

- **idx 0** — `¿En qué casilla está [emoji]?`: grid 5×5 con encabezados A-E (cols) y 1-5 (rows). 6 emojis distintos en posiciones aleatorias sin repetir. Uno se marca como `target`. 4 botones de coordenadas (correcta + 3 distractores aleatorios). `answerTap(coord)` resuelve.
- **idx 1** — `¿Qué par ordenado es este punto?`: plano cartesiano numérico 0..5 × 0..5 con un punto marcado. 4 botones `(x, y)` (correcto + 3 cercanos). `answerTap(par)` resuelve.
- **idx 2** — `Camino del perro Kody`: plano 0..6 × 0..5 con personaje 🐶 en (0,0) y tesoro 💎 en (X, Y). Numpad guiado en 2 pasos: `paso 0` = pasos a la derecha (X), `paso 1` = pasos hacia arriba (Y). Si el chico se equivoca en cualquier paso, el ejercicio termina como incorrecto (no hay reintento, igual que `sustituciones` R3).

### Componentes específicos

- `GridR1({ positions, target })` — render del grid 5×5 con encabezados y la celda del target resaltada en dorado.
- `CartesianPlane({ x, y, max, point, character, walkedX, walkedY })` — render SVG del plano cartesiano. Si `point=true` muestra un punto marcado (R2). Si `character=true` muestra 🐶 en origen, 💎 en (x,y) y el camino caminado en cyan punteado (R3).

### Adaptación del log

Cada ronda usa el formato `{a, b, op, correctAnswer, userAnswer}` adaptado:

- Ronda 1: `a="🍎 en grid"`, `b="casilla"`, `op="→"`, `correctAnswer="(B, 3)"`.
- Ronda 2: `a="punto en plano"`, `b="par ordenado"`, `op="→"`, `correctAnswer="(2, 4)"`.
- Ronda 3: `a="(0,0) → (5,3)"`, `b="5 der. y _ arriba"`, `op="="`, `correctAnswer="5 der., 3 arriba"`.

### Personajes
Mismo catálogo que los demás juegos. **Personaje destacado en el landing: Pita** (`charId: "geo"`) por afinidad con coordenadas/geometría (mismo charId que `plano-cartesiano`).

## Contador de visitas (server-side con fallback)

A diferencia de los demás juegos del repo, este usa **`counter.php`** (en la raíz del juego) como contador global persistente. La lógica en `screens.jsx` (`useVisitorCount` / `markFirstAttempt`) fetcha el endpoint y cae a `localStorage` si el servidor no ejecuta PHP (GitHub Pages, `python -m http.server`, doble clic `file://`).

**`counter.php` endurecido tras el incidente del 2026-06-16** (ver `MEMORY.md`):
- Guarda el conteo en **`visits.txt` en la misma carpeta del juego** (no en una subcarpeta `counts/`). Razón: varios hosting compartido dejan escribir archivos pero **no crear subcarpetas** — el `mkdir` fallido tumbaba el endpoint con 500.
- Suprime warnings de PHP (`error_reporting(0)`) para que el body sea **JSON puro siempre**; un warning impreso rompía `JSON.parse` en el cliente.
- Si no puede escribir, cae a **modo solo lectura** (devuelve el conteo sin incrementar). El cliente `fetchVisitorCount` tolera tanto JSON `{"count":N}` como número plano.

- **Subir a edinun.com:** asegurarse de que la carpeta del juego tenga permisos de escritura (755/775) para que PHP cree `visits.txt`.
- **Probar el contador real localmente:** `cd juegos\JUEGO-5-coordenadas-rectangulares && php -S localhost:8000`.
- **No incluir `visits.txt` en git** (estado de producción). `.gitignore` raíz ya excluye `juegos/*/visits.txt`.

Detalle del comportamiento por entorno en `MEMORY.md` (secciones 2026-05-14 y 2026-06-16). Diagnóstico de producción para el usuario: `DIAGNOSTICO-JUEGO-5.md` (raíz del repo).

## QA responsive

Antes de declarar completo, capturar el flujo en al menos: 1920×1080, 1280×800, 1024×768, 768×1024, 667×375, 375×667.
