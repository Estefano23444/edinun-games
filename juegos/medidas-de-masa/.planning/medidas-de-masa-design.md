# Medidas de masa — diseño

## Tema

Juego de **conversión de unidades de masa** (múltiplos del gramo y
libra) para audiencia **9 años** (excepción al default 6-8 del repo,
igual que `patrones-numericos`).

Mecánica única: conversión con numpad. Lo que escala dentro de la
sesión es la **operación**:

- Ejercicio 1: SOLO multiplicación (mayor → menor, par aleatorio en kg→mg)
- Ejercicio 2: SOLO división (menor → mayor, par aleatorio en kg→mg)
- Ejercicio 3: kg ↔ libra (factor 2,2)

## Niveles

**Un solo nivel.** Sin chips de dificultad en HomeScreen, sin tabs de
nivel en el HUD del juego. La sección de chips se reemplaza por una
descripción del juego que mantiene el peso visual de la columna
derecha del Home.

## Unidades cubiertas

Múltiplos y submúltiplos del gramo, más libra como unidad imperial:

| Unidad | Símbolo | Equivalencia |
| ------ | ------- | ------------ |
| kilogramo | kg  | 1000 g       |
| hectogramo | hg | 100 g        |
| decagramo | dag  | 10 g         |
| gramo  | g       | 1 g          |
| decigramo | dg   | 0,1 g        |
| centigramo | cg  | 0,01 g       |
| miligramo | mg   | 0,001 g      |
| libra  | lb      | 1 kg = 2,2 lb |

Originalmente el alcance era "solo múltiplos del gramo", pero el
usuario lo expandió a la escala completa kg→mg en la segunda iteración
(2026-05-06) para que las rondas 1 y 2 cubrieran cualquier par
adyacente o separado por 2 en la escala.

## Restricción de tope: 7 cifras

**Tope 7 cifras (≤ 9.999.999) y respuestas enteras.** El usuario
pidió permitir cualquier par en la escala kg→mg, lo que incluye
`1 kg = 1.000.000 mg` (7 cifras). Implicaciones:

- En ronda 1 (×): `fromValue` siempre es 1..9 (chico). `answer` puede
  llegar a 9.000.000 cuando el par es kg↔mg.
- En ronda 2 (÷): `answer` siempre es 1..9. `fromValue = answer × factor`,
  por lo que `fromValue` puede llegar a 9.000.000.
- En libras (ronda 3), pool entero ≤ 999 (no afectado).

## Mecánica

### Generador de problemas

`makeProblem(cat, idx)` — el segundo argumento `idx` controla la
distancia del ejercicio actual:

- **idx 0 — Solo multiplicación**:
  - Sortea dos posiciones distintas en la escala kg→hg→dag→g→dg→cg→mg.
  - Origen = unidad mayor (índice menor). Destino = unidad menor.
  - Factor = 10^(distancia entre posiciones). Va de ×10 a ×1.000.000.
  - `fromValue` aleatorio 1..9. `answer = fromValue × factor`.
  - Ejemplos: `5 kg = ? mg` → 5.000.000 · `3 hg = ? cg` → 30.000 ·
    `7 dag = ? g` → 70 · `2 g = ? dg` → 20.

- **idx 1 — Solo división**:
  - Mismo sorteo de posiciones. Dirección invertida: origen = menor,
    destino = mayor.
  - Factor = 10^(distancia). Va de ÷10 a ÷1.000.000.
  - `answer` aleatorio 1..9. `fromValue = answer × factor` (garantiza
    que la división dé un entero limpio).
  - Ejemplos: `5.000.000 mg = ? kg` → 5 · `300 g = ? hg` → 3 ·
    `40 cg = ? dg` → 4.

- **idx 2 — kg ↔ lb**:
  - Factor `1 kg = 2,2 lb` mostrado en pantalla siempre.
  - Pool entero (multiplos de 5 kg / 11 lb), todos ≤ 999:

  | kg  | lb  |
  | --- | --- |
  | 5   | 11  |
  | 10  | 22  |
  | 15  | 33  |
  | 20  | 44  |
  | 25  | 55  |
  | 50  | 110 |
  | 100 | 220 |
  | 150 | 330 |
  | 200 | 440 |
  | 250 | 550 |
  | 300 | 660 |
  | 400 | 880 |
  | 450 | 990 |

  - Random elige par y dirección.
  - Ejemplos: `5 kg = ? lb` → 11, `220 lb = ? kg` → 100.

