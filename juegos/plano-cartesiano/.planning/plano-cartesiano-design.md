# Plano cartesiano — diseño

## Tema

Plano cartesiano del cuadrante I: pares ordenados (x, y) en una rejilla
7×7 (coordenadas 0..6). El estudiante mueve un avatar pequeño del
personaje seleccionado al casillero indicado en el enunciado. Audiencia
6–11 años: el botón de nivel queda fuera porque el juego es de
**dificultad única** — el rango 0..6 está pensado para que sirva tanto
a 6 como a 11 años, escalando con la velocidad y precisión del
estudiante (la fórmula de estrellas decreciente premia tiempo).

## Niveles

| id    | catId  | catLabel           | Rango / contenido                                   |
|-------|--------|--------------------|-----------------------------------------------------|
| único | tesoro | Plano cartesiano   | Cuadrante I, x ∈ {0..6}, y ∈ {0..6}, excluye (0,0). |

HomeScreen no muestra chips de dificultad (sólo una descripción breve
"Encuentra el tesoro en el plano usando coordenadas (x, y)." + nombre +
ENTRAR). HUD del juego no tiene tabs ni modal de cambio de nivel; en el
centro del HUD hay una pill estática con el catLabel.

## Mecánica

Patrón base: **Plano cartesiano "tesoro"** (Pattern 2 de la biblioteca
en `references/mechanics-design.md`).

- `makeProblem("tesoro")` sortea (x, y) aleatorio en `[0, 6]`
  excluyendo el origen (0,0). 48 celdas posibles ⇒ probabilidad de
  repetir ejercicio dentro de la sesión de 3 rondas es baja, no se
  desreplican explícitamente.
- `CartesianGrid` (componente nuevo en `game-screens.jsx`) renderiza:
  - Rejilla 7×7 con líneas blancas suaves (las del eje, más fuertes).
  - Etiquetas de los ejes (X abajo, Y a la izquierda) en mono dorado.
  - Tesoro 🏆 en la celda objetivo (decorativo, sin pointer events).
  - Avatar pequeño del personaje seleccionado, arrastrable.
- El estado del juego es `{ avatar: {x, y} }`. No hay slots numéricos.
- Drag-and-drop HTML5: el avatar es `draggable`, las celdas son drop
  targets. Al soltar en otra celda se actualiza `avatar`.
- Tap fallback: tap en una celda mueve el avatar a esa celda.
- Botón **VERIFICAR** explícito: compara `avatar` con `problem`. Si
  acierta → estrellas según tiempo, avanza tras 950 ms. Si falla →
  feedback rojo, celda errónea destella 1200 ms, avatar vuelve al
  origen. **No** se valida automáticamente al soltar para evitar falsos
  positivos por dedo deslizado en mobile.
- Botón **REINICIAR**: vuelve el avatar a (0,0) sin consumir intento.
- Botón **SALIR**: modal de confirmación, igual que en el resto del
  repo.

### Layout (lienzo 900×540)

```
┌──────────────────────────────────────────────────────┐
│ HUD: [logo]  PLANO CARTESIANO   [⏱ 00:12] [⭐ 0]      │  ← sin tabs
├──────────────┬──────────────────────────────┬────────┤
│ bocadillo:   │     ↑ y                      │ ¡VERIF.!│
│ "Primero X,  │     6│ . . . . . . .         │ REINIC.│
│  después Y." │     5│ . . . . . . .         │ SALIR  │
│              │     4│ . . . 🏆 . . .        │        │
│              │     3│ . . . . . . .         │        │
│              │     2│ . . . . . . .         │        │
│              │     1│ . . . . . . .         │        │
│              │     0│●. . . . . . .         │        │
│              │      └──────────────         │        │
│              │      0 1 2 3 4 5 6  → x      │        │
│ [Personaje]                                          │
└──────────────────────────────────────────────────────┘

Mapeo zonas → elementos:
  - Pill catLabel        → hud (centro)
  - Bocadillo            → bocadillo (12..240, 68..200)
  - Plano cartesiano     → zona-central (260..720, 140..460)
  - VERIFICAR/REINIC.    → acciones (740..888, 80..280)
  - Personaje pequeño    → personaje (0..100, 440..540)
  - (sin bandeja inferior — la rejilla absorbe el espacio)
```

### Adaptación del log y reporte

`lastResult.log[i]` por ejercicio:
- `mode: "tesoro"`.
- `a`: coordenada X correcta. `b`: coordenada Y correcta.
- `op`: `"→"` (placeholder neutro).
- `correctAnswer`, `userAnswer`: strings `"(x, y)"`.
- `formatOp(e)` retorna `"(x, y)"` para `e.mode === "tesoro"`.
- Tabla del reporte académico: columnas "Coordenadas" / "Coordenada
  correcta" (renombradas de "Operación" / "Resultado correcto").

## Glifos del fondo

**Cosmic** (15 símbolos en home/character/results):
`(x,y) → ↑ x y 0 (x,y) = 1 2 3 4 5 6 ▲ ?`

**Chalkboard** (10 símbolos en game):
`x y → ↑ 0 (x,y) 3 2 ? =`

## Copy específico

- **Slug**: `plano-cartesiano`.
- **Personaje destacado en el landing**: `geo` (Pita — geómetra).
- **Hero Home**: `EDINUN · Plano cartesiano`.
- **Descripción Home**: "Encuentra el tesoro en el plano usando
  coordenadas (x, y)."
- **Bocadillo del personaje en GameScreen** (CÓMO resolver):
  "Primero contá hacia la derecha (X), después hacia arriba (Y)."
- **Instrucción del ejercicio**:
  "¡Pon a {char.name} en (X, Y)!" — `char.name` es el personaje que el
  estudiante eligió en CharacterScreen.
- **catLabel** (HUD pill + reporte): "Plano cartesiano".

## Decisiones abiertas / riesgos

- **Tamaño del avatar y de las celdas**: actualmente 42 px por celda y
  avatar de 36 px. En mobile portrait letterboxed (375×667 lienzo
  escalado a ~37%), una celda se ve de ~16 px y el avatar de ~13 px —
  posiblemente demasiado pequeño para tap cómodo. Validar con captura
  y, si rompe, considerar:
  1. Aumentar tamaño de celda a 48 px (rejilla total 364 px, sigue
     cabiendo en zona-central 460 px).
  2. Permitir tap en celda como mecánica primaria (ya está implementado
     como fallback) — la celda completa es target de 16 px, mejor que
     el avatar solo.
- **Drag en mobile**: HTML5 drag and drop tiene soporte limitado en
  iOS Safari. El tap fallback cubre ese caso; si en QA se observa que
  el drag no funciona en iPhone, no es un bug — el tap es la
  experiencia primaria en mobile y funciona bien.
- **Cuadrante I únicamente**: la elección de no incluir cuadrantes II,
  III, IV mantiene la audiencia en 6–11 años sin enredarse con
  números negativos. Si en el futuro se quiere variante "advanced"
  con los 4 cuadrantes, conviene crear un juego separado en lugar de
  agregar nivel acá.
- **QA visual sin Playwright**: Chromium no se descargó en este
  entorno; la validación se hace por capturas que el usuario manda
  manualmente. Si en algún punto se completa la descarga (`npx
  playwright install chromium`), `node .planning/qa-checks.js` corre
  el flujo automático.
