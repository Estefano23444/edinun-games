# MEMORY.md — Pares ordenados

Bitácora de este juego concreto. Para la historia del shell común
(pinch-zoom, DeviceStage, contadores, decisiones de marca) ver
`MEMORY.md` del juego `juegos/operaciones-basicas/`, que es el original
y arrastra todo ese contexto.

## Origen

Quinto juego del repo `edinun-games`, creado tras `operaciones-basicas`,
`valor-posicional`, `operaciones-avanzadas` y `plano-cartesiano`. La
base se copió desde `plano-cartesiano` (en lugar del template
`assets/template-juego/`) para reutilizar el componente `CartesianGrid`
ya pulido visualmente — ejes con flechas, letras X (cian) e Y (rosa),
línea brillante en y=0 y x=0. El componente se renombró a
`CartesianBoard` y se generalizó para aceptar dos modos de uso:
modo "coords" (target decorativo) y modo "producto" (multi-selección
de marcas + resaltado de valores en los ejes).

## Tema y niveles (validados con el usuario)

| Nivel  | catId    | Modo     | Contenido                                                              |
|--------|----------|----------|------------------------------------------------------------------------|
| basic  | coords   | coords   | Lectura inversa: aparece (x, y) y el estudiante escribe la coordenada. |
| medium | producto | producto | A y B con \|A\|=\|B\|=2; marcar las 4 intersecciones de A × B.         |

Etiquetas literales en HomeScreen: **COORDENADAS / PRODUCTO CARTESIANO**
(el segundo en dos líneas por longitud). Layout 2 columnas
(`gridTemplateColumns: "1fr 1fr"`).

## Decisión: |A| = |B| = 2 fijo

El usuario pidió específicamente que A y B siempre tengan 2 elementos
cada uno. Esto da productos de exactamente 4 pares — manejable, claro
visualmente, y suficientemente pedagógico para introducir el concepto
sin abrumar. Si en el futuro se quiere variar, el `pickTwo()` de
`makeProblem` se puede generalizar a `pickN(n)` y se sortea n entre 2
y 3.

## Decisión: copia desde plano-cartesiano (no desde template-juego)

`assets/template-juego/` está pensado como base de operaciones (slots
CDU + numpad 0–9 + ecuación protagonista). Para pares-ordenados ya hay
un juego en el repo con la rejilla cartesiana funcionando — copiarlo es
más eficiente que adaptar el template y reescribir todo el grid. La
skill no prohíbe esta práctica, pero conviene documentarla para que un
mantenedor futuro entienda por qué `pares-ordenados` es muy similar a
`plano-cartesiano` en estructura.

## Decisión: usar "Pregunta" / "Respuesta correcta" en el reporte

En los demás juegos el reporte académico usa "Operación" / "Resultado
correcto". Aquí los ejercicios no son operaciones (son lecturas y
productos cartesianos), así que se renombró a "Pregunta" / "Respuesta
correcta" en la tabla del reporte. `formatOp(e)` adapta la presentación
según `e.mode`:
- `coords`: `"(x, y)"`.
- `producto`: `"{a1, a2} × {b1, b2}"`.
- (legacy "tesoro" o aritméticas): formato anterior.

## Archivos editados respecto a plano-cartesiano

- `screens.jsx` — `CosmosBg` con glifos cartesianos + `×, A, B`;
  `HomeScreen` con bloque de chips de 2 niveles; `CharacterScreen.choose()`
  con mapeo level → catId/catLabel para `coords` y `producto`; hero
  cambiado a "Pares ordenados".
- `game-screens.jsx` — reescrito casi completo:
  - Constantes geométricas extraídas (GRID_MAX, STEP, AXIS_PAD, TIP_PAD,
    cellLeft, cellTop) afuera de los componentes para que sean
    accesibles desde cualquier helper.
  - `makeProblem` con 2 modos: "coords" sortea (x,y) sin (0,0); "producto"
    sortea A y B con `pickTwo()` (2 valores únicos en 0..6) y arma
    `pares = A × B`.
  - `CartesianBoard` reemplaza a `CartesianGrid`. Acepta props opcionales:
    `target` (modo coords), `marked` + `toggleMark` (modo producto),
    `highlightA` y `highlightB` (resaltado en ejes para producto). NO
    incluye avatar (no hay personaje arrastrable en este juego).
  - `GameScreen` con state dual: `answer` (array de 2) para coords,
    `marked` (Set) para producto. `verify()` distingue por modo y
    construye `userAnswer`/`correctAnswer` apropiados.
  - HUD con 2 tabs (basic/medium); modal de cambio de nivel adaptado a
    2 entradas; `applyLevelChange` resetea ambos states.
  - Bandeja con slots `( [X], [Y] )` + numpad 0–6 SOLO en modo coords;
    oculta en modo producto.
  - Botón "BORRAR" / "REINICIAR" cambia de label según modo.
- `app.jsx`, `characters.jsx`, `logo.jsx`, `styles.css`, `assets/*` —
  **no tocados** (shell heredado).

## Bundle

`powershell -ExecutionPolicy Bypass -File .planning\bundle.ps1` —
copia los 5 `.jsx` al bloque inline de `index.html` y `EDINUN GAMES.html`,
mantiene ambos idénticos byte a byte y bloquea cualquier `</script>`
literal en el JSX.

## Estado actual

Juego funcional con los 2 niveles. Pendiente validación visual con
capturas del usuario. Aspectos a confirmar:
1. En modo `coords`, el punto cian se ve claramente sobre la rejilla
   y los slots ( [X], [Y] ) son legibles abajo.
2. En modo `producto`, el cartel "A = {a1, a2} × B = {b1, b2}" no se
   corta horizontalmente y los valores de A/B se resaltan
   correctamente en los ejes.
3. Los círculos dorados de marcas son fáciles de tocar en mobile
   portrait letterboxed (375×667).
