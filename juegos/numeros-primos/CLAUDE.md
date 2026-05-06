# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Juego: Números primos.** Carpeta autocontenida del repo
multi-juego `edinun-games`. **Un solo nivel, 3 rondas con mecánicas
distintas** — escala el concepto de extremo a extremo: reconocer →
discriminar → descomponer. Detalle del diseño en
`.planning/numeros-primos-design.md`.

**Audiencia 10 años** (excepción al default 6-8 del repo, ver
`memory/audiencia_por_juego.md` global). A esta edad ya manejan tablas
y empiezan formalmente la descomposición en factores primos.

EDINUN GAMES en general — juegos de matemáticas para estudiantes.
Originado como prototipo handoff de Claude Design (claude.ai/design);
el objetivo actual es llevarlo a producción soportando móvil, tablet y
desktop. En móvil el diseño es horizontal pero el dispositivo se
sostiene **vertical**: el usuario gira físicamente el teléfono.

- **Bitácora del proyecto** y decisiones tomadas: ver `MEMORY.md`.
- **Preferencias del usuario** (principios de usabilidad, metodología responsive, invariantes de diseño): ver `USER.md`. **Léelo antes de cualquier cambio de UI o flujo.**
- **Pinch-zoom custom**: ver `juegos/patrones-numericos/.planning/ios-zoom.md` (mismo shell).

## Documentación de cambios importantes

Toda decisión de arquitectura, plan de implementación, o nota técnica relevante se documenta como archivo markdown dentro de `.planning/` del juego.

- **Un archivo por tema**.
- **Cada archivo debe tener menos de 200 líneas.**
- Cambios triviales no requieren entrada en `.planning/`.

## Running / deploying

No build system, no package manager. Es HTML estático que carga React 18 + Babel Standalone desde unpkg.

- **Abrir local:** doble clic en `index.html` o `EDINUN GAMES.html`.
- **Servir local:** `python -m http.server 8765` desde la raíz del repo.

## Architecture

Mismo shell que los demás juegos. Los 5 `.jsx` (`logo`, `characters`, `screens`, `game-screens`, `app`) son la fuente editable. Tras editar, re-empaquetar:

```powershell
powershell -ExecutionPolicy Bypass -File .planning\bundle.ps1
```

Invariantes:
- **No incluir `</script>` literal en ningún `.jsx`.**
- **El bundle reescribe desde `<script type="text/babel">` hasta `</html>`**.

### Mecánica del juego (`GameScreen`)

Tres rondas con mecánicas distintas. `makeProblem(cat, idx)` ramifica:

- **idx 0** — `¿Primo o compuesto?`: número en pantalla + 2 botones grandes (`PRIMO` / `COMPUESTO`). Random 2..80, mezcla 50/50 primos vs compuestos. `answerTap(label)` resuelve directo.
- **idx 1** — `¿Cuál es el primo?`: 4 números en grilla 4×1, exactamente uno es primo. Random 10..80. Compuestos no triviales (excluye múltiplos de 10). `answerTap(number)` resuelve directo.
- **idx 2** — `Descompón en factores primos`: número compuesto + numpad 0-9 + slots dinámicos con separadores `×` fijos. Pool de 23 números curados (12, 14, 15, ... 100), todos con 2-4 factores manejables. Validación **estricta** en orden ascendente. `verify()` compara `factorTokens` contra `problem.factors`.

### Adaptación del log

Cada ronda usa el formato `{a, b, op, correctAnswer, userAnswer}` adaptado:

- Ronda 1: `a=número`, `b=PRIMO|COMPUESTO`, `op="="`.
- Ronda 2: `a="29, 33, 49, 51"`, `b="primo"`, `op="→"`, `correctAnswer="29"`.
- Ronda 3: `a=número`, `b="2×3×7"`, `op="="`, `correctAnswer="2×3×7"`.

`ResultsScreen` muestra columnas: "Enunciado", "Respuesta del estudiante", "Respuesta correcta", "Estado", "Tiempo" — más simple que los juegos con operación visible (porque cada ronda tiene formato distinto).

### Personajes
Mismo catálogo que los demás juegos. **Personaje destacado en el landing: Cifra** (`charId: "numero"`) por afinidad con el tema numérico puro.

## QA responsive

Antes de declarar completo, capturar el flujo en al menos: 1920×1080, 1280×800, 1024×768, 768×1024, 667×375, 375×667.
