# Fracciones — diseño

## Tema

Juego de **fracciones** para el segundo ciclo escolar (audiencia 9-12
años, excepción al default 6-8 del repo). Tres niveles que cubren la
introducción visual a fracciones, equivalencia (amplificación y
simplificación) y la conexión entre fracciones decimales y números
con coma.

## Niveles

| Chip Home              | catId   | catLabel                       | Mecánica                                              |
| ---------------------- | ------- | ------------------------------ | ----------------------------------------------------- |
| FRACCIONES (basic)     | `frac1` | "Fracciones"                   | Pinta porciones de pizza (tap)                        |
| EQUIVALENTES (medium)  | `frac2` | "Equivalentes"                 | Dos pizzas + slot del numerador equivalente           |
| DECIMALES (advanced)   | `frac3` | "Decimales y fracciones"       | Barra (10) o cuadrícula (10×10) + slots frac y dec    |

Descripciones bajo los chips:
- "Reconoce y representa fracciones"
- "Amplifica y simplifica"
- "Décimas y centésimas"

## Mecánica

### `frac1` — Pinta porciones

Una pizza SVG dividida en N porciones (denom 3..10). El bocadillo
dice "Tocá las porciones para representarla" y el cartel central
"Pintá {a}/{b}". Tap pinta una porción de dorado; segundo tap la
despinta. Botón VERIFICAR exige ≥1 porción pintada y valida que
`painted.size === num`. Botón BORRAR vacía todas las porciones.

**Validación por cantidad, no por posición**: cualquier subconjunto
de tamaño correcto es válido. Pedagógicamente correcto.

### `frac2` — Equivalentes

Dos pizzas lado a lado:
- **A** (izquierda): denom `b`, pre-pintada con `a` porciones, dorado
  sólido. Debajo, la fracción `a/b` en formato apilado.
- **B** (derecha): denom `d`, autopinta en vivo según el valor
  escrito en el slot. Debajo, slot dashed `[?]/d` que se llena con
  el numpad.

Pregunta central: "Amplifica la fracción" o "Simplifica la fracción"
según el modo (60% amplificación, 40% simplificación). Casos
generados desde dos listas hardcoded (numerador y denominador hasta
12, todas las fracciones tienen factor entero).

Validación: `parseInt(numAnswer, 10) === cAns`.

### `frac3` — Decimal → Fracción (dificultad creciente por ejercicio)

Mecánica revisada el 2026-05-05 tras feedback de la primera versión
(que pedía representar décimas/centésimas en barras y cuadrículas).
La nueva forma muestra un **decimal** y pide la fracción equivalente:

- **Ejercicio 1** (idx=0) — décima exacta: `0,5 / 0,2 / 0,4 / 0,6 /
  0,8`. Fracciones esperadas: 1/2, 1/5, 2/5, 3/5, 4/5.
- **Ejercicio 2** (idx=1) — centésima exacta: `0,25 / 0,75 / 0,05 /
  0,15 / 0,35 / 0,40 / 0,45 / 0,04`. Fracciones esperadas con
  denominadores 4, 5, 20, 25.
- **Ejercicio 3** (idx=2) — decimal periódico puro: `0,333… /
  0,666… / 0,111… / 0,222… / 0,444… / 0,555… / 0,777… / 0,888…`.
  Fracciones esperadas con denominadores 3 y 9.

Notación: los periódicos se escriben con tres puntos `…` después de
la cifra que se repite (no con la rayita matemática), por
legibilidad para 9-12 años.

**Mecánica de input**: el estudiante ve el decimal grande y al lado
una fracción vacía con dos slots de numerador (apilados arriba) y
dos slots de denominador (apilados abajo). Numpad 0-9 en la
bandeja. Llenado: numerador primero (izq→der), luego denominador.
BORRAR remueve el último dígito (denom. der→izq, luego num. der→izq).

