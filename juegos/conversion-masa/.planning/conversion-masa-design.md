# Conversión entre unidades de masa — diseño

## Tema

Conversiones entre unidades de masa: kg ↔ g, kg ↔ lb, kg ↔ t, g ↔ lb,
lb ↔ kg. Audiencia 10 años, basado en el Tema 3 del libro de mate.

## Niveles

**1 nivel, 3 rondas con mecánicas distintas.** No es solo numpad como
`medidas-de-masa` (9 años) — el usuario pidió variedad explícita.

## Mecánica por ronda

### Ronda 1 — ¿Cuál pesa más? (tap entre 3 cards)

Aparecen 3 productos en cards. Cada uno tiene su nombre + peso en una
unidad sorteada (g, kg, lb, t). El chico tapea el más pesado.

Pool de 15 objetos con masas reales en gramos. La unidad de display
se sortea entre opciones razonables para esa magnitud.

### Ronda 2 — ¿Cuál NO equivale? (tap entre 4 opciones)

Aparece una masa origen (ej. `5 kg`) y debajo 4 supuestas equivalencias.
3 son correctas y 1 es falsa (corrompida moviendo ceros). El chico
tapea la falsa.

Pool curado de orígenes en `sources` (8-12 entradas) con sus
equivalencias correctas. Para generar la falsa: tomar una correcta
y multiplicar/dividir por 10, 100 o 0,1.

### Ronda 3 — Conversión paso a paso (numpad)

Cadena de conversión con 2 saltos atravesando una unidad intermedia.
El chico resuelve cada paso con numpad. Si falla un paso, termina el
ejercicio (igual que R1/R2).

Cadenas posibles:
- t → kg → g (×1000, ×1000)
- g → kg → t (÷1000, ÷1000)
- lb → kg → g (÷2,2, ×1000)
- kg → g → mg (×1000, ×1000)

Todas con respuestas enteras o decimales limpias.

## Restricciones

- **Tope 10 cifras** en valores intermedios (`1 t = 10⁶ g`, OK).
- **Solo respuestas enteras o decimales limpias**.
- **Una respuesta = se acaba el ejercicio** en R1, R2 y R3.
- **Sin leading zeros** en numpad de R3.

## Glifos del fondo

- Cosmic (15): `kg g lb t mg × ÷ 1000 2,2 454 = → ↗ ? ≠`
- Chalkboard (10): `kg g lb t × ÷ 1000 2,2 = ?`

## Copy específico

- **Slug**: `conversion-masa`
- **Personaje destacado**: Nova (`charId: "fisica"`)
- **HomeScreen hero**: `EDINUN · Conversión de masa`
- **Descripción Home**: `Compara, identifica y convierte masas.`
- **catLabel HUD / reporte**: `Conversión entre unidades de masa`
- **Bocadillo**: `Ingresa los números correctos.`
- **Instrucción central**:
  - idx 0 → `¿Cuál pesa más?`
  - idx 1 → `¿Cuál NO equivale?`
  - idx 2 → `Convierte paso a paso`

## Adaptación del log

| Campo | R1 | R2 | R3 |
| ----- | -- | -- | -- |
| `a` | lista de 3 productos | masa origen | source value+unit |
| `b` | `"¿cuál pesa más?"` | `"no equivale a"` | finalUnit |
| `op` | `"→"` | `"≠"` | `"="` |
| `correctAnswer` | nombre + valor del más pesado | la opción falsa | finalValue |
| `userAnswer` | el item tapeado | la opción tapeada | lo escrito |

## Decisiones abiertas / riesgos

- **Pool de R2**: 12 orígenes con sus equivalencias. Si se siente
  repetitivo, ampliar a 20+.
- **Pool de R1**: 15 objetos. Si se siente repetitivo, ampliar.
- **R3 con factor 2,2**: solo pool entero (múltiplos de 11 lb). Si el
  chico se aprende el pool, ampliar valores.
- **Distractores R2**: actualmente solo "mover ceros". Podría agregarse
  "factor cambiado" (ej: 5 kg ≠ 5 lb) si se siente predecible.
