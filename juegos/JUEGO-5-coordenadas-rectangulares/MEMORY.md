# MEMORY.md — Bitácora del juego "Sistema de coordenadas rectangulares"

Bitácora de decisiones del juego `juegos/JUEGO-5-coordenadas-rectangulares/`
dentro del repo multi-juego `edinun-games`. Las decisiones del shell
compartido viven en los CLAUDE.md de los demás juegos — acá solo lo
específico.

## 2026-05-08 · Setup inicial

### Audiencia 9 años (excepción al default 6-8)

El default del repo es 6-8 años. Para este juego el usuario pidió
audiencia **9 años**, basado en el Tema 1 del libro de mate
"Sistema de coordenadas rectangulares".

### Origen del juego: libro de texto

El usuario envió 2 capturas del libro:
- **Página 1** — Reflexionemos: perro Kody camina 5 pasos derecha + 3
  arriba en cuadrícula con eje x e y. Aplico: Sofía e Iván buscan tesoro
  con coordenadas `(A, 1)` → `(D, 4)`, indicar el camino y la casilla
  con la serpiente.
- **Página 2** — Dibujar emojis en grid (Corazón: C7, Casa: A2, Manzana:
  B8, etc.); leer pares ordenados en plano numérico; formar palabras
  como "ECUADOR" desde una secuencia de pares; producto cartesiano
  Daule/Paute × Costa/Sierra/Amazonía/Galápagos.

### 3 mecánicas distintas mapeadas al libro

| idx | Tema del libro | Mecánica | Validación |
|-----|----------------|----------|------------|
| 0 | "Dibuja" pto.2 — formato `(letra, número)` | Tap entre 4 coordenadas. Grid 5×5 con 6 emojis. "¿En qué casilla está [emoji]?" | Coord. del target |
| 1 | Pto.3 — plano numérico | Tap entre 4 pares `(x, y)`. Plano 5×5 con punto marcado. "¿Qué par representa este punto?" | (x, y) marcado |
| 2 | "Reflexionemos" Kody | Numpad guiado 2 pasos: derecha → arriba. Si falla un paso, ejercicio termina | Cada paso por separado |

### Por qué se diferencia de juegos existentes

- `JUEGO-3-plano-cartesiano` y `JUEGO-4-pares-ordenados` son audiencia
  6-8 años (introducción suave). Este juego es 9 años y combina los
  **dos formatos** del libro (letra-número + numérico) más el camino
  con dos componentes — escalón pedagógico apropiado.
- El formato `(letra, número)` (R1) NO existe en los otros juegos del
  repo, es específico del libro de 9 años.

### R3 sin reintento

Si el chico falla cualquier paso del numpad guiado en R3, el ejercicio
termina como incorrecto. Mismo patrón que R3 de `sustituciones`. La
penalización por errores intermedios es por tiempo (estrellas decrecen)
no por reintento ilimitado — coherente con la edad.

### Pool R1: 6 emojis distintos

`🏠 🍎 🌸 ⭐ 🍉 🐶` — emojis universales y reconocibles. Se colocan en
6 casillas únicas del grid 5×5 (sin repetir ni colisionar). El target
se resalta visualmente con borde dorado y glow.

### Pool R2: distractores cercanos

Los 3 distractores se generan con offset `±2` en x e y, clamp a [0..5],
con guard contra duplicados. Esto fuerza al chico a mirar bien (no
adivinar — todos los pares están visualmente cerca del correcto).

### Pool R3: rangos del Kody

`targetX ∈ [2..6]`, `targetY ∈ [2..5]`. Mínimo 2 para que el camino
sea visible y útil; máximo 6×5 para que el plano de R3 no se sienta
abarrotado. Numpad de 1 dígito por paso.

### Personaje destacado: Pita

Pita (`charId: "geo"`) por afinidad temática con coordenadas y
geometría (mismo charId que `plano-cartesiano` y `fracciones`).

### Glifos del fondo

- Cosmic (15): `x y ( ) , → ↑ ↗ 0 1 2 3 4 A B`
- Chalkboard (10): `x y ( ) , → ↑ A 0 1`

## Anti-patrones a evitar

- **No** confundir el formato `(letra, número)` (R1, mapa) con el plano
  cartesiano numérico `(x, y)` (R2, plano matemático). Son dos sistemas
  distintos que el libro enseña en orden.
- **No** permitir que el R3 deje al chico atascado: si falla un paso,
  el ejercicio termina (igual que `sustituciones`).
- **No** modificar `ResultsScreen`, `PrintableReport`, los modales
  ni el HUD core — son shell compartido.
- **No** reciclar la mecánica numpad como única (sería plano y
  pedagógicamente pobre — el libro enseña 3 cosas distintas).
