# Sustituciones y paréntesis — diseño

## Tema

Juego de **sustitución de variables y paréntesis con operaciones
combinadas (decimales)** para audiencia **10 años** (excepción al
default 6-8 del repo, igual que `operaciones-combinadas`).

Mecánica **escalonada por ronda** — cada ronda enseña un concepto
nuevo y los combina al final:

- Ronda 1: solo sustitución (multiple choice)
- Ronda 2: solo paréntesis (multiple choice)
- Ronda 3: ambos combinados (numpad con pasos guiados)

## Niveles

**Un solo nivel.** Sin chips de dificultad en HomeScreen, sin tabs
en HUD. Las 3 rondas escalan internamente por idx en `makeProblem`.

## Mecánica por ronda

### Ronda 1 — `Sustituciones` (multiple choice)

- Pantalla muestra una **tabla de variables** (3-4 letras con valores
  decimales): `A=1,2 · B=0,4 · C=5,3 · D=1,5`.
- Pregunta con expresión que mezcla letras y operadores: `A + B × D = ?`.
- 3 botones grandes con resultados: 1 correcto + 2 distractores.
- El chico debe sustituir mentalmente y aplicar jerarquía.

Distractores plausibles:
- Sin jerarquía: `(A + B) × D` (sumó antes de multiplicar).
- Aritmética típica: error de cálculo común (ej: olvidar restar).

Ejemplo:
- A=1,2 · B=0,4 · C=5,3 · D=1,5
- Expresión: `A + B × D`
- Correcto: 1,2 + 0,6 = **1,8**
- Wrong 1: (1,2 + 0,4) × 1,5 = **2,4** (sin jerarquía)
- Wrong 2: 1,2 + 1,5 = **2,7** (omite B × D)

### Ronda 2 — `Paréntesis` (multiple choice)

- Expresión con paréntesis explícitos: `24,35 + (3 × 2,4) − (10 ÷ 4) = ?`.
- 3 botones grandes con resultados.
- Sin variables — solo números y operadores.

Distractores plausibles:
- Confundir signos (sumó en vez de restar): 34,05.
- Olvidó una operación: 21,55.

Ejemplo:
- Expresión: `24,35 + (3 × 2,4) − (10 ÷ 4)`
- Correcto: 24,35 + 7,2 − 2,5 = **29,05**
- Wrong 1: 24,35 + 7,2 + 2,5 = **34,05** (suma en vez de resta)
- Wrong 2: 24,35 + 7,2 − 10 = **21,55** (no dividió 10÷4)

### Ronda 3 — `Sustitución + paréntesis` (numpad, pasos guiados)

- Pantalla muestra:
  - Variables: `A=2,4 · B=1,5 · C=3`
  - Expresión: `(A + B) × C − 0,8`
- Mecánica de **pasos guiados** (igual que `operaciones-combinadas`):
  - Paso 1: `(2,4 + 1,5) = ?` → kid escribe 3,9
  - Paso 2: `3,9 × 3 = ?` → kid escribe 11,7
  - Paso 3: `11,7 − 0,8 = ?` → kid escribe 10,9
- Numpad estándar 0-9; coma fija en el slot layout (sin botón).
- Errores intermedios son transitorios; ejercicio se valida cuando se
  completa el último paso.

Patrón fijo: `(A + B) × C − D` (3 pasos garantizados).

## Restricciones para cálculo limpio

- Aritmética interna en **décimas** (×10) para evitar `0.1 + 0.2 ≠ 0.3`.
- Decimales de 1 cifra decimal máximo.
- Operaciones: decimal × entero, decimal ÷ entero, decimal ± decimal.
- Para R2: las divisiones siempre son limpias (dividendo construido
  como `quotient × divisor`).
- Para R3: A + B y la multiplicación dan resultados de 1 decimal
  máximo. La resta final también.

## Layout zona-central

### Ronda 1

```
        Calcula la expresión

       A=1,2 · B=0,4 · C=5,3 · D=1,5

           A + B × D

       [ 1,8 ]  [ 2,4 ]  [ 2,7 ]
```

### Ronda 2

```
       Resuelve la expresión

   24,35 + (3 × 2,4) − (10 ÷ 4)

   [ 29,05 ]  [ 34,05 ]  [ 21,55 ]
```

### Ronda 3

```
        Resuelve la expresión

       A=2,4 · B=1,5 · C=3

         (A + B) × C − 0,8

       ─────────────────

       (2,4 + 1,5) = 3,9     ← paso 1 completado (tenue)
       3,9 × 3 = [_ _,_]     ← paso 2 activo
```

## Adaptación del `lastResult.log`

| Campo           | R1 / R2 / R3                                   |
| --------------- | ---------------------------------------------- |
| `a`             | Expresión (`"A + B × D"` o `"(A+B)×C−0,8"`)    |
| `b`             | Tabla de variables (`"A=1,2 B=0,4 C=5,3 D=1,5"`) o `""` |
| `op`            | `"="`                                          |
| `correctAnswer` | Resultado final correcto                       |
| `userAnswer`    | Lo que eligió/escribió el chico                |

## Glifos del fondo

**Cosmic (15)** — Home/Character/Results:
`A B C D + − × ÷ ( ) = 1,5 2,4 5,3 ?`

**Chalkboard (10)** — Game:
`A B C + − × ÷ ( ) = 1,5`

## Copy

- **Slug**: `sustituciones`
- **Personaje destacado en landing**: Cifra (numerólogo, `charId: "numero"`)
- **HomeScreen hero**: "EDINUN · Sustituciones"
- **Descripción Home**: "Operaciones combinadas con números decimales."
- **catLabel HUD**: "Sustituciones"
- **Bocadillo del personaje**: "Reemplaza y resuelve."
- **Instrucción central por ronda**:
  - idx 0 → "Calcula la expresión"
  - idx 1 → "Resuelve la expresión"
  - idx 2 → "Resuelve paso a paso"

## Decisiones abiertas / riesgos

- **R1 y R2 ambas con multiple choice**: pierde un poco de variedad
  mecánica. Compensa porque cada ronda enseña un concepto distinto y
  R3 cambia a numpad.
- **Distractores fijos por patrón**: en R1 los wrongs son "sin jerarquía"
  + "olvidó un término"; en R2 son "signo cambiado" + "olvidó operación".
  Si en QA se ven muy obvios, randomizar más.
- **Sin paréntesis en R1**: solo sustitución, jerarquía implícita.
- **Sin variables en R2**: solo paréntesis y operadores numéricos.
- **Pool de letras**: A, B, C, D solo (4 máx). No usamos X/Y para no
  sugerir álgebra futura.
