# Números primos y compuestos — diseño

## Tema

Juego de **números primos y compuestos** para audiencia **10 años**
(excepción al default 6-8 del repo, igual que `patrones-numericos` 9
y `medidas-de-masa` 9).

Mecánica **escalonada por ronda** (cada ronda usa una mecánica
distinta para cubrir el concepto de extremo a extremo: reconocer →
discriminar → descomponer):

- Ejercicio 1: clasificación binaria (primo/compuesto)
- Ejercicio 2: elegir el primo entre 4 opciones
- Ejercicio 3: descomposición en factores primos

## Niveles

**Un solo nivel.** Sin chips de dificultad en HomeScreen, sin tabs de
nivel en el HUD del juego. La sección de chips se reemplaza por una
descripción del juego.

## Mecánica por ronda

### Ronda 1 — `¿Primo o compuesto?`

- Pantalla muestra un número en el centro, dos botones grandes:
  `PRIMO` · `COMPUESTO`.
- Rango: **2..80** (incluye 2 que es primo par, único caso).
- Mezcla **50/50 primos vs compuestos** para no sesgar.
- Pool de primos en rango: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31,
  37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79.
- Pool de compuestos: cualquier número en rango que NO sea primo.

### Ronda 2 — `¿Cuál es el primo?`

- 4 números en pantalla, exactamente uno es primo.
- Rango: **10..80** (sin números obviamente compuestos como múltiplos
  de 10 que se descartarían sin pensar).
- Generación:
  1. Elegir 1 primo aleatorio del pool.
  2. Elegir 3 compuestos no-triviales (excluir múltiplos de 10 como
     20, 30, 40, 50, 60, 70, 80 para que no sean descartes obvios).
  3. Mezclar las 4 posiciones.
- Tap el primo correcto.

### Ronda 3 — `Descompón en factores primos` (paso a paso)

