# MEMORY.md — Bitácora del juego "Números primos"

Bitácora de decisiones del juego `juegos/numeros-primos/` dentro del
repo multi-juego `edinun-games`. Las decisiones del shell compartido
viven en los CLAUDE.md de los demás juegos — acá solo lo específico.

## 2026-05-06 · Setup inicial del juego

### Audiencia: 10 años (excepción)

El default del repo es 6-8 años. Para `numeros-primos` el usuario
pidió **audiencia 10 años** porque a esta edad se enseña formalmente
la descomposición en factores primos en el currículo.

### Mecánica escalonada (3 rondas, 3 mecánicas distintas)

A diferencia de los juegos numéricos previos (que tienen una mecánica
única que escala dentro del problema), acá cada ronda tiene una
**mecánica distinta** para cubrir el concepto de extremo a extremo:

| idx | Tema | Mecánica | Ejemplos |
| --- | ---- | -------- | -------- |
| 0   | ¿Primo o compuesto? | Tap binario (2 botones) | "47" → PRIMO |
| 1   | ¿Cuál es el primo?  | Tap entre 4 opciones    | [29, 33, 49, 51] → 29 |
| 2   | Descomposición guiada | Numpad, escalera de divisiones paso a paso | 42 → 42÷2=21 → 21÷3=7 → 7÷7=1 |

### Pools curados

- **Primos en rango 2..80**: lista hardcoded `PRIMES_2_80` con 22
  primos. Sirve para ronda 1 (cuando isPrime=true) y ronda 2.
- **Compuestos en rango 4..80**: derivado en runtime con `isPrime()`.
- **Compuestos no triviales (ronda 2)**: filtrados para excluir
  múltiplos de 10 (que serían descartes obvios).
- **Pool de factorización (ronda 3)**: 23 números curados con 2-4
  factores primos manejables (12, 14, 15, 18, 20, 21, 24, 28, 30, 35,
  36, 42, 45, 50, 54, 56, 60, 63, 70, 75, 84, 90, 100). Se descartaron
  48, 72 y 96 porque tienen 5 factores primos cada uno (mucho para
  visualizar en una sola fila).

### Iteración 2: ronda 3 cambió de "escribir todo de una" a "guiada paso a paso"

**Versión inicial (descartada):** el chico escribía la descomposición
completa con numpad + separadores `×`, validación estricta en orden
ascendente. **Problema:** el chico se quejó de que escribir los factores
en otro orden (ej. `3×2×7` en vez de `2×3×7`) lo marcaba mal.

**Versión actual:** mecánica guiada estilo "escalera de divisiones" de
los libros de mate. Un factor primo a la vez; cada paso correcto avanza
y muestra el cociente; el ejercicio termina cuando el cociente llega a 1.

Ventajas:
- Refleja el proceso real que se enseña en clase.
- No tiene problema de orden — el chico puede empezar por cualquier
  primo válido (para 12 puede ir 2→2→3 o 3→2→2).
- Feedback inmediato por paso (ve el cociente actualizado después de
  cada acierto).
- Errores intermedios no fallan el ejercicio (solo penalizan por tiempo).

### Numpad solo en ronda 3

Las rondas 1 y 2 son **tap directo** (botones de respuesta en la
zona-central, no numpad). El numpad inferior solo aparece en ronda 3.
Botones laterales:
- Ronda 1, 2: solo SALIR.
- Ronda 3: VERIFICAR + BORRAR + SALIR.

Esto reduce confusión visual: el chico no ve un numpad que no usa.

### Slot único en ronda 3

En ronda 3 el slot es **uno solo, de 1 dígito** (todos los factores
del pool son ∈ {2,3,5,7}). El chico escribe un dígito, toca VERIFICAR;
si es válido, el slot se limpia y queda listo para el siguiente paso.
La escalera de pasos completados se renderiza encima de la fila activa.

### Personaje destacado en el landing

**Cifra** (numerólogo, `charId: "numero"`) — los primos son
literalmente "los átomos de los números", encaja perfecto.

### Glifos del fondo

Cosmic (15): `2 3 5 7 11 13 17 19 23 × ÷ = ↗ ··· ?`
Chalkboard (10): `2 3 5 7 11 13 × = ··· ?`

## Anti-patrones a evitar

- **No** incluir 1 en el pool de primos ni de compuestos. 1 no es
  primo ni compuesto (definición matemática). Si aparece confundiría
  al chico.
- **No** ampliar el pool de factorización a números con 5+ factores
  primos (ya descartados 48, 72, 96). Visualmente no entran.
- **No** mostrar el numpad en rondas 1 y 2 — son tap directo.
- **No** marcar el ejercicio de ronda 3 como fallado si el chico se
  equivoca en pasos intermedios. Los errores son transitorios; el
  ejercicio se evalúa cuando el cociente llega a 1.
- **No** modificar `ResultsScreen`, `PrintableReport`, los modales
  ni el HUD core — son shell compartido.
