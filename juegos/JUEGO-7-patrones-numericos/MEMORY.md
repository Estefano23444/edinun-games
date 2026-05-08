# MEMORY.md — Bitácora del juego "Patrones numéricos"

Bitácora de decisiones del juego `juegos/patrones-numericos/` dentro del
repo multi-juego `edinun-games`. Las decisiones del shell compartido
(DeviceStage, pinch-zoom, modales, scoring, ResultsScreen) viven en
los CLAUDE.md de los demás juegos y en la skill — acá solo lo
específico de este juego.

## 2026-05-05 · Setup inicial del juego

### Audiencia: 9 años (excepción)

El default del repo es 6-8 años. Para `patrones-numericos` el usuario
pidió **audiencia 9 años** porque "ya saben las tablas". Esto se traduce en:

- Pasos de suma/resta hasta ±15 (vs ±5 que sería más típico para 6-8).
- Multiplicación con factores variados ×2..×5 (no solo ×2).
- División con divisores variados ÷2..÷5.
- Copy técnico aceptable (palabras como "secuencia", "regla", "patrón").

### Mecánica única, 3 rondas escalonadas por idx

Un solo nivel, pero los 3 ejercicios escalan en complejidad por
operación:

| idx | Operación              | Ejemplos                                          |
| --- | ---------------------- | ------------------------------------------------- |
| 0   | Suma o resta (±2..±15) | `4, 11, _, 25, _, 39` (+7) · `60, 48, _, 24, _, 1` (−12) |
| 1   | Multiplicación ×2..×5  | `2, 4, _, 16, _, 64` (×2) · `1, 5, _, 125` (×5)   |
| 2   | División ÷2..÷5        | `64, 32, _, 8, _, 2` (÷2) · `81, 27, _, 3, 1` (÷3) |

### Restricción crítica: solo números naturales

**Todos los términos deben ser ≥ 1.** Esto requiere:
- Suma/resta decreciente: garantizar `start - (len-1)*step ≥ 1`.
- División: la secuencia se construye desde `divisor^(len-1)` hacia
  abajo dividiendo en cada paso, terminando exactamente en 1. Nunca
  produce fracciones.

### HomeScreen sin chips de nivel

Como el juego es de un solo nivel, la sección de chips de dificultad
del HomeScreen se reemplaza por una descripción del juego ("Descubre
la regla de cada secuencia y completa los números que faltan.") más
una etiqueta de las operaciones cubiertas.

El HUD del juego también oculta las pestañas de dificultad y muestra
en su lugar el `catLabel` ("Patrones numéricos") como texto centrado.

### Slots dinámicos por hueco

Cada hueco tiene slots del **largo exacto** de la respuesta correcta.
Ej: hueco con valor 8 → 1 slot; hueco con valor 27 → 2 slots; hueco
con valor 256 → 3 slots. Sin leading zeros (el primer dígito 0 se
ignora si el slot está vacío).

### Personaje destacado en el landing

**Cifra** (numerólogo, guardián de los dígitos) — encaja perfecto con
el tema numérico puro.

### Glifos del fondo

Cosmic (15): `+ − × ÷ = → ↗ ↘ ? ··· … 2 3 5 10`
Chalkboard (10): `+ − × ÷ = → ··· ? 2 5`

## Anti-patrones a evitar

- **No** generar secuencias con términos < 1 (ningún 0 ni negativos).
- **No** usar divisores que produzcan fracciones (la división se
  construye hacia atrás desde 1 para garantizar exactitud).
- **No** reactivar las pestañas de dificultad del HUD ni los chips
  del HomeScreen — este juego es deliberadamente de nivel único.
- **No** modificar `ResultsScreen`, `PrintableReport`, los modales
  ni el HUD core — son shell compartido.