- Mecánica: **descomposición guiada paso a paso** (estilo "escalera
  de divisiones" de los libros de mate).
- Número compuesto en pantalla (ej: 42). El chico escribe **un factor
  primo a la vez**, cada uno divide el número actual hasta llegar a 1.
- Pool curado de números con 2-4 factores primos manejables:
  12, 14, 15, 18, 20, 21, 24, 28, 30, 35, 36, 42, 45, 50, 54, 56,
  60, 63, 70, 75, 84, 90, 100. Todos sus factores primos son ∈ {2,3,5,7}
  (1 dígito), por eso el slot es de **1 dígito fijo**.
- **Cap a 4 factores máx** (descartamos 48, 72, 96 con 5 factores).

### Mecánica paso a paso

Estado:
- `currentN`: número que toca dividir AHORA (empieza = `problem.number`).
- `steps`: lista de pasos completados `{dividend, divisor, quotient}`.
- `slot`: input actual (1 dígito).

Loop:
1. Pantalla muestra fila activa: `currentN ÷ [_] = ?` en dorado brillante.
2. Sobre ella, los `steps` ya completados (más tenues): `42 ÷ 2 = 21`.
3. El chico escribe un dígito en el slot y toca VERIFICAR.
4. Validación del paso:
   - Si el dígito es **primo** Y **divide** a `currentN` → paso correcto.
     - Pushear `{dividend: currentN, divisor: p, quotient: currentN/p}` a steps.
     - Si el cociente = 1 → ejercicio COMPLETO (correcto).
     - Si no → `currentN = quotient`, limpiar slot, seguir.
   - Si NO es primo o NO divide → feedback transitorio ("X no es primo"
     o "X no divide a N"), limpiar slot, **retry sin penalizar**.
5. Errores intermedios NO marcan el ejercicio como fallado — solo
   penalizan por tiempo (las estrellas bajan con el cronómetro).

Layout zona-central:

```
        Descompón en factores primos

        42 ÷ 2 = 21       ← paso completado (tenue)
        21 ÷ 3 = 7        ← paso completado (tenue)
        7 ÷ [_] = ?       ← fila activa (dorado, slot brillante)

        [1][2][3][4][5][6][7][8][9][0]
```

### Input ronda 3 — detalle

- Numpad estándar 0-9 (sin botón `×` — la mecánica es 1 factor por paso).
- Slot único de 1 dígito.
- **Sin leading zero**: si el slot está vacío, los dígitos `0` y `1` se
  ignoran (1 no es primo, 0 nunca es factor).
- BORRAR: limpia el slot.
- VERIFICAR: ejecuta la validación del paso.

### Validación ronda 3 (resumen)

- Estricta por paso: el dígito debe ser primo (2,3,5,7) Y divisor de
  `currentN`.
- Tolerante en orden: el chico puede empezar por cualquier primo válido
  (ej: para 12 puede ir 2→2→3 o 3→2→2, ambas válidas).
- Sin penalizar errores intermedios: el ejercicio se marca como correcto
  solo cuando el cociente llega a 1, sin importar cuántos errores hizo
  en el camino. Las estrellas bajan por tiempo (cronómetro corre durante
  los reintentos).

## Layout zona-central

### Ronda 1 (binary)

```
        ¿Primo o compuesto?

              [ 47 ]

      [PRIMO]   [COMPUESTO]
```

### Ronda 2 (multiple choice)

```
       ¿Cuál es el primo?

       [29]  [33]  [49]  [51]
```

### Ronda 3 (numpad + ×)

```
   Descompón en factores primos

           42 = [_]×[_]×[_]

   [1][2][3][4][5][6][7][8][9][0][×]
```

## Adaptación del `lastResult.log`

| Campo           | Valor según ronda                          |
| --------------- | ------------------------------------------ |
| Ronda 1: `a`    | El número (`"47"`)                         |
| Ronda 1: `b`    | `"PRIMO"` o `"COMPUESTO"` (la respuesta correcta) |
| Ronda 2: `a`    | Las 4 opciones (`"29, 33, 49, 51"`)        |
| Ronda 2: `b`    | El primo correcto (`"29"`)                 |
| Ronda 3: `a`    | El número (`"42"`)                         |
| Ronda 3: `b`    | Descomposición correcta (`"2×3×7"`)        |
| `op`            | `"="` (genérico)                           |
| `correctAnswer` | Igual a `b`                                |
| `userAnswer`    | Lo que eligió/escribió el chico            |

## Glifos del fondo

**Cosmic (15)** — Home/Character/Results:
`2 3 5 7 11 13 17 × ÷ = ↗ … ··· ?`

**Chalkboard (10)** — Game:
`2 3 5 7 × = ··· ? 11`

## Copy

- **Slug**: `numeros-primos`
- **Personaje destacado en landing**: Cifra (numerólogo, `charId: "numero"`)
- **HomeScreen hero**: "EDINUN · Números primos"
- **Descripción Home**: "Reconoce números primos, distínguelos y descompón en factores primos."
- **Etiqueta**: "Primos · Compuestos · Factores"
- **catLabel HUD**: "Números primos"
- **Bocadillo del personaje**: "Encuentra los primos."
- **Instrucción central por ronda**:
  - idx 0 → "¿Primo o compuesto?"
  - idx 1 → "¿Cuál es el primo?"
  - idx 2 → "Descompón en factores primos"

## Decisiones abiertas / riesgos

- **Orden ascendente estricto en ronda 3**: si el chico tira los
  factores en otro orden, falla. Pedagógicamente correcto pero
  podríamos relajar a "set match" si en QA falla mucho.
- **Numpad expandido con `×`**: la grilla pasa de 10 botones a 11.
  Necesita re-layout — probablemente bandeja inferior con grid
  `repeat(11, 50px)` o `repeat(11, 1fr)`.
- **Cap 4 factores**: 100 (2×2×5×5) ya tiene 7 elementos en pantalla.
  Encaja en 580 px del wrapper pero apretado. Si en QA se ve mal,
  bajar el cap a 3 factores.
- **Sin escalera/tabla de referencia**: no aplica acá — los primos
  son discretos. Podríamos agregar un panel pequeño con los primeros
  10 primos como referencia (`2, 3, 5, 7, 11, 13, 17, 19, 23, 29`)
  pero por ahora no se incluye para no saturar.
