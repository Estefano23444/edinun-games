# MEMORY.md — Plano cartesiano

Bitácora de este juego concreto. Para la historia del shell común
(pinch-zoom, DeviceStage, contadores, decisiones de marca) ver
`MEMORY.md` del juego `juegos/operaciones-basicas/`, que es el original
y arrastra todo ese contexto.

## Origen

Cuarto juego del repo `edinun-games`, creado tras `operaciones-basicas`,
`valor-posicional` y `operaciones-avanzadas`. Hereda intacto el shell
(`app.jsx`, `characters.jsx`, `logo.jsx`, `styles.css`) y sólo aporta
mecánica nueva.

## Tema y nivel (validados con el usuario)

| Nivel | catId   | Modo    | Contenido                                                |
|-------|---------|---------|----------------------------------------------------------|
| único | tesoro  | tesoro  | Plano cartesiano cuadrante I, coordenadas 0..6 (rejilla 7×7). Excluye el origen (0,0). |

Es el primer juego del repo con **un solo nivel**: en HomeScreen no hay
chips de dificultad y en el HUD del juego no hay tabs ni modal de
cambio de nivel. El catLabel "Plano cartesiano" se muestra como pill
estática centrada en el HUD.

## Decisión: mecánica espacial (Pattern 2 de la biblioteca)

A diferencia de los 3 juegos anteriores — todos basados en slots CDU —
este juego no tiene una "respuesta numérica" sino una posición
espacial. La pieza editable es:

- `CartesianGrid` (componente nuevo en `game-screens.jsx`) reemplaza al
  `EquationCanvas` del template. Renderiza:
  - Rejilla 7×7 con líneas blancas suaves; los ejes (X abajo, Y a la
    izquierda) se resaltan más fuerte.
  - Etiquetas 0..6 en ambos ejes con color dorado.
  - Tesoro 🏆 dibujado en la celda objetivo (decorativo,
    `pointer-events: none`).
  - Avatar pequeño del personaje seleccionado, posicionado sobre la
    celda actual del state `avatar`. Es `draggable`; al soltarlo en
    otra celda, el handler `onDrop` actualiza `avatar`.
  - Tap en una celda también la asigna como nueva posición del avatar
    (`onClick` en cada celda).
- El estado del juego es `{ avatar: {x, y} }`, no un array de slots.
- `verify()` compara `avatar` con `problem` directo (sin parsing).

## Decisión: VERIFICAR explícito, no auto-validar al soltar

Considerado: validar automáticamente al soltar el avatar. Descartado
porque en mobile (target principal, audiencia 6–11) el dedo se desliza
fácilmente y dispararía falsos positivos. Mejor mantener el botón
VERIFICAR que aparece en todos los demás juegos del repo. Botón
REINICIAR (en lugar de BORRAR) vuelve el avatar a (0,0) sin consumir
intento.

## Decisión: rango 0..6 (rejilla 7×7) y exclusión del origen

El usuario eligió 0..6 entre las opciones (0..5 / 0..6 / 0..8). 7×7
permite 48 celdas posibles excluyendo (0,0), suficiente para 3
ejercicios sin colisiones. Excluir el origen evita el caso degenerado
"el tesoro está donde ya estás parado" — siempre hay un movimiento que
hacer, lo cual también es importante para que el chequeo "Mueve a tu
personaje primero" en `verify()` no se dispare en un caso válido.

Tamaño de celda: 42 px × 42 px. Total de la rejilla: 28 (axisPad) + 7×42 = 322 px de ancho, 7×42 + 28 = 322 px de alto. Cabe sin problemas en la zona-central de 460×352 (incluso si bajara el tamaño en mobile portrait).

## Adaptación del log y reporte

`lastResult.log[i]` por ejercicio:
- `mode: "tesoro"`
- `a`: coordenada X correcta.
- `b`: coordenada Y correcta.
- `op`: `"→"` (símbolo neutro, sólo para no romper el contrato).
- `correctAnswer`: string `"(x, y)"` con la coordenada objetivo.
- `userAnswer`: string `"(x, y)"` con la coordenada elegida por el estudiante.
- `time`, `earned`, `isCorrect`: igual que siempre.

`formatOp(e)` en este juego retorna `"(x, y)"` cuando `e.mode ===
"tesoro"`, lo que cambia la columna "Operación" del reporte académico
a "Coordenadas". También se renombró el header de la tabla de
resultados a `Coordenadas` / `Coordenada correcta` para que el reporte
tenga sentido pedagógico.

## Archivos editados respecto al template

- `screens.jsx` — `CosmosBg` (glifos cartesianos: `(x,y)`, `→`, `↑`,
  `x`, `y`, `0..6`, `?`); `HomeScreen` con el bloque de chips
  reemplazado por una breve descripción del juego (ya que es 1 nivel
  único) y hero "EDINUN · Plano cartesiano"; `CharacterScreen.choose()`
  setea `currentCategory: "tesoro"` y `currentCatLabel: "Plano cartesiano"`
  fijos.
- `game-screens.jsx` — reescrito casi por completo:
  - `makeProblem("tesoro")` sortea (x, y) en 0..6 excluyendo origen.
  - `GameScreen` adaptado al modo espacial: state `avatar`, `errorCell`;
    funciones `reset()` y `verify()` simples; HUD sin tabs, con pill
    estática del catLabel en el centro; bocadillo nuevo; instrucción
    "¡Pon a {char.name} en (X, Y)!" en posición absoluta arriba.
  - `CartesianGrid` componente nuevo (rejilla, ejes, tesoro, avatar
    arrastrable + tap). Convención de coordenadas: (0,0) abajo-izq,
    Y crece hacia arriba (matemática estándar; CSS top se invierte
    con `cellTop(y) = (GRID_MAX - y) * cellSize`).
  - Acciones: VERIFICAR / REINICIAR / SALIR.
  - `formatOp` actualizado para entender `mode: "tesoro"`.
  - Tabla del reporte renombra "Operación" → "Coordenadas" y
    "Resultado correcto" → "Coordenada correcta".
- `app.jsx`, `characters.jsx`, `logo.jsx`, `styles.css`, `assets/*` —
  **no tocados** (shell heredado).

## Bundle

`powershell -ExecutionPolicy Bypass -File .planning\bundle.ps1` —
copia los 5 `.jsx` al bloque inline de `index.html` y `EDINUN GAMES.html`,
mantiene ambos idénticos byte a byte y bloquea cualquier `</script>`
literal en el JSX.

## Estado actual

Juego funcional con 1 nivel. Validación visual con el usuario por
capturas (Chromium para Playwright no descargado en este entorno).
Pendiente: confirmar que el avatar arrastrable se ve cómodo en mobile
portrait letterboxed (375×667) — la celda de 42 px tras el scale
puede quedar pequeña.
