# MEMORY.md — Bitácora del juego "Conversión entre unidades de masa"

Bitácora de decisiones del juego `juegos/conversion-masa/` dentro del
repo multi-juego `edinun-games`. Las decisiones del shell compartido
viven en los CLAUDE.md de los demás juegos — acá solo lo específico.

## 2026-05-07 · Setup inicial

### Audiencia 10 años (excepción) y diferencia con `medidas-de-masa`

El default del repo es 6-8 años. Para `conversion-masa` el usuario
pidió **audiencia 10 años**, basado en el Tema 3 del libro "Conversión
entre unidades de masa".

Diferencia con el juego ya existente `medidas-de-masa` (9 años):
- `medidas-de-masa` cubre toda la escala kg→mg con factor ×10 y libra
  con pool entero. Usa **una sola mecánica** (numpad).
- `conversion-masa` enfoca las conversiones del **libro real** del chico
  (kg↔g, kg↔lb, kg↔t, g↔lb, lb↔kg) con **3 mecánicas distintas**
  (no solo numpad).

### Origen del juego: libro de texto

El usuario envió 3 capturas del libro:
- Reglas: kg↔g (×1000), kg↔lb (×2,2)
- Estimación de pesos razonables (4 objetos, 3 opciones)
- Conversiones con cálculo: 15 kg a g, 3 567 g a lb, 350 kg a t
- Problema verbal: Lorena viaja, maleta máx 23 kg, balanza 44 lb

### 3 mecánicas distintas

| idx | Tema | Mecánica | Por qué es nueva |
| --- | ---- | -------- | ---------------- |
| 0 | ¿Cuál pesa más? | Tap entre 3 cards con productos en unidades distintas | Comparación visual entre productos — no existe en otros juegos |
| 1 | ¿Cuál NO equivale? | Tap entre 4 opciones (3 correctas, 1 falsa) | Find-the-impostor — no existe en otros juegos |
| 2 | Conversión paso a paso | Numpad guiado, 2 saltos | Existe en sustituciones/operaciones-combinadas pero acá con conversiones encadenadas, no aritmética |

### Por qué multiple mechanics

El usuario rechazó la primera propuesta (Estimación + V/F + numpad) por
parecerse mucho a juegos existentes. La segunda propuesta (cuál pesa
más + cuál no equivale + paso a paso) fue aprobada.

### Cobertura de unidades

R1 (cuál pesa más): cualquier combinación de g, kg, lb, t.

R2 (cuál no equivale): pool curado de orígenes con sus equivalencias
correctas (kg↔g, kg↔lb, kg↔t, kg↔mg, g↔kg, lb↔kg, etc.). Para generar
la falsa, se toma una equivalencia correcta y se multiplica/divide por
10, 100 o 0,1 — error típico de "mover ceros".

R3 (paso a paso): cadenas con respuestas enteras o decimales limpias:
- t → kg → g (×1000, ×1000)
- g → kg → t (÷1000, ÷1000)
- lb → kg → g (÷2,2 con pool entero, ×1000)
- kg → g → mg (×1000, ×1000)

### Factor lb redondeado a 454

El libro usa **453,59** g/lb (factor real). En el juego usamos **454**
para mantener respuestas enteras en el pool curado. La diferencia
pedagógica es mínima a esta edad.

Para kg↔lb se usa el factor entero **2,2** (pool clásico 5kg/11lb)
herencia de `medidas-de-masa`.

### Personaje destacado: Nova

Nova (`charId: "fisica"`) por afinidad temática con magnitudes físicas
(mismo charId que `medidas-de-masa`).

### Glifos del fondo

Cosmic (15): `kg g lb t mg × ÷ 1000 2,2 454 = → ↗ ? ≠`
Chalkboard (10): `kg g lb t × ÷ 1000 2,2 = ?`

### Pool de objetos en R1

15 objetos cotidianos con masas reales en gramos (`OBJECTS`):
- Lápiz (8 g), Hoja (5 g), Manzana (180 g), Pelota (600 g), Libro (800 g)
- Botella 1L (1 kg), Papaya (1,3 kg), Caja galletas (2 kg), Mochila (3 kg)
- Sandía (8 kg), Bicicleta (12 kg), Perro (26 kg), Persona (70 kg)
- Auto (1,5 t), Camión (2,8 t)

La unidad de display se sortea entre opciones razonables para esa
magnitud.

## Anti-patrones a evitar

- **No** usar numpad como única mecánica — el chico ya jugó
  `medidas-de-masa` con esa mecánica.
- **No** usar el factor 453,59 en el juego — los pares no dan enteros.
- **No** introducir tonelada corta (907,18) — el currículo regional
  usa tonelada métrica (1000 kg).
- **No** modificar `ResultsScreen`, `PrintableReport`, los modales
  ni el HUD core — son shell compartido.
