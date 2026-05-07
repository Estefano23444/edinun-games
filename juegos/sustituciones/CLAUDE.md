# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Juego: Sustituciones y paréntesis.** Carpeta autocontenida del repo
multi-juego `edinun-games`. **Un solo nivel, 3 rondas con mecánicas
distintas** que enseñan sustitución de variables, paréntesis y los
combinan al final:

- Ronda 1: solo sustitución (multiple choice).
- Ronda 2: solo paréntesis (multiple choice).
- Ronda 3: ambos combinados (numpad con pasos guiados).

Detalle del diseño en `.planning/sustituciones-design.md`.

**Audiencia 10 años** (excepción al default 6-8 del repo). A esta edad
introducen variables (concepto pre-algebraico) y paréntesis explícitos.

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

Las 3 rondas usan mecánicas distintas:

- **idx 0** — `Sustituciones` (multiple choice): tabla de variables
  `A=1,2 · B=0,4 · C=5,3 · D=1,5` + expresión con letras `A + B × D`
  + 3 botones grandes con resultados. `answerTap(chosenT)` resuelve.
- **idx 1** — `Paréntesis` (multiple choice): expresión con paréntesis
  explícitos `24,35 + (3 × 2,4) − (10 ÷ 4)` + 3 botones. `answerTap`.
- **idx 2** — `Sustitución + paréntesis` (numpad guiado): tabla de
  variables + expresión con letras y paréntesis `(A + B) × C − D` +
  pasos resueltos uno a la vez con numpad. `verify()` valida cada paso.

`makeProblem(cat, idx)` ramifica por idx. Devuelve estructura común
con `exprTokens` (array de num/var/op para renderizar la expresión),
`vars` (R1 y R3), `correctT` y `options` (R1, R2), o `steps` y
`finalResult` (R3).

### Aritmética en décimas

Todos los valores en décimas (×10) internamente para evitar
imprecisión de float (`0.1 + 0.2 ≠ 0.3`). Helpers `tenthsToStr` y
`answerLayout` desde `operaciones-combinadas` reutilizados.

### Renderizado de expresiones

`renderExprToken(tk, i)` renderiza un token según su tipo:
- `kind: "num"` — valor en décimas, se convierte a string con coma.
- `kind: "var"` — letra (A, B, C, D), se renderiza en cyan claro
  (#4fd8ff) para distinguir de números.
- `kind: "op"` — operador o paréntesis, se renderiza con padding más
  ancho excepto para `(` y `)` que tienen padding mínimo.

### Adaptación del log

| Campo | Valor |
| ----- | ----- |
| `a` | Expresión (`"A + B × D"`, `"24,35 + (3 × 2,4) − (10 ÷ 4)"`) |
| `b` | Variables (`"A=1,2 · B=0,4 · C=5,3 · D=1,5"`) o vacío |
| `op` | `"="` |
| `correctAnswer` | Resultado correcto |
| `userAnswer` | Lo que eligió/escribió el chico |

`ResultsScreen` muestra columna extra "Variables" para reflejar la
nueva información del juego.

### Personajes

Mismo catálogo. **Personaje destacado en el landing: Cifra**
(`charId: "numero"`).

## QA responsive

Antes de declarar completo, capturar el flujo en al menos: 1920×1080,
1280×800, 1024×768, 768×1024, 667×375, 375×667.
