# Operaciones avanzadas — diseño

## Tema

Operaciones aritméticas más allá del nivel del juego `operaciones-basicas`:
sumas y restas con números de 3 cifras (vertical y horizontal), las cuatro
operaciones con decimales, y suma/resta de enteros con signo (incluyendo
resultados negativos). Audiencia 6–11 años: el estudiante elige el botón
de nivel según lo que pueda resolver.

## Niveles

| id        | catId     | catLabel                  | Tema                                                                    |
|-----------|-----------|---------------------------|-------------------------------------------------------------------------|
| basic     | vert3     | Vertical · 3 cifras       | Sumas y restas verticales de 3 cifras (rango `100..999`).               |
| medium    | horiz3    | Horizontal · 3 cifras     | Mismas operaciones pero presentadas en una sola línea horizontal.       |
| advanced  | decimals  | Decimales combinados      | `+ − × ÷` con decimales; resultado puede tener hasta 3 decimales.       |
| expert    | ints      | Enteros con signo         | Suma y resta de enteros (`-20..20`); el resultado puede ser negativo.   |

Etiquetas en HomeScreen: **BÁSICO / MEDIO / AVANZADO / EXPERTO**. El cuarto
chip usa el violeta cósmico `#b48aff` (derivado de `--ed-violet`) para
mantener coherencia con la paleta del repo sin inventar variables CSS
nuevas. Layout Home: 4 columnas (`gridTemplateColumns: "1fr 1fr 1fr 1fr"`).
Tabs HUD del juego con 4 entradas, modal de cambio de nivel extendido a
los 4 niveles.

**Decisión clave**: el cuarto nivel se acomodó solo tocando los `.jsx`
locales del juego (`screens.jsx`, `game-screens.jsx`). El shell compartido
(`app.jsx`, `characters.jsx`, `logo.jsx`, `styles.css`) no se modificó —
los otros juegos del repo siguen con 3 niveles sin enterarse.

## Mecánica

Patrón base: **Pizarra con ecuación + slots CDU** (Pattern 1 de la
biblioteca), pero con cuatro layouts visuales según `problem.mode`.

### Modo `vert` (basic)

Cuenta vertical "de papel": sumandos apilados, línea de fracción y slots
debajo. Misma rejilla CDU que `operaciones-basicas` pero forzada a 3
cifras y sólo +/−.

### Modo `horiz` (medium)

Ecuación en una línea: `[a] [op] [b] = [_][_][_]`. Sin columnas verticales,
los operandos se muestran como números planos. La regla "de derecha a
izquierda" sigue valiendo en los slots de respuesta.

### Modo `decimals` (advanced)

Ecuación horizontal con coma decimal **fija** (no es ficha arrastrable):

```
a,d  OP  b,d  =  [_][_],[_]
```

`makeProblem` controla la cantidad de decimales del resultado:
- `+`/`−`: operandos con 1 decimal cada uno → respuesta con 1 decimal.
- `×`: operandos con 1 decimal cada uno → respuesta con hasta 2 decimales.
- `÷`: respuesta con 1 o 2 decimales (generada inversa: `dividendo = ans·divisor`).

El componente `EquationCanvas` calcula `slotsSpec.decimalAt` (índice del
último dígito de la parte entera) y renderiza la coma como `<span>` fijo
entre los slots correspondientes.

### Modo `ints` (expert)

Ecuación horizontal con paréntesis para los operandos negativos:

```
(−a)  OP  (b)  =  [signo][_][_]
```

El primer slot acepta solo `+` o `−` (fichas violetas extra en la bandeja).
Los slots de dígitos se llenan de derecha a izquierda como siempre. La
verificación reconstruye el número con el signo y compara contra
`problem.answer` que sí puede ser negativo.

### Validación

Función `verify()` en `GameScreen`:
- `vert`/`horiz`: `parseInt(slots.join(""), 10) === problem.answer`.
- `decimals`: split por `slotsSpec.decimalAt` → `parseFloat("intPart.decPart")`,
  comparación con tolerancia `< 0.005` para evitar errores de coma flotante.
- `ints`: signo del primer slot + `parseInt` de los dígitos → comparar
  contra `problem.answer` con signo.

Estrellas, tiempo, modal de salida, modal de cambio de nivel, contrato de
`lastResult` — heredados intactos del template.

### Adaptación del log

Cada `entry` del `lastResult.log` ahora lleva `mode` además de los campos
estándar. `formatOp(e)` y `fmtAnswer(e.userAnswer, e.mode)` se encargan
de mostrar coma decimal en el reporte académico (en vez de punto JS) y
paréntesis en los negativos.

## Glifos del fondo

**Cosmic** (15 símbolos, en home/character/results):
`+ − × ÷ = , 3 5 9 0 7 1 ? (−)` (los signos protagonistas, decimales con
coma, números aleatorios).

**Chalkboard** (10 símbolos, en game):
`+ − × ÷ = , 9 0 ? ±` (mismo lenguaje, más despejado para no competir
con la ecuación central).

## Copy específico

- **Slug**: `operaciones-avanzadas`.
- **Personaje destacado en el landing**: `mago` (Merlín) — para variar
  respecto a `operaciones-basicas` y `valor-posicional`, ambos con Cifra.
- **Línea hero Home**: `EDINUN · Operaciones avanzadas`.
- **Descripción debajo del chip activo**:
  - basic: "Cuentas verticales de 3 cifras."
  - medium: "Cuentas en una línea, 3 cifras."
  - advanced: "Operaciones con números con coma."
  - expert: "Operaciones con números negativos."
- **Bocadillo del personaje en GameScreen** (CÓMO, no qué; cambia por modo):
  - vert: "Empieza por las unidades."
  - horiz: "Toca un dígito y se va al casillero."
  - decimals: "Cuidado con la coma — fíjate dónde va."
  - ints: "Primero el signo, después el número."
- **Instrucción del ejercicio (siempre)**: `Resuelvelo`.
- **catLabel en HUD/reporte**: el de la tabla de niveles.

## Decisiones abiertas / riesgos

- **División con decimales**: para evitar resultados infinitos (1/3 = 0,333…),
  `makeProblem("decimals")` genera la división **inversa** — primero sortea
  el cociente con 1-2 decimales, luego calcula el dividendo. Así nunca
  aparece un caso pedagógicamente sucio. Limitación: el divisor siempre
  es entero (2-9). Si más adelante se quiere divisor decimal, la lógica
  hay que reescribirla.
- **Layout horizontal angosto**: en modo `decimals` con respuesta de 4
  dígitos + coma + 2 decimales, el ancho total de la ecuación se acerca
  a los 580 px del wrapper. Validar con QA visual en mobile (375×667
  letterboxed). Si rompe, reducir `fontSize` del cartel a 36 o ajustar
  los `width` de los slots a 44 px.
- **Modo `ints` con resultado de 2 cifras**: el slot de signo + 2 dígitos
  ocupan ~180 px. Encaja sin problema en horiz, pero el QA debe confirmar
  que el bocadillo no se superpone (riesgo del pasado documentado en
  `layout-grid.md`).
