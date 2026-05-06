# Operaciones combinadas con decimales — diseño

## Tema

Juego de **operaciones combinadas con números decimales** para
audiencia **10 años** (excepción al default 6-8 del repo, igual que
`numeros-primos`).

Mecánica: **construcción guiada paso a paso**. El chico ve la
expresión completa y la resuelve en pasos siguiendo la jerarquía
de operaciones (×/÷ antes que +/−). Reusa la lógica de "escalera"
ya probada en `numeros-primos` ronda 3.

## Niveles

**Un solo nivel.** Sin chips de dificultad en HomeScreen, sin tabs de
nivel en el HUD del juego. Las 3 rondas escalan por **complejidad de
la expresión** (cantidad de operaciones).

## Mecánica por ronda

### Ronda 1 — 2 operaciones, jerarquía simple (sin paréntesis)

Patrones:
- `a + b × c`
- `a − b × c`
- `a × b + c`
- `a × b − c`

El chico debe primero hacer la multiplicación, después la suma/resta.

Ejemplos:
- `2,5 + 1,8 × 3` → step 1: `1,8 × 3 = 5,4` → step 2: `2,5 + 5,4 = 7,9`
- `4,2 − 1,1 × 2` → step 1: `1,1 × 2 = 2,2` → step 2: `4,2 − 2,2 = 2`

### Ronda 2 — 2 operaciones con división

Patrones similares pero con `÷` en vez de `×`:
- `a + b ÷ c`
- `a − b ÷ c`
- `b ÷ c + a`
- `b ÷ c − a`

Restricción: la división `b ÷ c` debe dar resultado limpio (1 decimal).
Para garantizar: `b` se construye como `quotient × c` donde quotient
es 1-decimal y `c` es entero.

Ejemplos:
- `1,5 + 4,8 ÷ 2` → step 1: `4,8 ÷ 2 = 2,4` → step 2: `1,5 + 2,4 = 3,9`
- `6,5 − 4,5 ÷ 3` → step 1: `4,5 ÷ 3 = 1,5` → step 2: `6,5 − 1,5 = 5`

### Ronda 3 — 3 operaciones, mezcla completa

Patrones:
- `a + b × c − d`
- `a − b × c + d`
- `a × b + c × d`
- `a × b − c ÷ d`

Tres pasos para resolver. Las multiplicaciones/divisiones primero
(en orden de izquierda a derecha), después las sumas/restas (también
izq→der).

Ejemplos:
- `2,5 + 1,2 × 3 − 0,8`:
  - Step 1: `1,2 × 3 = 3,6`
  - Step 2: `2,5 + 3,6 = 6,1`
  - Step 3: `6,1 − 0,8 = 5,3`
- `1,5 × 2 + 0,8 × 3`:
  - Step 1: `1,5 × 2 = 3` (primera × en izq)
  - Step 2: `0,8 × 3 = 2,4` (segunda ×)
  - Step 3: `3 + 2,4 = 5,4`

## Restricciones para cálculo limpio

- Todos los operandos y resultados son **decimales con 1 cifra**
  decimal máximo (o enteros).
- Internamente se almacena en **décimas** (×10) — todas las
  operaciones se hacen con enteros para evitar imprecisión de float
  (`0.1 + 0.2 ≠ 0.3` en JS).
- Display: convertir tenths a string con coma:
  - 54 → "5,4"
  - 79 → "7,9"
  - 60 → "6" (sin decimal trailing)
  - 200 → "20"
- División: el divisor es siempre entero (≥ 2). El dividendo se
  construye como `quotient × divisor` para garantizar exactitud.
- Multiplicación: factor entero × decimal (decimal × decimal sería
  más complejo y produce 2 decimales).

## Mecánica paso a paso (igual que primos R3)

Estado:
- `currentStep`: índice del paso actual (0..N-1).
- `completedSteps`: lista de pasos resueltos `{a, op, b, result}`.
- `slots`: dígitos que el chico está tipeando (variable según largo
  esperado de la respuesta).