**Validación permisiva — acepta cualquier fracción equivalente**:
con cross-multiplication `userNum * problem.denom === problem.num
* userDenom`. Ejemplos para `0,5`: 1/2, 2/4, 3/6, 5/10, 50/100,
49/98 — todas válidas. Esto permite que un estudiante que aún no
simplifica también pueda acertar; la simplificación se sugiere en
el bocadillo del personaje pero no se exige.

**Slot máximo 2 dígitos** por numerador y por denominador (acota
implícitamente el rango de equivalentes razonables). Leading zeros
se aceptan (`01/02 = 1/2`, válido). Denom 0 → error explícito.

Renderizado del decimal: `fontSize 64, color #fce9a8, glow dorado`,
para que sea el foco visual del ejercicio.

## Glifos del fondo

**Cosmic** (15 — Home / Character / Results):
`½ ⅓ ¼ ⅔ ¾ ⅖ ⅛ / = ÷ % 0,5 0,25 0,75 ≡`

**Chalkboard** (10 — Game):
`½ ⅓ ¼ / = 0,5 0,75 0,3 ÷ ?`

## Copy específico

- **Slug**: `fracciones`
- **URL**: `edinun.com/edinun-games/juegos/fracciones/`
- **Personaje destacado en landing**: Pita (la geómetra)
- **HomeScreen hero**: "EDINUN · Fracciones"
- **Bocadillo del personaje** (CÓMO resolver):
  - frac1: "Tocá las porciones para representarla."
  - frac2: "Encontrá el numerador equivalente."
  - frac3: "Escribí la fracción y el decimal."
- **Instrucción central** (QUÉ resolver):
  - frac1: `Pintá {num}/{denom}`
  - frac2: `Amplifica la fracción` / `Simplifica la fracción`
  - frac3: `Mirá la barra y escribí` / `Mirá la cuadrícula y escribí`

## Adaptación del `lastResult.log`

| Campo           | frac1                  | frac2                  | frac3                              |
| --------------- | ---------------------- | ---------------------- | ---------------------------------- |
| `a`             | numerador              | `"a/b"` (string)       | `"n/denom"` (string)               |
| `b`             | denominador            | `"?/d"` (string)       | `"0,xx"` (string)                  |
| `op`            | `"/"`                  | `"="`                  | `"="`                              |
| `correctAnswer` | `"num/denom"`          | `"cAns/d"`             | `"n/denom = 0,xx"`                 |
| `userAnswer`    | `"painted/denom"`      | `"v/d"`                | `"frac/denom = 0,dec"`             |

Esto satisface el contrato de `ResultsScreen.formatOp(e)` que imprime
`{a} {op} {b}` en la columna "Ejercicio" del reporte. Para frac2 y
frac3 los valores `a` y `b` se renderizan como strings descriptivos
en vez de números, lo cual es legible aunque no aritmético.

## Decisiones abiertas / riesgos

- **Pizza con denom 9-10** tiene slices estrechos (~36° o 40°).
  Touch target externo ≥ 40px de ancho con tamaño 260; debería
  estar bien para 9-12 años. Validar con QA visual.
- **Cuadrícula 100 cuadritos en centésimas**: cada cuadrito 18px.
  No es interactivo (solo lectura), pero podría verse apretado en
  viewports pequeños. El DeviceStage escala el lienzo entero, así
  que mantiene proporción.
- **Autopinta en vivo en frac2**: da pista visual fuerte. Decisión
  consciente: aprovechar la mecánica visual también para
  retroalimentación inmediata. Si se quiere endurecer
  pedagógicamente, basta sacar `painted={...}` del segundo Pizza.
- **Centésimas sin múltiplos de 10**: la implementación rechaza N
  múltiplo de 10 (loop while). Reduce el espacio de problemas pero
  evita que "20/100 = 0,20" coincida con "2/10 = 0,2".
- **Sin drag-and-drop**: el numpad es solo tap (en el shell original
  el numpad era draggable, pero la mecánica de fracciones no lo
  requiere). Se puede agregar dragstart si se quiere paridad con
  los otros juegos.
- **QA visual**: pendiente correr en los 6 viewports. La cuadrícula
  10×10 es el caso más arriesgado para overflow vertical.
