# Valor posicional — diseño

## Tema
Valor posicional de números naturales. El estudiante practica la
descomposición en órdenes (unidades, decenas, centenas, …, hasta cientos
de millón) ensamblando un número objetivo o leyendo y escribiendo
números en su forma decimal.

## Niveles

| Nivel        | Rango                              | catId  | catLabel                                |
|--------------|------------------------------------|--------|------------------------------------------|
| basic        | 11 – 40 (D + U)                    | vp40   | "Valor posicional - Hasta 40"            |
| medium       | 11 – 60 (D + U)                    | vp60   | "Valor posicional - Hasta 60"            |
| advanced     | 8 o 9 cifras (10 000 000 – 999 999 999) | vp9 | "Valor posicional - Números grandes"     |

Etiquetas en HomeScreen (texto literal en los botones): "Números hasta
el 40" · "Números hasta el 60" · "9 cifras". Las descripciones cortas
debajo del bloque hablan de la mecánica, no del rango ("Arma números
con barras y cubitos.", "Escribe números muy grandes.").

## Mecánica

Dos modos visuales según el nivel — la representación natural cambia
con el rango. Bloques de Dienes son intuitivos para 11–60 pero absurdos
para 9 cifras; dígitos posicionales con cartel narrado funcionan al
revés.

### Modo A — Bloques de Dienes (basic + medium)

- Centro de pantalla con dos contenedores grandes: **DECENAS** y
  **UNIDADES**.
- Bandeja inferior con dos botones: `+ DECENA` y `+ UNIDAD`. Al tocar,
  aparece una barra/cubito en el contenedor correspondiente.
- Contadores en vivo: "X · X0" sobre cada contenedor + "Total: XY"
  abajo. El número objetivo se muestra grande y dorado en la parte
  superior, junto a la instrucción "Arma este número con barras y
  cubitos:".
- Botón **QUITAR ÚLTIMO** (esquina derecha) deshace la última pieza
  agregada (no destructivo, no requiere modal).
- Botón **¡VERIFICAR!** compara `tens*10 + units` con el objetivo.
- Cap de piezas: 6 decenas en vp60, 4 en vp40; 9 unidades siempre.

Visualmente: barra = 18×140 px (10 segmentos apilados), cubito =
22×22 px. Colores: decenas naranja (`#f5a623`), unidades azul
(`#4fa0ff`). El borde y el glow del contenedor cambian a verde/rojo
con el feedback.

### Modo B — Slots posicionales con dígitos (advanced)

- Cartel dorado central con el número en palabras
  (`numberToSpanish()`): "doce millones trescientos cuarenta y cinco
  mil seiscientos setenta y ocho".
- Debajo: 9 slots con etiquetas **CMi DMi UMi   CM DM UM   C D U**
  (espacios visuales de 14 px entre los grupos de tres).
- Para problemas de 8 cifras, el slot CMi (índice 0) queda
  deshabilitado (opacidad 0.25, pointerEvents none) y muestra "—".
- Numpad 0–9 abajo. Drag-and-drop HTML5 hacia los slots; tap del
  numpad rellena el primer slot vacío de izquierda a derecha
  (lectura natural del enunciado, no derecha-izquierda como en CDU).
- Tap en un slot lleno lo borra. Drag entre slots los intercambia.

## Glifos del fondo

**Cosmic** (15 — Home/Character/Results):
`U`, `D`, `C`, `UM`, `DM`, `CM`, `UMi`, `DMi`, `CMi`, `+`, `=`,
`10`, `100`, `1 000 000`, `▮`.

**Chalkboard** (10 — GameScreen):
`U`, `D`, `C`, `M`, `+`, `=`, `10`, `100`, `?`, `▮`.

Las posiciones (`left`/`top`) y rotaciones de los `<span>` se mantienen
respecto al template; sólo cambia el contenido y se ajusta el
`fontSize` cuando el glifo es texto largo (`1 000 000`, `UMi`, `DMi`).

## Copy específico

```
HomeScreen:
  Hero label:          "EDINUN · Valor posicional"
  Botones de nivel:    "Números hasta el 40" / "Números hasta el 60" / "9 cifras"
  Descripción debajo:  basic/medium → "Arma números con barras y cubitos."
                       advanced     → "Escribe números muy grandes."

GameScreen:
  Bocadillo del personaje (CÓMO):
    basic/medium → "Toca barras y cubitos para armar el número."
    advanced     → "Arrastra los dígitos a su lugar."
  Instrucción central (QUÉ):
    basic/medium → "Arma este número con barras y cubitos:"
    advanced     → "Escribe el número que dice el cartel:"

ResultsScreen / reporte:
  Operación se imprime como "Armar 37" / "Armar 12 345 678".
  Respuesta y resultado aplican separador de millares (espacios).
```

## Personaje destacado en el landing

**Cifra** (`charId: "numero"`, El Numerólogo · Guardián de los
dígitos). Asociación temática directa con el manejo de cifras.

## Adaptación del log académico (`lastResult.log[i]`)

```js
{
  idx, time, earned, isCorrect,
  a:           númeroObjetivo,    // 37 / 458720391
  b:           cantidadDeCifras,  // 2 / 8 / 9
  op:          "VP",
  correctAnswer: númeroObjetivo,
  userAnswer:    númeroQueArmó,
}
```

`formatOp(e)` y `fmtAnswer(value, op)` en `game-screens.jsx`
formatean estos campos para el reporte.

## Decisiones abiertas / riesgos

- **Tap-to-place del numpad en advanced**: rellena de izquierda a
  derecha (lectura natural del cartel) en vez de derecha-izquierda
  como hacía la mecánica CDU original. Justificación: el estudiante
  lee "doce millones …" y va escribiendo en orden. Si en QA
  observamos que confunde, revertir a derecha-izquierda.
- **`numberToSpanish` cubre hasta 999 999 999** y maneja los casos
  especiales "un millón" (singular), "mil" (sin "uno"), "cien"
  (vs "ciento"). No maneja decimales ni signos. Suficiente para
  vp9; revisar si en el futuro se añade un nivel con miles de
  millones.
- **Caps por nivel** (4 decenas en vp40, 6 en vp60): evita que el
  estudiante meta 7 decenas para "armar 35" sin verificación. El
  botón se deshabilita al llegar al cap.
- **No hay modal en QUITAR ÚLTIMO** ni en el botón BORRAR del
  numpad: ambos quitan **una sola** pieza/dígito, no toda la
  ronda. Si se cambia a "vaciar" entonces sí requeriría modal
  (USER.md punto 3).
