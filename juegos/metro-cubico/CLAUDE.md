# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Juego: Metro cúbico (volumen).** Carpeta autocontenida del repo
multi-juego `edinun-games`. **Un solo nivel**: 3 rondas escalonadas
por operación — ronda 1 multiplicación, ronda 2 división, ronda 3
equivalencias con litros (1 dm³ = 1 L · 1 mL = 1 cm³). Mecánica
única: ecuación de conversión + numpad. Detalle del diseño en
`.planning/metro-cubico-design.md`.

**Audiencia 10 años** (excepción al default 6-8 del repo, ver
`memory/audiencia_por_juego.md` global). Escala completa **km³ · hm³
· dam³ · m³ · dm³ · cm³ · mm³** con factor **×1000 entre adyacentes**
(no ×10 como medidas lineales/masa). Saltos posibles: 1 (×1.000),
2 (×1.000.000), 3 (×1.000.000.000). Saltos mayores no caben en el
**tope de 10 cifras** (≤ 9.999.999.999). Respuestas siempre enteras.

EDINUN GAMES en general — juegos de matemáticas para estudiantes.
Originado como prototipo handoff de Claude Design (claude.ai/design);
el objetivo actual es llevarlo a producción soportando móvil, tablet y
desktop. En móvil el diseño es horizontal pero el dispositivo se
sostiene **vertical**: el usuario gira físicamente el teléfono para
verlo bien (el contenido NO rota junto con la orientación del sistema).

- **Bitácora del proyecto** y decisiones tomadas: ver `MEMORY.md`.
- **Preferencias del usuario**: ver `USER.md`. Léelo antes de cualquier cambio de UI o flujo.
- **Pinch-zoom custom**: ver `juegos/patrones-numericos/.planning/ios-zoom.md` (mismo shell).

## Running / deploying

No build system, no package manager. HTML estático con React 18 + Babel Standalone desde unpkg.

```powershell
powershell -ExecutionPolicy Bypass -File .planning\bundle.ps1
```

## Architecture

Mismo shell que los demás juegos. `App` referencia las pantallas vía `window.HomeScreen`, `window.GameScreen`, etc. El bundle compila los 5 `.jsx` en scope global.

### Mecánica del juego (`GameScreen`)

`makeProblem(cat, idx)` genera el problema según la ronda:

- **idx 0 — Multiplicación:** sortea par mayor→menor en la escala (saltos 1..3) + `fromValue` 1-9 ó 1-99 según saltos. `answer = fromValue × factor`.
- **idx 1 — División:** mismo sorteo de pares pero menor→mayor. `answer` 1-3 dígitos (limitado por factor + tope). `fromValue = answer × factor` para garantizar entero.
- **idx 2 — Litros:** sortea entre 2 equivalencias 1:1 (`dm³ ↔ L`, `cm³ ↔ mL`) + dirección. Píldora visible con ambas equivalencias.

`slots = String(answer).length` (hasta **10 slots** posibles en R1). Numpad llena izq→der, sin leading zeros. `verify()` compara entero estricto.

### Adaptación del log

| Campo | Valor |
| ----- | ----- |
| `a` | Lado izquierdo (`"5 m³"`) |
| `b` | Unidad destino (`"dm³"`) |
| `op` | `"="` |
| `correctAnswer` | Valor numérico correcto (`"5000"`) |
| `userAnswer` | Lo que escribió el chico |

`ResultsScreen` muestra columnas: "Conversión", "=", "Unidad destino", "Respuesta del estudiante", "Respuesta correcta", "Estado", "Tiempo".

### Personajes
**Personaje destacado en el landing: Nova** (`charId: "fisica"`) — magnitudes físicas, mismo charId que `medidas-de-masa`. El usuario puede elegir cualquiera dentro del juego.

## QA responsive

Antes de declarar completo, capturar el flujo en al menos: 1920×1080, 1280×800, 1024×768, 768×1024, 667×375, 375×667.
