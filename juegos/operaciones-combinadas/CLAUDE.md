# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Juego: Operaciones combinadas con decimales.** Carpeta autocontenida
del repo multi-juego `edinun-games`. **Un solo nivel, mecánica única
de pasos guiados** que escala por complejidad de la expresión:

- Ronda 1: 2 operaciones (× con +/−), sin paréntesis.
- Ronda 2: 2 operaciones (÷ con +/−), división siempre limpia.
- Ronda 3: 3 operaciones mezcladas (×, +/−).

Detalle del diseño en `.planning/operaciones-combinadas-design.md`.

**Audiencia 10 años** (excepción al default 6-8 del repo). A esta edad
manejan jerarquía de operaciones y decimales con 1 cifra decimal.

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

Mismo shell que los demás juegos. Wiring vía `window.X = X` (asignado
al final de cada `.jsx` en `Object.assign`).

### Mecánica del juego (`GameScreen`)

Todas las rondas usan la **misma mecánica de pasos guiados**: el chico
ve la expresión completa y la resuelve paso a paso siguiendo la
jerarquía de operaciones (× y ÷ antes que + y −).

Estado:
- `problem.tokens`: array de la expresión completa para mostrar arriba.
- `problem.steps`: array de operaciones a resolver en orden.
- `currentStepIdx`: índice del paso activo.
- `completedSteps`: pasos resueltos (mostrados tenues encima del activo).
- `slots`: array según `answerLayout(step.result)`. Mezcla `_` (slots
  vacíos editables) con `,` (separador decimal fijo no editable).

`makeProblem(cat, idx)` ramifica por idx generando 2-3 pasos.

`pressDigit(d)` rellena el primer slot vacío de izquierda a derecha,
saltando el separador `,`. Sin leading zero salvo cuando la respuesta
empieza con "0," (ej: 0,5).

`verify()` parsea los slots, reconstruye el valor en décimas y compara
con `step.result`. Si correcto: avanzar paso o finalizar ejercicio.
Si incorrecto: feedback transitorio, limpiar slots, retry sin penalizar.

### Aritmética en décimas

Todos los valores se almacenan internamente **en décimas** (×10) para
trabajar con enteros y evitar imprecisión de float (`0.1 + 0.2 ≠ 0.3`
en JS). Display convierte a string con coma:
- 54 → "5,4"
- 60 → "6"
- 200 → "20"
- 5 → "0,5"

### Adaptación del log

| Campo | Valor |
| ----- | ----- |
| `a` | Expresión completa (`"2,5 + 1,8 × 3"`) |
| `b` | Resultado final (`"7,9"`) |
| `op` | `"="` |
| `correctAnswer` | Resultado final |
| `userAnswer` | Lo que escribió el chico (último paso) |

Errores intermedios no se registran (son transientes).

### Personajes

Mismo catálogo. **Personaje destacado en el landing: Cifra**
(`charId: "numero"`).

## QA responsive

Antes de declarar completo, capturar el flujo en al menos: 1920×1080,
1280×800, 1024×768, 768×1024, 667×375, 375×667.
