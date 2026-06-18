# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`edinun-games` — repo multi-juego para EDINUN GAMES (juegos de matemáticas, originados como prototipo handoff de Claude Design). Cada juego es una carpeta autocontenida y portable bajo `juegos/<slug>/`. La raíz aloja **solo el landing** (lista de juegos) más copias maestras de los assets que ese landing necesita.

Audiencia infantil; en móvil el lienzo es horizontal y el usuario gira el teléfono físicamente — el contenido **no rota** según orientación del sistema.

**Audiencia por juego:** el default histórico es 6-8 años, pero la mayoría de los juegos recientes (JUEGO-5 en adelante) apuntan a 9-12 según el tema. Las excepciones están documentadas en [`memory/audiencia_por_juego.md`](memory/audiencia_por_juego.md) — consultarlo antes de tocar un juego existente. Para un juego nuevo, asumir 6-8 salvo indicación explícita del usuario.

## Estructura del repo

```
edinun-games/
├── index.html              ← landing del repo (regenerado por la skill)
├── styles.css              ← copia maestra que usa el landing
├── edinun-logo.png         ← copia maestra (favicon del landing)
├── assets/                 ← copias maestras (4 char-*.png + edinun-logo.svg/png)
├── memory/                 ← memorias del repo (audiencia por juego, etc.)
├── COMO-SUBIR-EL-JUEGO.md  ← guía de deploy (no técnica, versión corta)
├── SUBIR-A-SERVIDOR.md     ← guía de deploy + diagnóstico del contador
├── .prompts/               ← prompts one-off para sesiones "ciegas"
└── juegos/
    ├── JUEGO-1-valor-posicional/   ← convención: prefijo JUEGO-N-
    ├── JUEGO-2-operaciones-avanzadas/
    ├── … (JUEGO-3 a JUEGO-12)
    ├── operaciones-basicas/        ← legacy sin prefijo (preservado)
    └── operaciones-combinadas/     ← legacy sin prefijo (preservado)
```

**Convención de slug:** los juegos nuevos usan el prefijo `JUEGO-N-<slug>` (N = siguiente ordinal libre). Dos juegos legacy (`operaciones-basicas`, `operaciones-combinadas`) conservan el nombre sin prefijo y no se renombran. El slug del folder debe coincidir byte a byte con la entrada `slug:` en el array `GAMES` del landing.

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

## Contador de visitas (server-side con fallback)

Cada juego muestra un contador de visitas global. El patrón de referencia vive en `juegos/JUEGO-5-coordenadas-rectangulares/` (ver su `MEMORY.md`, secciones 2026-05-14 y **2026-06-16** — esta última endurece el endpoint tras un incidente en producción):

- **`counter.php`** en la raíz del juego: `GET` → `{"count": N}`; `GET ?inc=1` → incremento atómico (`flock(LOCK_EX)`) guardado en **`visits.txt` en la misma carpeta** del juego. Requiere Apache + PHP con permiso de escritura sobre la carpeta del juego. **No crea subcarpetas** (`mkdir counts/` fallaba con 500 en hosting compartido) y **suprime warnings** para que el body sea JSON puro.
- **`screens.jsx`** (`useVisitorCount` / `markFirstAttempt`) hace `fetch` al endpoint y **cae a `localStorage`** si el servidor no ejecuta PHP (GitHub Pages, `python -m http.server`, doble clic `file://`). En ese modo el conteo es per-navegador. `fetchVisitorCount` tolera tanto JSON `{"count":N}` como número plano.
- **Probar el contador real localmente:** `php -S localhost:8000` desde la carpeta del juego (no `python -m http.server`, que sirve el `.php` como texto).
- **`visits.txt` está gitignoreado** (`juegos/*/visits.txt`); nunca commitearlo.

**Estado actual:** rollout **completo** — los 14 juegos tienen `counter.php` (los 12 `JUEGO-N` + los 2 legacy `operaciones-basicas` y `operaciones-combinadas`), todos **idénticos byte a byte** (versión endurecida de JUEGO-5, `visits.txt` same-dir, sin `counts/`), y los 14 `screens.jsx` ya cablean `useVisitorCount`. `counter.php` no se personaliza por juego. Al crear un juego nuevo, copiar el `counter.php` de cualquier juego existente tal cual.

## Deploy a producción

Los juegos se suben a `https://www.edinun.com/...` (Apache + PHP) carpeta por carpeta. Dos guías en la raíz, ambas en lenguaje no técnico para quien sube:

- [`COMO-SUBIR-EL-JUEGO.md`](COMO-SUBIR-EL-JUEGO.md) — versión corta.
- [`SUBIR-A-SERVIDOR.md`](SUBIR-A-SERVIDOR.md) — incluye diagnóstico del contador (F12 → Network → `counter.php`) y cómo arreglar permisos (755 / 775).

**Antes de subir, borrar `visits.txt` del juego** si existe (estado de prueba local; si se sube, el contador del servidor arranca inflado). El juego se incrusta en producción dentro de un `<iframe>` desde una página envoltorio — subir la **carpeta completa** del juego (`index.html` + `assets/` + `counter.php`) a la subcarpeta que apunta el `src` del iframe. Diagnóstico de fallas en producción: [`DIAGNOSTICO-JUEGO-5.md`](DIAGNOSTICO-JUEGO-5.md).

## Artefactos gitignoreados y tooling

`.gitignore` excluye: `juegos/*/visits.txt` (estado del contador), `juegos/*/counts/`, `juegos/*/.planning/qa-screenshots/`, `juegos/*/.planning/qa-results.json`, `uploads/`, `node_modules/`, `package-lock.json`, `reponsive/` (videos de QA). No commitear ninguno.

`package.json` declara **Playwright** como `devDependency` — se usa para las capturas de QA responsive, no para el runtime del juego (que no tiene build). La carpeta `.prompts/` guarda prompts autocontenidos para sesiones "ciegas" (one-off, no parte del runtime).

## Editar el shell (afecta a todos los juegos)

`app.jsx`, `characters.jsx`, `logo.jsx`, `styles.css` y los assets (`assets/char-*.png`, `assets/edinun-logo.*`) son idénticos entre juegos. Cambiar uno implica:

1. Avisar al usuario qué juegos se regenerarán (lista de slugs en `juegos/`).
2. Replicar el archivo modificado en cada `juegos/<slug>/`.
3. Si el archivo es `.jsx`, re-empaquetar cada juego.
4. Si es `styles.css`, `logo.jsx`, `characters.jsx` o un asset, copiarlo también a la raíz (los usa el landing).
5. Si fue `logo.jsx` o `characters.jsx`, regenerar el landing (su contenido inline copia el JSX completo de logo + characters de algún juego — tradicionalmente el primero por orden alfabético de slug).

## Regenerar el landing

`index.html` raíz embebe inline el código de `logo.jsx` + `characters.jsx` (de algún juego, alfabéticamente el primero) y un literal `GAMES = [{ slug, title, charId }, ...]` con un card por juego. Tras añadir / quitar / renombrar un juego en `juegos/`, hay que regenerar este array. La skill `edinun-game-builder` automatiza este paso; manualmente, ajustar el literal y verificar que:

- cada `slug:` coincide con un folder real en `juegos/`,
- el `charId` está en {`mago`, `fisica`, `numero`, `geo`} y matchea al personaje destacado del juego.
