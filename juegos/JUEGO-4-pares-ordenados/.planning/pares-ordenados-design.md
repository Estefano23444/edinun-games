# Pares ordenados — diseño

## Tema

Plano cartesiano cuadrante I, coordenadas 0..6. Dos niveles que avanzan
de **lectura de coordenadas** (interpretar un punto en el plano) a
**producto cartesiano** (formar todos los pares de A × B). Audiencia
6–11 años; el segundo nivel introduce notación de conjuntos `{...}` y la
operación `×` en un contexto visual concreto (puntos en una rejilla),
no abstracto.

## Niveles

| id     | catId    | catLabel             | Contenido                                                                |
|--------|----------|----------------------|--------------------------------------------------------------------------|
| basic  | coords   | Coordenadas          | Aparece UN punto en el plano; el estudiante escribe su (X, Y).           |
| medium | producto | Producto cartesiano  | Conjuntos A y B con \|A\| = \|B\| = 2; marcar las 4 intersecciones de A×B. |

Etiquetas Home: **COORDENADAS / PRODUCTO\nCARTESIANO** (2 columnas, naranja
+ amarillo). Tabs HUD del juego con los mismos 2 nombres. Modal de
cambio de nivel extendido a 2 entradas.

## Mecánica

### Modo `coords` (basic) — lectura inversa

- Plano cartesiano 7×7 con un **punto cian** dibujado en (problem.x,
  problem.y). El punto es decorativo (no se mueve).
- Cartel arriba: `¿Cuál es la coordenada del punto?`
- Slots: `( [X] , [Y] )` con dos casilleros centrados en la bandeja.
- Numpad de fichas 0–6 abajo. Cada toque rellena el primer slot vacío
  de izquierda a derecha (X primero, después Y) — orden de lectura
  natural de coordenadas.
- Tap en un slot lleno lo borra. Botón BORRAR borra el último colocado.
- VERIFICAR compara `(answer[0], answer[1])` con `(problem.x, problem.y)`.

### Modo `producto` (medium) — multi-selección

- Plano cartesiano 7×7. Sin punto fijo previo.
- Cartel arriba muestra los conjuntos: `Marca todos los pares de
  A = {1, 3}   ×   B = {2, 5}`.
- En los **ejes** del plano se resaltan los valores de A (cian fuerte
  en el eje X) y de B (rosa fuerte en el eje Y) para guiar visualmente
  qué intersecciones forman A × B.
- El estudiante toca cada intersección (hit-area circular de 36 px en
  la celda). Cada toque alterna marcado/desmarcado. La marca es un
  círculo dorado de 22 px centrado en la intersección.
- Botón REINICIAR (en lugar de BORRAR) desmarca todos los puntos.
- VERIFICAR compara el `Set` de marcas con el `Set` correcto:
  - Vacío → "Marca al menos un par" (no consume intento).
  - Diferente al correcto → cuenta como intento incorrecto.
  - Igual al correcto → ¡correcto!

### Generación

- `coords`: (x, y) random en `[0, GRID_MAX]`, excluye (0,0).
- `producto`: A y B son cada uno 2 valores random distintos en
  `[0, GRID_MAX]` (ordenados). Producto siempre tiene exactamente 4
  pares.

### Layout (lienzo 900×540)

```
┌──────────────────────────────────────────────────────┐
│ HUD: [logo]   COORDENADAS | PRODUCTO    [⏱][⭐]      │
├──────────────┬──────────────────────────┬────────────┤
│ bocadillo    │ ¿Cuál es la coord. ?     │ ¡VERIFIC.! │
│ (arriba del  │ (o A={...} × B={...})    │ BORRAR/REI.│
│  personaje)  │                          │ SALIR      │
│              │  ↑ Y                     │            │
│              │  6 . . . . . . .         │            │
│              │  5 . . . . . . .         │            │
│              │  4 . . . . . . .         │            │
│              │  3 . . . . . . .         │            │
│              │  2 . . . . . . .         │            │
│              │  1 . . . . . . .         │            │
│              │  0 ─────────── X →       │            │
│              │    0 1 2 3 4 5 6         │            │
│ [Personaje]                                          │
├──────────────┴──────────────────────────┴────────────┤
│ ( [X] , [Y] )    [0][1][2][3][4][5][6]   ← solo en   │
│                                            modo coords│
└──────────────────────────────────────────────────────┘
```

