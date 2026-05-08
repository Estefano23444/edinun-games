# Sistema de coordenadas rectangulares — diseño

## Tema

Tema 1 del libro de mate del usuario, audiencia 9 años. Cubre:
- Formato `(letra, número)` tipo mapa (Sofía/Iván, dibujar emojis).
- Plano cartesiano numérico `(x, y)` con ejes.
- Camino entre dos puntos (perro Kody: 5 derecha + 3 arriba).

## Niveles

**1 nivel, 3 rondas con mecánicas distintas.** Sin chips de dificultad
en Home, sin tabs en HUD del juego. Coherente con el resto de juegos de
9-10 años (`medidas-de-masa`, `numeros-primos`, `sustituciones`).

## Mecánica por ronda

### Ronda 1 — ¿En qué casilla está [emoji]? (tap entre 4 coords)

Grid 5×5 con encabezados A-E (cols) y 1-5 (rows). 6 emojis distintos
en posiciones únicas. Uno se elige como `target` y se resalta con borde
dorado y glow. 4 botones de coordenadas (1 correcta + 3 distractores).

Pool emojis: `🏠 🍎 🌸 ⭐ 🍉 🐶`. Distractores: coords aleatorias
distintas a la correcta.

### Ronda 2 — ¿Qué par ordenado es este punto? (tap entre 4 pares)

Plano cartesiano 0..5 × 0..5 con un punto marcado (círculo dorado con
glow). 4 botones `(x, y)` (1 correcto + 3 cercanos con offset ±2 clamp
a [0..5]).

### Ronda 3 — Camino del perro Kody (numpad guiado, 2 pasos)

Plano 0..6 × 0..5 con 🐶 en (0,0) y 💎 en (X, Y). El chico ingresa con
numpad:
- Paso 0: pasos a la derecha (= X). Si correcto → se dibuja el camino
  en cyan punteado y avanza a paso 1.
- Paso 1: pasos hacia arriba (= Y). Resuelve el ejercicio.

Si falla cualquier paso → `finalize(false)`. No hay reintento (igual
que `sustituciones` R3).

`targetX ∈ [2..6]`, `targetY ∈ [2..5]`.

## Restricciones

- **R1 sin colisiones**: 6 emojis en 6 casillas distintas (guard con
  `Set<key>`).
- **R2 con distractores plausibles**: offset ±2 en cada eje, clamp a
  rango válido, dedup.
- **R3 sin leading zero** en el numpad. Slot de 1 dígito (rangos
  pequeños).
- **R3 sin reintento**: error termina ejercicio (consistente con edad).
- **Tope visual**: el plano R3 va hasta 6×5 para que quepa cómodamente
  en zona-central sin invadir HUD/numpad.

## Glifos del fondo

- Cosmic (15): `x y ( ) , → ↑ ↗ 0 1 2 3 4 A B`
- Chalkboard (10): `x y ( ) , → ↑ A 0 1`

## Copy específico

- **Slug**: `JUEGO-5-coordenadas-rectangulares`
- **Personaje destacado**: Pita (`charId: "geo"`)
- **HomeScreen hero**: `EDINUN · Coordenadas rectangulares`
- **Descripción Home**: `Lee coordenadas y traza caminos.`
- **catLabel HUD / reporte**: `Sistema de coordenadas rectangulares`
- **Bocadillo**:
  - R1, R2 → `Selecciona la respuesta correcta.`
  - R3 → `Ingresa los números correctos.`
- **Instrucción central**:
  - idx 0 → `¿En qué casilla está [emoji]?`
  - idx 1 → `¿Qué par ordenado es este punto?`
  - idx 2 → `¿Cuántos pasos a la derecha?` → `¿Cuántos pasos hacia arriba?`

## Adaptación del log

| Campo | R1 | R2 | R3 |
| ----- | -- | -- | -- |
| `a` | `🍎 en grid` | `punto en plano` | `(0,0) → (X,Y)` |
| `b` | `casilla` | `par ordenado` | `X der. y _ arriba` |
| `op` | `→` | `→` | `=` |
| `correctAnswer` | `(B, 3)` | `(2, 4)` | `X der., Y arriba` |
| `userAnswer` | coord. tapeada | par tapeado | lo que escribió |

## Decisiones abiertas / riesgos

- **Pool R1 emojis**: 6 emojis curados. Si se siente repetitivo en
  pruebas, ampliar a 10 (agregar 🦋 🌳 🚗 🐱).
- **R3 con factor 2,2 / decimales**: NO — todos los pasos son enteros.
- **Distractores R2 cercanos**: si el chico se equivoca mucho por
  cercanía, ampliar el offset a ±3.
- **Producto cartesiano del libro**: NO se incluye como ronda separada
  porque es un concepto avanzado (más para 5to grado). El juego se
  enfoca en lectura y trazado, no en construcción de productos.