### Input

- Numpad 0-9 en la bandeja inferior.
- Llenado del slot único: dígito a dígito hasta el largo del slot.
- Sin leading zeros: si el slot está vacío y se toca 0, se ignora.
- BORRAR: quita el último dígito ingresado.

### Slots dinámicos

El slot tiene el **largo exacto** de la respuesta correcta:
- valor 4 → 1 slot
- valor 50 → 2 slots
- valor 700 → 3 slots

Esto pista visualmente el tamaño esperado, deseable a esta edad.

### Validación

Comparación estricta entera: el slot debe tener el valor exacto.
Sin tolerancia.

## Layout zona-central

```
        Convierte la unidad

           5 dag  =  [_ _]  g

   [1][2][3][4][5][6][7][8][9][0]
```

En ronda 3 (libras) se agrega la línea del factor visible:

```
        Convierte la unidad

         1 kg = 2,2 lb

           5 kg  =  [_ _]  lb

   [1][2][3][4][5][6][7][8][9][0]
```

- Wrapper width 580, height 340, top 100, `justifyContent: space-around`.
- Ecuación: `<div>` con value + unidad a la izquierda, `=`, slot, unidad a la derecha. Todo en una fila.
- Términos visibles: fontSize 40, color dorado (igual que patrones).
- Slots: SlotBox 44×57, dashed cuando vacío, sólido cuando lleno.
- Factor en ronda 3: línea pequeña sobre la ecuación (fontSize 24, color dorado tenue).

## Adaptación del `lastResult.log`

| Campo           | Valor                                      |
| --------------- | ------------------------------------------ |
| `a`             | Lado izquierdo (`"5 dag"`)                 |
| `b`             | Lado derecho con unidad (`"? g"`)          |
| `op`            | `"="`                                      |
| `correctAnswer` | Valor numérico correcto (`"50"`)           |
| `userAnswer`    | Valor que escribió el chico                |

`ResultsScreen` muestra columnas: "Conversión", "Operación" (`=`),
"Respuesta del estudiante", "Respuesta correcta". El shell soporta
este formato sin tocarlo.

## Glifos del fondo

**Cosmic (15)** — Home/Character/Results:
`g dag hg kg lb = → ↗ ↘ ? × ÷ 10 100 2,2`

**Chalkboard (10)** — Game:
`g kg lb = → × ÷ 10 100 2,2`

## Copy

- **Slug**: `medidas-de-masa`
- **Personaje destacado en landing**: Nova (`charId: "fisica"`)
- **HomeScreen hero**: "EDINUN · Medidas de masa"
- **Descripción Home**: "Convierte entre gramos, decagramos, hectogramos, kilogramos y libras."
- **Etiqueta de operaciones**: "Múltiplos del gramo · Libras"
- **catLabel HUD**: "Medidas de masa"
- **Bocadillo del personaje**: "Convirtamos masa entre unidades."
- **Instrucción central**: "Convierte la unidad"
- **Sin subtítulo de ronda en la zona-central** (igual que la mayoría
  de juegos del repo, no como patrones-numericos).

## Decisiones abiertas / riesgos

- **Tope 3 cifras excluye kg ↔ g**: el usuario lo aceptó después de
  que se lo advertimos. Si en QA pide reincorporarlo, habría que
  subir el tope a 4 cifras.
- **Factor 2,2 con coma**: la coma decimal se renderiza como string en
  el factor visible. La respuesta del chico es entera, así que el
  numpad no necesita coma.
- **Validación binaria**: si el chico se equivoca, cuenta como
  incorrecto entero (igual que los demás juegos).
- **No hay modal de cambio de nivel** porque no hay tabs. Solo modal
  de salir, igual que en los demás juegos.
- **Ronda 3 con valores hasta 990 lb**: 990 lb = 450 kg es un peso
  realista (vaca, motocicleta). No debería chocar con la imagen del
  chico de masas reales.
