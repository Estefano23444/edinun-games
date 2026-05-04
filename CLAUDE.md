# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`edinun-games` — repo multi-juego para EDINUN GAMES (juegos de matemáticas para 6-8 años, originados como prototipo handoff de Claude Design). Cada juego es una carpeta autocontenida y portable bajo `juegos/<slug>/`. La raíz aloja **solo el landing** (lista de juegos) más copias maestras de los assets que ese landing necesita.

Audiencia infantil; en móvil el lienzo es horizontal y el usuario gira el teléfono físicamente — el contenido **no rota** según orientación del sistema.

## Estructura del repo

```
edinun-games/
├── index.html              ← landing del repo (regenerado por la skill)
├── styles.css              ← copia maestra que usa el landing
├── edinun-logo.png         ← copia maestra (favicon del landing)
├── assets/                 ← copias maestras (4 char-*.png + edinun-logo.svg/png)
└── juegos/
    ├── operaciones-basicas/   ← juego autocontenido + CLAUDE.md propio
    └── valor-posicional/      ← idem
```

Cada `juegos/<slug>/` debe seguir funcionando con doble clic aunque la copies fuera del repo (solo necesita internet para CDNs). Por eso duplica `styles.css`, `assets/`, los `.jsx` del shell y los HTML.

## Cómo trabajar en este repo

**Lee siempre el `CLAUDE.md` del juego sobre el que vas a trabajar** (`juegos/<slug>/CLAUDE.md`) — contiene la arquitectura detallada, las invariantes técnicas (centrado del `DeviceStage`, pinch-zoom custom, no `</script>` en `.jsx`), el flujo de pantallas y la mecánica específica del juego. El juego también trae su `USER.md` (preferencias del usuario, QA responsive) y `MEMORY.md` (bitácora). El `CLAUDE.md` raíz (este archivo) **no** repite ese detalle.

Para tareas que crucen varios juegos (editar el shell compartido, crear un juego nuevo, regenerar el landing) **usa la skill `edinun-game-builder`**: define el flujo de aprobación previa, la propagación a todos los juegos cuando se toca el shell, y la regeneración del landing tras añadir un juego. La skill está descrita en `.claude/skills/edinun-game-builder/SKILL.md` y referencias en `.claude/skills/edinun-game-builder/references/`.

## Sin build / sin tests

HTML estático con React 18 + Babel Standalone desde unpkg. No hay package manager, lint, ni suite de tests. Servir con `python -m http.server 8765` desde la raíz para QA, o doble clic en cualquier `index.html` (raíz para landing, `juegos/<slug>/index.html` para un juego).

## Editar un juego

Cada juego tiene 5 `.jsx` editables (`logo`, `characters`, `screens`, `game-screens`, `app`) y dos HTML (`index.html` + `EDINUN GAMES.html`, idénticos byte a byte). Los HTML cargan el JSX **inline** — no leen los `.jsx` en runtime. El flujo es: editar `.jsx` → re-empaquetar al HTML.

```bash
# Re-empaquetar tras editar cualquier .jsx del juego:
python juegos/<slug>/.planning/bundle.py
```

Si Python no está disponible (caso del autor: el `python` del PATH son stubs del Microsoft Store), replica la lógica en PowerShell: concatenar los 5 `.jsx` en el orden `logo → characters → screens → game-screens → app` y reemplazar el bloque `<script type="text/babel">…</script>` en ambos HTML, manteniéndolos idénticos.

**Invariante crítica del bundle:** ningún `.jsx` puede contener literal `</script>` (cerraría el bloque del navegador). Si se necesita dentro de un template literal, partirlo: `${"<\\/scr"+"ipt>"}`.

## Editar el shell (afecta a todos los juegos)

`app.jsx`, `characters.jsx`, `logo.jsx`, `styles.css` y los assets (`assets/char-*.png`, `assets/edinun-logo.*`) son idénticos entre juegos. Cambiar uno implica:

1. Avisar al usuario qué juegos se regenerarán (lista de slugs en `juegos/`).
2. Replicar el archivo modificado en cada `juegos/<slug>/`.
3. Si el archivo es `.jsx`, re-empaquetar cada juego.
4. Si es `styles.css`, `logo.jsx`, `characters.jsx` o un asset, copiarlo también a la raíz (los usa el landing).
5. Si fue `logo.jsx` o `characters.jsx`, regenerar el landing (su contenido inline copia el JSX completo de logo + characters de algún juego — tradicionalmente el primero por orden alfabético de slug).

## Regenerar el landing

`index.html` raíz embebe inline el código de `logo.jsx` + `characters.jsx` (de algún juego, alfabéticamente el primero) y un literal `GAMES = [{ slug, title, charId }, ...]` con un card por juego. Tras añadir / quitar / renombrar un juego en `juegos/`, hay que regenerar este array. La skill `edinun-game-builder` automatiza este paso; manualmente, ajustar el literal y verificar que las rutas `juegos/<slug>/` y los `charId` (`mago` / `fisica` / `numero` / `geo`) sean válidos.
