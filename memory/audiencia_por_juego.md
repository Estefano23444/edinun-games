---
name: Audiencia por juego (excepciones al default 6-8)
description: La audiencia por defecto del repo edinun-games es 6-8 años. Se documentan acá las excepciones por juego (fracciones 9-12, patrones-numericos 9, medidas-de-masa 9, numeros-primos 10).
type: project
---

La audiencia por defecto del repo `edinun-games` (definida en `CLAUDE.md` y `USER.md` de cada juego) es **6-8 años**.

## Excepciones documentadas

### `juegos/fracciones/` — 9-12 años (2026-05-05)

- Denominadores hasta 10-12 (vs 2-8 del rango básico).
- Slots numéricos de 2 dígitos (centésimas).
- Copy menos infantilizado (terminología técnica: "amplificación", "simplificación", "centésimas").
- **Why:** el usuario lo pidió explícitamente. Los 3 niveles (Fracciones / Equivalentes / Decimales) son contenido del segundo ciclo escolar.

### `juegos/patrones-numericos/` — 9 años (2026-05-05)

- Único nivel (sin chips de dificultad en Home, sin tabs en HUD del juego).
- 3 ejercicios escalonados por operación: suma/resta → multiplicación → división.
- Multiplicación con factores ×2..×5; División con divisores ÷2..÷5.
- Suma/resta con pasos ±1..±15.
- **Solo números naturales** (≥ 1) — ningún término puede ser 0 o negativo, ni la división puede producir fracción.
- **Why:** el usuario lo pidió explícitamente. A 9 años ya saben las tablas de multiplicar.

### `juegos/numeros-primos/` — 10 años (2026-05-06)

- Único nivel (sin chips de dificultad en Home, sin tabs en HUD del juego).
- 3 rondas con **mecánicas distintas** (no escalado dentro de una sola mecánica):
  - Ronda 1 — `¿Primo o compuesto?`: tap binario (2 botones), número 2..80, mezcla 50/50.
  - Ronda 2 — `¿Cuál es el primo?`: tap entre 4 opciones, números 10..80, compuestos no triviales.
  - Ronda 3 — `Descompón en factores primos`: numpad + separadores `×` fijos, validación estricta en orden ascendente.
- Pool de factorización (ronda 3): 23 números curados con 2-4 factores primos, descartando los de 5+ factores (48, 72, 96).
- Numpad solo aparece en ronda 3; rondas 1 y 2 son tap directo.
- Personaje destacado en landing: **Cifra** (`charId: "numero"`).
- **Why:** el usuario lo pidió explícitamente. A 10 años se enseña formalmente la descomposición en factores primos en el currículo.

### `juegos/medidas-de-masa/` — 9 años (2026-05-06)

- Único nivel (sin chips de dificultad en Home, sin tabs en HUD del juego).
- 3 rondas escalonadas **por operación** (no por distancia):
  - Ronda 1 — SOLO multiplicación (×): cualquier par mayor→menor en la escala `kg, hg, dag, g, dg, cg, mg`. Factor de ×10 (adyacentes) hasta ×1.000.000 (kg↔mg).
  - Ronda 2 — SOLO división (÷): mismo sorteo de pares, dirección invertida (menor→mayor). Factor de ÷10 hasta ÷1.000.000.
  - Ronda 3 — kg ↔ libra (factor `1 kg = 2,2 lb` visible en pantalla).
- **Tope 7 cifras** (≤ 9.999.999). Originalmente era 3 cifras pero el usuario expandió el alcance para que `kg↔mg` (factor 1.000.000) sea posible.
- **Solo respuestas enteras** (no decimales). En ronda 2 el `fromValue` se construye como `answer × factor` para garantizarlo. Libras usa pool predefinido de pares limpios (múltiplos de 5 kg / 11 lb).
- **Escala completa kg→mg + libra**: el usuario expandió el alcance original ("solo múltiplos") para incluir también submúltiplos (dg, cg, mg).
- Personaje destacado en landing: **Nova** (`charId: "fisica"`).
- **Why:** el usuario lo pidió explícitamente. A 9 años ya manejan multiplicación por 10/100/1000... y la magnitud de los millones es un buen reto pedagógico para entender la escala completa.

## How to apply

- Si el usuario pide tocar uno de los juegos listados arriba, respetar la audiencia documentada.
- Para juegos nuevos sobre otros temas, asumir 6-8 años salvo que el usuario indique otra cosa.
- Si la lista crece a 3+ excepciones, considerar moverlas al `USER.md` de cada juego o crear variantes del default.