Mapeo zonas → elementos:
- HUD          → `(0..900, 0..56)`
- Bocadillo    → `(12..240, 130..240)` (arriba del personaje)
- Personaje    → `(0..220, 360..540)` (esquina inf izq)
- Zona-central (rejilla) → `(260..720, 120..440)`
- Acciones    → `(740..888, 80..420)`
- Bandeja (slots + numpad, solo coords) → `(180..720, 460..540)`
- En modo `producto` la bandeja no se muestra; la rejilla absorbe el
  espacio inferior.

### Adaptación del log y reporte

`lastResult.log[i]` por ejercicio:
- `mode: "coords"` o `"producto"`.
- `coords`: `a` = X correcta, `b` = Y correcta, `op` = "→",
  `correctAnswer = "(x, y)"`, `userAnswer = "(ux, uy)"`.
- `producto`: `a` = `"{a1, a2}"`, `b` = `"{b1, b2}"`, `op` = "×",
  `correctAnswer` y `userAnswer` son strings del tipo
  `"{(1, 2), (1, 5), (3, 2), (3, 5)}"` (ordenados alfabéticamente
  para que la comparación visual sea estable).
- `formatOp(e)` retorna `"(x, y)"` para coords y `"{...} × {...}"` para
  producto. La columna del reporte se renombra a "Pregunta" /
  "Respuesta correcta" para que el lenguaje sirva en ambos modos.

## Glifos del fondo

**Cosmic** (15 símbolos en home/character/results):
`(x,y) × A B x y = 1 2 3 4 0 (,) ↑ ?`

**Chalkboard** (10 símbolos en game):
`(x,y) → ↑ x y 0 (x,y) 3 2 ? =`

## Copy específico

- **Slug**: `pares-ordenados`.
- **Personaje destacado en el landing**: `numero` (Cifra) — para variar
  respecto a Pita en `plano-cartesiano`.
- **Hero Home**: `EDINUN · Pares ordenados`.
- **Descripción Home** (cambia con el chip activo):
  - basic: "Lee la coordenada del punto."
  - medium: "Marca todos los pares de A × B."
- **Bocadillo del personaje en GameScreen**:
  - coords: "Mira el punto: primero cuenta X, después Y."
  - producto: "Toca cada punto del producto A × B."
- **Instrucción del ejercicio** (cartel arriba):
  - coords: `¿Cuál es la coordenada del punto?`
  - producto: `Marca todos los pares de A = {a1, a2} × B = {b1, b2}`.
- **catLabel** (HUD pill + reporte): "Coordenadas" / "Producto cartesiano".

## Decisiones abiertas / riesgos

- **Reusa `CartesianBoard`** del juego `plano-cartesiano` (constantes
  geométricas + ejes + flechas + letras X/Y prominentes). Las
  diferencias se aíslan en props: `target` (coords) vs `marked` +
  `toggleMark` (producto), más `highlightA`/`highlightB` para resaltar
  los valores de los conjuntos en los ejes en modo producto.
- **Hit-area de las marcas (modo producto)**: círculo invisible de
  36 px sobre cada intersección. En mobile portrait letterboxed (lienzo
  escalado a ~37%), eso queda en ~13 px reales — en el límite del
  touch target mínimo. Validar con captura real; si rompe, ampliar
  hit-area a 44 px.
- **Notación de conjuntos**: el cartel muestra `A = {1, 3}` con coma y
  espacio. Para 6–11 años puede confundirse con coordenadas; el copy
  del bocadillo aclara que se busca "el producto A × B". Si el usuario
  reporta confusión, considerar usar guiones u otro separador (`A:
  1, 3`).
- **Repetición de ejercicios**: con 4 puntos posibles para cada
  combinación de A y B, y 3 ejercicios por sesión, la probabilidad de
  ver dos ejercicios idénticos es muy baja (no se desreplican
  explícitamente).
- **QA visual sin Playwright**: validación se hace por capturas que el
  usuario manda manualmente.
