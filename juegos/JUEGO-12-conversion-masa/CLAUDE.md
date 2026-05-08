# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Juego: Conversión entre unidades de masa.** Carpeta autocontenida del repo
multi-juego `edinun-games`. **Un solo nivel, 3 rondas con mecánicas
distintas** (no es solo numpad como `medidas-de-masa`):

- Ronda 1 — `¿Cuál pesa más?`: 3 productos en unidades distintas, tap el más pesado.
- Ronda 2 — `¿Cuál NO equivale?`: 1 origen + 4 opciones (3 correctas, 1 falsa), tap la falsa.
- Ronda 3 — `Conversión paso a paso`: numpad guiado, 2 saltos atravesando una unidad intermedia.

Detalle del diseño en `.planning/conversion-masa-design.md`.

**Audiencia 10 años** (excepción al default 6-8 del repo). Cubre las
conversiones del libro de texto: kg ↔ g (×1000), kg ↔ lb (×2,2), kg ↔ t
(×1000 métrica), g ↔ lb (×454 redondeado), lb ↔ kg (÷2,2).

EDINUN GAMES en general — juegos de matemáticas para estudiantes.
Originado como prototipo handoff de Claude Design (claude.ai/design);
el objetivo actual es llevarlo a producción soportando móvil, tablet y
desktop.

- **Bitácora del proyecto**: ver `MEMORY.md`.
- **Preferencias del usuario**: ver `USER.md`.
- **Pinch-zoom custom**: ver `juegos/patrones-numericos/.planning/ios-zoom.md` (mismo shell).

## Running / deploying

No build system, no package manager. HTML estático con React 18 +
Babel Standalone desde unpkg.

```powershell
powershell -ExecutionPolicy Bypass -File .planning\bundle.ps1
```

## Architecture

Mismo shell que los demás juegos. Wiring vía scope global de Babel
inline (todas las funciones top-level quedan en `window`).

### Mecánica del juego (`GameScreen`)

`makeProblem(cat, idx)` ramifica por idx:

- **idx 0** — `¿Cuál pesa más?`: sortea 3 objetos del pool `OBJECTS` con masas distintas. Cada uno se muestra en una unidad sorteada (g, kg, lb, t) según su magnitud. `correctIdx` apunta al de mayor `massG`. `answerTapR1(chosenIdx)` resuelve.
- **idx 1** — `¿Cuál NO equivale?`: sortea un origen del pool `sources` (cada uno con sus equivalencias correctas). Toma 3 correctas + 1 corrompida (multiplicar/dividir por 10/100). `answerTapR2(chosenIdx)` resuelve.
- **idx 2** — `Conversión paso a paso`: sortea una `chain` (sourceUnit → midUnit → finalUnit) con `midFactor` y `finalFactor`. Numpad guiado, 2 pasos. `verify()` valida cada paso.

### Helpers de conversión

- `toGrams(value, unit)` y `fromGrams(grams, unit)`: convierten a/desde gramos como base.
- `fmt(n)`: formatea con coma decimal (es-CO style), redondeo a 3 decimales.
- `answerLayout(value)`: genera array de slots con coma fija si el valor es decimal.

### Adaptación del log

| Campo | R1 | R2 | R3 |
| ----- | -- | -- | -- |
| `a` | `"Mochila 3kg · Libro 800g · Pelota 5lb"` | `"5 kg"` | `"5 lb"` |
| `b` | `"¿cuál pesa más?"` | `"no equivale a"` | `finalUnit` (`"g"`) |
| `op` | `"→"` | `"≠"` | `"="` |
| `correctAnswer` | nombre + valor del más pesado | la opción falsa | `finalValue` |
| `userAnswer` | el item tapeado | la opción tapeada | lo que escribió |

### Personajes

Mismo catálogo. **Personaje destacado en el landing: Nova**
(`charId: "fisica"`) — magnitudes físicas, mismo charId que `medidas-de-masa`.

## QA responsive

Antes de declarar completo, capturar el flujo en al menos: 1920×1080,
1280×800, 1024×768, 768×1024, 667×375, 375×667.
