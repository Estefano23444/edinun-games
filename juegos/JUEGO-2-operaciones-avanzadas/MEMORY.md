# MEMORY.md — Operaciones avanzadas

Bitácora de este juego concreto. Para la historia del shell común
(pinch-zoom, DeviceStage, contadores, decisiones de marca) ver
`MEMORY.md` del juego `juegos/operaciones-basicas/`, que es el original
y arrastra todo ese contexto.

## Origen

Tercer juego del repo `edinun-games`, creado tras `operaciones-basicas`
y `valor-posicional`. Hereda intacto el shell (`app.jsx`,
`characters.jsx`, `logo.jsx`, `styles.css`) y solo aporta mecánica nueva
en `screens.jsx` (HomeScreen con 4 chips, CosmosBg con glifos `+ − × ÷ ,
±`, mapeo `level→catId/catLabel` extendido) y `game-screens.jsx`
(`makeProblem` con 4 modos, helpers `fmtNum/fmtAnswer/formatOpCell`,
componentes `AnswerSlot` y `EquationCanvas` extraídos para encapsular
los 4 layouts del cartel central, bandeja condicional con fichas `+`/`−`
en modo `ints`, modal de cambio de nivel con 4 entradas).

## Tema y niveles (validados con el usuario)

| Nivel    | catId    | Modo     | Contenido                                                                  |
|----------|----------|----------|----------------------------------------------------------------------------|
| basic    | vert3    | vert     | Sumas y restas verticales de 3 cifras (`100..999`).                        |
| medium   | horiz3   | horiz    | Mismas operaciones en una sola línea horizontal.                           |
| advanced | decimals | decimals | `+ − × ÷` con decimales; respuesta hasta 3 decimales.                      |
| expert   | ints     | ints     | Suma/resta de enteros con signo (`-20..20`); resultado puede ser negativo. |

Etiquetas literales en HomeScreen: **BÁSICO / MEDIO / AVANZADO / EXPERTO**.
Layout `gridTemplateColumns: "1fr 1fr 1fr 1fr"` (4 columnas en vez de 3).

## Decisión clave: 4 niveles sin tocar el shell

El shell estaba pensado para 3 niveles canónicos
(basic/medium/advanced) con sus colores fijos en `styles.css`. El
usuario pidió 4 niveles "sin cambiar la disposición de las plantillas
ni el formato establecido". Al revisar el código resultó que los chips
de `HomeScreen`, los tabs del HUD y el modal de cambio de nivel son
arrays literales en los `.jsx` LOCALES del juego — no parten del shell.
Por lo tanto:

- El cuarto nivel `expert` se agrega solo en `screens.jsx` y
  `game-screens.jsx` de **este juego**.
- El color `#b48aff` deriva del `--ed-violet` de la paleta cósmica ya
  existente. No se inventa variable CSS nueva.
- `app.jsx`, `characters.jsx`, `logo.jsx`, `styles.css` y los assets
  no se modifican. Los otros 2 juegos del repo siguen con 3 niveles
  sin enterarse.

Esta es la primera vez que un juego del repo se desvía de los 3 niveles
canónicos. Si en el futuro otro juego también necesita 4, conviene
considerar promover `--ed-expert` a `styles.css`. Por ahora, único caso.

## Decisión: división con decimales generada inversa

`makeProblem("decimals")` para la división **NO** sortea dividendo y
divisor independientes — eso podría producir cocientes con decimales
infinitos (ej: `1 ÷ 3 = 0,333…`) que no caben en 3 decimales. La
estrategia es:

1. Sortear el cociente con 1-2 decimales (rango `0,1..9,99`).
2. Sortear el divisor entero (`2..9`).
3. Calcular dividendo = cociente × divisor.

Así el ejercicio es exacto y siempre dentro del límite de 3 decimales.
Limitación: el divisor siempre es entero. Si se quiere divisor decimal,
hay que rediseñar el generador.

## Tooling

El repo no tenía Node.js cuando se creó este juego — se instaló con
`winget install OpenJS.NodeJS.LTS` (v24.15.0) y luego se instaló
Playwright en la raíz (`npm install --save-dev playwright`) para el QA
visual. El juego se re-empaqueta con `bundle.ps1` (PowerShell), no con
`bundle.py` (Python sigue siendo solo stub del Microsoft Store en este
entorno). Ver `.planning/qa-checks.md` para el flujo de QA con
Playwright.

## Archivos editados respecto al template

- `screens.jsx` — `CosmosBg` (glifos cosmic + chalkboard adaptados a
  signos de operaciones, decimales y signo `±`); `HomeScreen` con 4
  chips, descripciones nuevas, hero "EDINUN · Operaciones avanzadas";
  `CharacterScreen.choose()` con mapeo de 4 niveles a `vert3`/`horiz3`/
  `decimals`/`ints`.
- `game-screens.jsx` — `makeProblem` reescrito con `switch` para los
  4 modos y helpers `rand`, `countDecimals`, `fmtNum`, `formatOpCell`;
  componentes `AnswerSlot` y `EquationCanvas` añadidos para encapsular
  los 4 layouts del cartel central; `slotsSpec` (memo) calcula
  `{digitCount, signSlot, decimalAt, total}` según el modo; `press`,
  `verify` y `eraseAt` adaptados para signo y coma decimal; tabs HUD
  con 4 entradas; modal de cambio de nivel con 4 entradas; bandeja
  condicional (10 fichas en general, 12 fichas con `+`/`−` en modo
  `ints`); `formatOp` y `fmtAnswer` añadidos para imprimir coma
  decimal y paréntesis para negativos en el reporte académico.
- `app.jsx`, `characters.jsx`, `logo.jsx`, `styles.css`, `assets/*` —
  **no tocados** (shell heredado).

## Bundle

`powershell -ExecutionPolicy Bypass -File .planning\bundle.ps1` — copia
los 5 `.jsx` al bloque inline de `index.html` y `EDINUN GAMES.html`,
mantiene ambos idénticos byte a byte y bloquea cualquier `</script>`
literal en el JSX.

## Estado actual

Juego funcional con los 4 niveles. QA visual con Playwright en los 6
viewports canónicos pendiente de correr en cada iteración mientras se
afina el layout (especialmente del modo `decimals` con respuesta de 4+
dígitos y modo `ints` con resultado de 2 cifras + signo, donde el
ancho horizontal podría apretarse en mobile portrait letterboxed).
