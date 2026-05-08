# MEMORY.md — Bitácora del juego "Medidas de masa"

Bitácora de decisiones del juego `juegos/medidas-de-masa/` dentro del
repo multi-juego `edinun-games`. Las decisiones del shell compartido
(DeviceStage, pinch-zoom, modales, scoring, ResultsScreen) viven en
los CLAUDE.md de los demás juegos y en la skill — acá solo lo
específico de este juego.

## 2026-05-06 · Setup inicial del juego

### Audiencia: 9 años (excepción)

El default del repo es 6-8 años. Para `medidas-de-masa` el usuario
pidió **audiencia 9 años** porque a esta edad ya manejan multiplicación
y división por 10/100/1000 y empiezan con multiplicación decimal
sencilla. Esto se traduce en:

- Conversiones bidireccionales con factores 10, 100, 2,2.
- Copy técnico aceptable (palabras como "dag", "hg", "kg", "lb").
- Factor decimal 2,2 mostrado en pantalla — el chico no lo memoriza.

### Unidades cubiertas: escala completa kg→mg + libra

**Cambio de alcance (2026-05-06, segunda iteración):** originalmente el
usuario pidió "solo múltiplos del gramo" (kg, hg, dag, g). Tras ver
las primeras pantallas pidió expandir a la escala completa para que
las rondas 1 y 2 puedan convertir entre cualquiera de estas unidades:

| Unidad | Equivalencia |
| ------ | ------------ |
| kg     | 1000 g       |
| hg     | 100 g        |
| dag    | 10 g         |
| g      | 1 g          |
| dg     | 0,1 g        |
| cg     | 0,01 g       |
| mg     | 0,001 g      |
| lb     | 1 kg = 2,2 lb |

El juego siempre evalúa pares **adyacentes** (×/÷10) o **separados por
2** (×/÷100) — nunca conversiones de 3+ escalones, porque `1 kg = 1000
g` excedería el tope de 3 cifras.

### Tope: 7 cifras (escala completa kg↔mg)

**Cambio de diseño (segunda iteración 2026-05-06):** el tope original
era 3 cifras, lo que excluía `kg↔g`, `kg↔mg` y similares. Tras pedir
"cualquier par en la escala", el usuario optó por subir el tope a
**7 cifras** (≤ 9.999.999) para permitir incluso `kg ↔ mg` (factor
1.000.000).

- En ronda 1 (×): `fromValue` 1..9, `answer` puede llegar a 9.000.000.
- En ronda 2 (÷): `answer` 1..9, `fromValue` puede llegar a 9.000.000.
  El `fromValue` se construye como `answer × factor` para garantizar
  que la división dé un entero limpio (no decimales).
- En libras solo se usan pares enteros del pool predefinido (múltiplos
  de 5 kg / 11 lb): 5↔11, 10↔22, ..., 450↔990.

### Tres rondas escalonadas por operación

**Cambio de diseño (segunda iteración 2026-05-06):** la primera
versión escalaba por distancia entre unidades (1 escalón → 2 escalones
→ libras). El usuario pidió cambiar a escala por **operación**:
cualquier par de unidades en la escala kg→mg es válido, y la ronda
fija la operación (× o ÷):

| idx | Tema | Pares cubiertos | Ejemplos |
| --- | ---- | --------------- | -------- |
| 0   | Solo multiplicación (×) | cualquier par mayor→menor en kg→mg | `5 kg = ? mg` → 5.000.000, `7 dag = ? g` → 70 |
| 1   | Solo división (÷) | cualquier par menor→mayor en kg→mg | `5.000.000 mg = ? kg` → 5, `300 g = ? hg` → 3 |
| 2   | kg ↔ libra | factor 2,2 visible | `5 kg = ? lb` → 11 |

### Factor visible en ronda 3

En la ronda de libras se muestra una "píldora" sobre la ecuación con
`1 kg = 2,2 lb` para que el chico no tenga que memorizar el factor.
Esto es coherente con el principio del usuario de **mostrar la regla,
no exigirla de memoria**.

### HomeScreen sin chips de nivel

Como el juego es de un solo nivel, la sección de chips de dificultad
del HomeScreen se reemplaza por una descripción del juego ("Convierte
entre gramos, decagramos, hectogramos, kilogramos y libras."). El HUD
del juego también oculta las pestañas de dificultad y muestra en su
lugar el `catLabel` ("Medidas de masa") como texto centrado.

### Sin subtítulo de ronda en la zona-central

Diferencia con `patrones-numericos` (que muestra "RONDA 1 · SUMA O
RESTA" bajo el instructionText). Acá solo aparece la instrucción
"Convierte la unidad" — el usuario lo pidió explícitamente para
limpiar la zona central.

### Slots dinámicos según largo de respuesta

El slot tiene el **largo exacto** de la respuesta correcta. Sin leading
zeros (el primer dígito 0 se ignora si el slot está vacío). Misma
política que en los demás juegos numéricos del repo.

### Personaje destacado en el landing

**Nova** (la física, `charId: "fisica"`) — encaja temáticamente con
medidas físicas (masa). El usuario puede elegir otro personaje dentro
del juego, pero el card del landing siempre la muestra a ella.

### Glifos del fondo

Cosmic (15): `g dag hg kg lb = → ↗ ↘ ? × ÷ 10 100 2,2`
Chalkboard (10): `g kg lb = → × ÷ 10 100 2,2`

## Anti-patrones a evitar

- **No** incluir conversiones de 3+ escalones (ej. `kg ↔ g`,
  `kg ↔ dg`, `g ↔ mg`) — rompen el tope de 3 cifras.
- **No** producir respuestas decimales — la ronda de libras debe usar
  el pool predefinido de pares enteros, no calcular `valor × 2,2` o
  `valor ÷ 2,2` directamente (eso da decimales en muchos casos).
- **No** reactivar las pestañas de dificultad del HUD ni los chips
  del HomeScreen — este juego es deliberadamente de nivel único.
- **No** modificar `ResultsScreen`, `PrintableReport`, los modales
  ni el HUD core — son shell compartido.
- **No** añadir el subtítulo de ronda bajo la instrucción central
  ("RONDA 1 · …") — el usuario lo pidió quitar explícitamente.