Loop:
1. Pantalla muestra la expresión completa arriba.
2. Abajo, los pasos completados (tenues) y el paso activo (dorado).
3. El chico tipea la respuesta del paso activo en los slots.
4. VERIFICAR:
   - Si la respuesta es correcta: avanzar al siguiente paso, mover el
     completedStep a la lista superior.
   - Si es incorrecto: feedback transitorio "Revisa el cálculo",
     limpiar slots, retry sin penalizar.
5. Cuando se completa el último paso: ejercicio CORRECTO.
6. Errores intermedios NO fallan el ejercicio — solo penalizan por
   tiempo (las estrellas bajan con el cronómetro).

## Layout zona-central

```
        Resuelve la expresión

           2,5 + 1,8 × 3

        ───────────────────

        1,8 × 3 = [_,_]      ← paso activo
```

Después de step 1:
```
        Resuelve la expresión

           2,5 + 1,8 × 3

        ───────────────────

        1,8 × 3 = 5,4         ← completado (tenue)
        2,5 + 5,4 = [_,_]     ← paso activo
```

## Numpad e input decimal

- Numpad estándar 0-9 (sin botón `,` aparte).
- La coma decimal aparece **fija** en la posición correcta del slot
  layout, pre-calculada según el resultado esperado.
- Ej: si el resultado esperado es `5,4` → layout = `[_] , [_]` (1 slot,
  coma, 1 slot). El chico tipea 5, después 4.
- Si el resultado esperado es `24` (entero) → layout = `[_] [_]` (2 slots,
  sin coma).
- Si el resultado esperado es `0,8` → layout = `[_] , [_]` con primer
  slot pre-llenado con 0... actually mejor: kid tipea 0 también,
  layout `[_] , [_]`.
- Sin leading zero: si el primer slot está vacío y el chico toca 0,
  se ignora — EXCEPTO cuando la respuesta empieza con 0 (ej: 0,8) —
  en ese caso el primer slot es 0 obligatorio. **Decisión simple**:
  permitir 0 inicial siempre que la respuesta esperada empiece con 0.

## Adaptación del `lastResult.log`

Por ronda, el log captura la expresión completa y el paso final:

| Campo           | Valor                                      |
| --------------- | ------------------------------------------ |
| `a`             | Expresión completa (`"2,5 + 1,8 × 3"`)     |
| `b`             | Resultado final (`"7,9"`)                  |
| `op`            | `"="`                                      |
| `correctAnswer` | Resultado final correcto                   |
| `userAnswer`    | Lo que escribió el chico (último paso)     |

Errores intermedios no se registran en el log (son transientes).

## Glifos del fondo

**Cosmic (15)** — Home/Character/Results:
`+ − × ÷ = , 0,5 1,5 2,5 3,4 5,2 7,8 ··· ?`

**Chalkboard (10)** — Game:
`+ − × ÷ = , ··· ? 1,5 2,4`

## Copy

- **Slug**: `operaciones-combinadas`
- **Personaje destacado en landing**: Cifra (numerólogo, `charId: "numero"`)
- **HomeScreen hero**: "EDINUN · Operaciones combinadas"
- **Descripción Home**: "Operaciones combinadas con decimales."
- **catLabel HUD**: "Operaciones combinadas"
- **Bocadillo del personaje**: "Resuelve paso a paso."
- **Instrucción central**: "Resuelve la expresión"

## Decisiones abiertas / riesgos

- **Sin paréntesis explícitos**: simplifica el rendering y la
  jerarquía. Si el currículo de 10 años incluye paréntesis y el
  usuario los pide, se pueden agregar en una iteración futura.
- **Decimal × decimal excluido**: pedagógicamente más avanzado y
  produce 2 decimales en el resultado, complicando el numpad. Solo
  se usa decimal × entero o entero × decimal.
- **División decimal**: el divisor es siempre entero, el dividendo se
  construye para garantizar resultado entero o de 1 decimal.
- **Slots de 1 decimal**: si en algún caso el resultado tiene 2
  decimales (improbable con las restricciones), el layout se
  desbordaría. Las restricciones del generador previenen esto.
