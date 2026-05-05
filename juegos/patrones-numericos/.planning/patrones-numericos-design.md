# Patrones numéricos — diseño

## Tema

Juego de **patrones numéricos** (secuencias con regla aditiva,
multiplicativa o divisiva) para audiencia **9 años** (excepción al
default 6-8 del repo).

Mecánica única: secuencia con huecos + numpad. Lo que escala dentro
de la sesión es la **operación** del patrón:

- Ejercicio 1: suma o resta
- Ejercicio 2: multiplicación
- Ejercicio 3: división

## Niveles

**Un solo nivel.** Sin chips de dificultad en HomeScreen, sin tabs de
nivel en el HUD del juego. La sección de chips se reemplaza por una
descripción del juego que mantiene el peso visual de la columna
derecha del Home.

## Mecánica

### Generador de problemas

`makeProblem(cat, idx)` — el segundo argumento `idx` controla la
operación del ejercicio actual:

- **idx 0 — Suma o resta**:
  - Random isAdd. Step ∈ [2, 15].
  - Crecientes: start ∈ [1, 25], 6 términos.
  - Decrecientes: start ≥ (len-1)·step + 1 para que el último ≥ 1.
  - 2 huecos (intermedios).

- **idx 1 — Multiplicación**:
  - Factor ∈ [2, 5]. Largo según factor: ×2 → 6 términos, ×3 → 5,
    ×4 → 5, ×5 → 4 (para no explotar números).
  - Start ∈ [1, 2-3] según factor. Term[i] = start · factor^i.
  - Huecos: 2 si len ≥ 5, 1 si len = 4.

- **idx 2 — División**:
  - Divisor ∈ [2, 5]. Largo simétrico al de mult.
  - Start = divisor^(len-1). Term[i] = start / divisor^i.
  - **Garantiza naturales**: la secuencia siempre termina en 1.
  - Huecos como en mult.

### Selección de huecos

Posiciones candidatas: índices intermedios (1..len-2). Nunca el
primero ni el último — el chico necesita referencias en ambos
extremos para deducir la regla. Fisher-Yates shuffle para elegir.

### Input

- Numpad 0-9 en la bandeja inferior.
- Llenado izq→der: el numpad llena el primer slot vacío recorriendo
  los huecos en orden.
- Sin leading zeros: si el slot está vacío y se toca 0, se ignora.
- BORRAR: quita el último dígito ingresado.

### Slots dinámicos

Cada hueco tiene slots del **largo exacto** de la respuesta correcta:
- valor 8 → 1 slot
- valor 27 → 2 slots
- valor 256 → 3 slots

Esto pista visualmente al chico el tamaño esperado, lo cual es
deseable a esta edad.

### Validación

Comparación estricta: cada hueco debe tener exactamente el valor
correcto. No hay tolerancia ni equivalencias.

## Layout zona-central

```
        Completa el patrón
        RONDA 1 · SUMA O RESTA

   2    5    [_]    11    [_]    17

   [1][2][3][4][5][6][7][8][9][0]
```

- Wrapper width 580, height 340, top 100, `justifyContent: space-around`.
- Términos visibles: `<div>` con `minWidth` proporcional al largo del
  número, fontSize 40, color dorado.
- Huecos: agrupación de SlotBox de tamaño 44 (height ~57), borde
  dashed cuando vacío, sólido cuando lleno.
- `flexWrap: nowrap` — la secuencia debe entrar en una sola fila.

### Cuidado con anchos extremos

Casos peores en mult/div:
- ÷5: `625, 125, _, 5, 1` — max 3 dígitos, slot 1 dígito reemplazo.
- ×3: `2, 6, 18, 54, 162` — max 3 dígitos, 5 términos.
- ÷3: `243, 81, _, 9, 3, 1` — 6 términos con max 3 dígitos.

Anchos calculados: 6 términos × ~80px + 5 gaps × 10 = 530. Cabe en
580 con holgura.

## Adaptación del `lastResult.log`

| Campo           | Valor                                      |
| --------------- | ------------------------------------------ |
| `a`             | Secuencia visible (`"4, 11, ?, 25, ?, 39"`)|
| `b`             | Regla (`"+7"` / `"×3"` / `"÷2"`)           |
| `op`            | `"→"`                                      |
| `correctAnswer` | Huecos correctos CSV (`"18, 32"`)          |
| `userAnswer`    | Lo que escribió, CSV                       |

`ResultsScreen` se adapta para mostrar columnas separadas:
"Secuencia", "Regla", "Respuesta del estudiante", "Respuesta correcta"
en vez de la columna "Operación" típica de los demás juegos.

## Glifos del fondo

**Cosmic (15)** — Home/Character/Results:
`+ − × ÷ = → ↗ ↘ ? ··· … 2 3 5 10`

**Chalkboard (10)** — Game:
`+ − × ÷ = → ··· ? 2 5`

## Copy

- **Slug**: `patrones-numericos`
- **Personaje destacado en landing**: Cifra (numerólogo)
- **HomeScreen hero**: "EDINUN · Patrones numéricos"
- **Descripción Home**: "Descubre la regla de cada secuencia y completa los números que faltan."
- **Etiqueta de operaciones**: "Suma · Resta · Multiplicación · División"
- **catLabel HUD**: "Patrones numéricos"
- **Bocadillo del personaje**: "Descubre la regla del patrón."
- **Instrucción central**: "Completa el patrón"
- **Tipo por ronda** (subtítulo de la zona central):
  - idx 0 → "RONDA 1 · SUMA O RESTA"
  - idx 1 → "RONDA 2 · MULTIPLICACIÓN"
  - idx 2 → "RONDA 3 · DIVISIÓN"

## Decisiones abiertas / riesgos

- **Cantidad de términos en mult/div**: factor ×5 da solo 4 términos
  cómodos (1, 5, 25, 125). Si en QA se ve muy corto, considerar bajar
  el factor máximo a ×4.
- **Pista en bocadillo**: usé "Descubre la regla del patrón" porque
  cubre las 3 operaciones. Si el chico no entiende qué es "regla",
  cambiar a "Mira cómo cambian los números" o similar.
- **Validación binaria**: si el chico se equivoca en uno de los 2
  huecos pero acierta el otro, cuenta como incorrecto entero. Para
  ser más permisivo se podría dar crédito parcial — pero rompería el
  contrato del shell.
- **No hay modal de cambio de nivel** porque no hay tabs. Solo modal
  de salir, igual que en los demás juegos.
- **Ronda 3 ÷5 desde 625**: 625, 125, 25, 5, 1. El 625 puede chocar
  con la imagen de "saber tablas hasta 10" del usuario. Si lo
  considera muy alto, restringir a ÷2..÷4 o solo divisor 2 y 3 con
  secuencias más cortas.
