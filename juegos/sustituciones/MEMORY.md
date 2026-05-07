# MEMORY.md — Bitácora del juego "Sustituciones y paréntesis"

Bitácora de decisiones del juego `juegos/sustituciones/` dentro del
repo multi-juego `edinun-games`. Las decisiones del shell compartido
viven en los CLAUDE.md de los demás juegos — acá solo lo específico.

## 2026-05-07 · Setup inicial del juego

### Audiencia: 10 años (excepción)

El default del repo es 6-8 años. Para `sustituciones` el usuario pidió
**audiencia 10 años**. A esta edad ya:
- Manejan jerarquía de operaciones.
- Trabajan decimales con 1 cifra decimal.
- Empiezan a ver variables (concepto pre-algebraico).
- Usan paréntesis explícitos en expresiones.

### Origen del juego: ejercicios de libro de mate

El usuario envió 2 capturas del libro:
- **Captura 1**: ejercicio de sustitución de variables `A=1,2 B=2/5
  C=5,3 D=1,5` + expresión con letras a resolver.
- **Captura 2**: ejercicio de paréntesis `24,35 + (3 × 2,4) − (10 ÷ 4)`
  + expresiones largas a completar.

El juego combina ambos conceptos en una mecánica escalonada.

### 3 rondas con mecánicas distintas

| idx | Tema | Mecánica | Ejemplos |
| --- | ---- | -------- | -------- |
| 0   | Sustituciones | Multiple choice (3 opciones) | `A=1,2 B=0,4 D=1,5` + `A+B×D=?` → 1,8 |
| 1   | Paréntesis | Multiple choice (3 opciones) | `24,35+(3×2,4)−(10÷4)=?` → 29,05 |
| 2   | Combinado | Numpad guiado, pasos | `A=2,4 B=1,5 C=3` + `(A+B)×C−D` → 3 pasos |

### Por qué multiple choice en R1 y R2

El usuario pidió **explícitamente** multiple choice para R1 y R2.
Razones pedagógicas:
- R1 enseña sustitución como concepto nuevo — mejor empezar con
  reconocimiento (multiple choice) antes que producción libre.
- R2 enseña paréntesis — mismo principio.
- R3 escala a numpad open answer combinando ambos conceptos.

### Distractores plausibles en R1 y R2

**R1**: 3 opciones derivadas del cálculo correcto:
- Correcto: `A + B × D` con jerarquía.
- Wrong 1: `(A + B) × D` (sin jerarquía — error común).
- Wrong 2: `A + D` (omitió `B × D`).

**R2**: 3 opciones derivadas del cálculo correcto:
- Correcto: `a + (b×c) − (d÷e)`.
- Wrong 1: signo cambiado (suma en vez de resta) — error común.
- Wrong 2: olvidó dividir, restó `d` directo.

Si en QA los distractores se ven muy obvios, randomizar más.

### R3 — pasos guiados con paréntesis

Patrón fijo: `(A + B) × C − D` (3 pasos garantizados):
- Step 1: A + B = sumT (el paréntesis se calcula primero)
- Step 2: sumT × C = productT
- Step 3: productT − D = finalT

Variables `A, B` son décimas en [11..29] (1,1..2,9), `C` entero 2-4,
`D` décimas en [2..9] (0,2..0,9). Esto mantiene los resultados
intermedios y el final ≤ 200 décimas (20,0).

### Aritmética en décimas (heredada de operaciones-combinadas)

Misma técnica: todos los valores en décimas (×10) internamente para
evitar `0.1 + 0.2 ≠ 0.3`. Helpers `tenthsToStr` y `answerLayout`
copiados de `operaciones-combinadas`.

Para R1 hay un caso adicional: la multiplicación `B × D` puede dar
centésimas si ambos son décimas. Validamos que `(B*D) % 10 === 0`
para que el resultado sea décima limpia; si no, regenera el problema.

### Letras de variables: A, B, C, D

Solo estas 4 letras para evitar:
- Confusión con O (parece 0).
- Sugerir álgebra futura (X, Y).
- Sobrecargar al chico con demasiadas variables.

### Personaje destacado en el landing

**Cifra** (numerólogo, `charId: "numero"`) — encaja con cálculo
numérico puro y sustituciones.

### Glifos del fondo

Cosmic (15): `A B C D + − × ÷ ( ) = 1,5 2,4 5,3 ?`
Chalkboard (10): `A B C ( ) + × ÷ = 1,5 ?`

## Anti-patrones a evitar

- **No** introducir paréntesis en R1 — esa ronda es solo sustitución
  con jerarquía implícita.
- **No** introducir variables en R2 — esa ronda es solo paréntesis
  con números literales.
- **No** marcar el ejercicio R3 como fallado si el chico se equivoca
  en pasos intermedios. Errores son transitorios.
- **No** usar X, Y o letras griegas como variables — solo A, B, C, D.
- **No** producir distractores en R1/R2 que sean negativos o muy
  alejados del correcto (deben ser plausibles).
- **No** modificar `ResultsScreen`, `PrintableReport`, los modales
  ni el HUD core — son shell compartido (excepto la columna
  "Variables" agregada para reflejar el contenido del juego).
