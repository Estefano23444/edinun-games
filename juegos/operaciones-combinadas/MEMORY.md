# MEMORY.md — Bitácora del juego "Operaciones combinadas"

Bitácora de decisiones del juego `juegos/operaciones-combinadas/` dentro
del repo multi-juego `edinun-games`. Las decisiones del shell compartido
viven en los CLAUDE.md de los demás juegos — acá solo lo específico.

## 2026-05-06 · Setup inicial del juego

### Audiencia: 10 años (excepción)

El default del repo es 6-8 años. Para `operaciones-combinadas` el
usuario pidió **audiencia 10 años**. A esta edad ya manejan:
- Jerarquía de operaciones (× y ÷ antes que + y −).
- Decimales con 1 cifra decimal.
- Multiplicación de decimal × entero y división decimal ÷ entero.

### Mecánica única: pasos guiados (3 rondas escalan por complejidad)

Cada ronda usa la **misma mecánica** (pasos guiados con numpad), pero
escala por complejidad de la expresión:

| idx | Tema | Pasos | Ejemplos |
| --- | ---- | ----- | -------- |
| 0   | 2 ops, × con +/− | 2 pasos | `2,5 + 1,8 × 3` → `1,8×3=5,4` → `2,5+5,4=7,9` |
| 1   | 2 ops, ÷ con +/− | 2 pasos | `1,5 + 4,8 ÷ 2` → `4,8÷2=2,4` → `1,5+2,4=3,9` |
| 2   | 3 ops mezcladas  | 3 pasos | `2,5 + 1,2 × 3 − 0,8` → `1,2×3=3,6` → `2,5+3,6=6,1` → `6,1−0,8=5,3` |

### Aritmética en décimas para evitar imprecisión de float

JavaScript tiene problemas con `0.1 + 0.2 = 0.30000000000000004`. Para
evitarlo, todos los valores se almacenan internamente **en décimas**
(×10):

- `1.8` interno = 18 décimas
- `5.4` interno = 54 décimas
- `7.9` interno = 79 décimas
- Multiplicación: `18 × 3 = 54` (todavía décimas) ✓
- Suma: `25 + 54 = 79` ✓
- División: `48 ÷ 2 = 24` (todavía décimas) ✓

Helpers: `tenthsToStr(t)` para display ("5,4"), `answerLayout(t)` para
construir el array de slots con la coma fija en la posición correcta.

### División siempre limpia (ronda 2)

Para garantizar que la división dé un entero/decimal exacto, el
dividendo se construye como `quotient × divisor` donde:
- `quotient` es 1-decimal (lo que el chico responde).
- `divisor` es entero (2..5).

Así `b ÷ c` siempre da `quotient` exacto.

### Numpad sin botón de coma

La coma decimal aparece **fija** en la posición correcta del slot
layout, pre-calculada según el resultado esperado. El chico solo
necesita teclas 0-9. La coma se renderiza automáticamente.

### Errores intermedios no penalizan

En todas las rondas, si el chico se equivoca en un paso, el feedback
es transitorio (1.1s) y limpia los slots. NO falla el ejercicio. El
ejercicio se marca como CORRECTO solo cuando se completa el último
paso. Las estrellas bajan por tiempo (cronómetro corre durante los
reintentos).

### Personaje destacado en el landing

**Cifra** (numerólogo, `charId: "numero"`) — encaja con el cálculo
numérico puro.

### Glifos del fondo

Cosmic (15): `+ − × ÷ = 1,5 2,4 5,2 3,4 0,5 7,8 ··· ?`
Chalkboard (10): `+ − × ÷ = ··· ? 1,5 2,4 3,2`

## Anti-patrones a evitar

- **No** introducir `decimal × decimal` ni `decimal ÷ decimal` — son
  contenido más avanzado y producen 2 decimales en el resultado.
- **No** usar floats directamente (`0.1 + 0.2 ≠ 0.3`). Toda la
  aritmética interna se hace en décimas (enteros).
- **No** agregar paréntesis en la primera iteración — la jerarquía
  `× ÷ antes que + −` ya es contenido suficiente para 10 años.
- **No** marcar el ejercicio como fallado si el chico se equivoca en
  pasos intermedios. Los errores son transitorios.
- **No** modificar `ResultsScreen`, `PrintableReport`, los modales
  ni el HUD core — son shell compartido.
