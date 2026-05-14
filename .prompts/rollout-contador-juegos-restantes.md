# Prompt — Rollout del contador server-side a todos los juegos + actualización de la skill

Pegá este prompt en una sesión nueva de Claude Code abierta en
`d:\Otros\Teletrabajo\edinun-games`. La sesión es ciega — el prompt es
autocontenido.

---

## Contexto

Este repo `edinun-games` aloja varios juegos de matemáticas bajo
`juegos/<slug>/`. Cada juego tenía un contador de visitas en `localStorage`
(`edinun_visitors_v1`). El usuario sube esos juegos a
`https://www.edinun.com/...` (Apache + PHP). El contador `localStorage` da
una cuenta **per-navegador** (Chrome muestra 5, Firefox 0), no global —
problema reportado en producción.

**Ya se aplicó el fix completo en
`juegos/JUEGO-5-coordenadas-rectangulares/`** y quedó documentado en la
sección "2026-05-14 · Contador de visitas server-side" de
`juegos/JUEGO-5-coordenadas-rectangulares/MEMORY.md`. JUEGO-5 es el
**patrón de referencia** — todo lo que sigue es replicarlo a los otros
juegos y dejarlo cocido en la skill para juegos futuros.

## Patrón a replicar (lee primero JUEGO-5)

Antes de empezar leé estos archivos completos:

- `juegos/JUEGO-5-coordenadas-rectangulares/counter.php`
- `juegos/JUEGO-5-coordenadas-rectangulares/screens.jsx` líneas 61-135
  (bloque "Contador de visitas — endpoint PHP...")
- `juegos/JUEGO-5-coordenadas-rectangulares/MEMORY.md` sección
  "2026-05-14 · Contador de visitas server-side"

El patrón consta de:

1. **`counter.php` nuevo** en la raíz del juego. ~40 líneas. GET sin
   params → `{"count": N}`. GET `?inc=1` → incremento atómico
   (`flock(LOCK_EX)`) y guarda en `counts/visits.txt`. Headers
   `Content-Type: application/json` + `Cache-Control: no-store` +
   `Access-Control-Allow-Origin: *`.
2. **`screens.jsx` modificado** — el bloque de `useVisitorCount()` +
   `markFirstAttempt()` (justo después de `CosmosBg`, antes de
   `PeopleIcon`) se reemplaza por la versión async que hace `fetch` al
   PHP y cae a `localStorage` si falla. Las constantes `VISITOR_ENDPOINT`,
   `VISITOR_KEY`, `VISITOR_SESSION_FLAG` quedan a nivel de módulo. La
   firma del hook y de la función exportadas a `window` no cambia (el
   código que las consume — `HomeScreen` y `GameScreen` — no requiere
   tocarse).
3. **Re-empaquetar** con `powershell -ExecutionPolicy Bypass -File
   .planning\bundle.ps1` o `python juegos/<slug>/.planning/bundle.py` si
   está disponible. `index.html` y `EDINUN GAMES.html` deben quedar
   byte-idénticos entre sí.

## Lista de juegos a actualizar (13 juegos)

Todos los de `juegos/` **excepto JUEGO-5**:

```
juegos/JUEGO-1-valor-posicional/
juegos/JUEGO-2-operaciones-avanzadas/
juegos/JUEGO-3-plano-cartesiano/
juegos/JUEGO-4-pares-ordenados/
juegos/JUEGO-6-fracciones/
juegos/JUEGO-7-patrones-numericos/
juegos/JUEGO-8-medidas-de-masa/
juegos/JUEGO-9-numeros-primos/
juegos/JUEGO-10-sustituciones/
juegos/JUEGO-11-metro-cubico/
juegos/JUEGO-12-conversion-masa/
juegos/operaciones-basicas/
juegos/operaciones-combinadas/
```

## Pasos por cada juego (idempotentes)

1. **Crear `counter.php`** en la raíz del juego — copia exacta del de
   JUEGO-5 (`Read juegos/JUEGO-5-coordenadas-rectangulares/counter.php`
   y `Write` al destino). El archivo es **idéntico** entre juegos — no
   personalices nada.

2. **Editar `screens.jsx`** — localizar el bloque actual del contador.
   El bloque legacy se ve así (puede variar ligeramente entre juegos
   en comentarios pero la lógica es la misma):

   ```js
   // ─────────────────────────────────────────────────────────────
   // Visitor ticker — valor persistente en localStorage.
   // ─────────────────────────────────────────────────────────────
   function useVisitorCount() {
     const KEY = "edinun_visitors_v1";
     // ... lee de localStorage, escucha "edinun:visitors-updated" ...
   }

   function markFirstAttempt() {
     const KEY = "edinun_visitors_v1";
     const SESSION_FLAG = "edinun_visit_counted_v1";
     if (sessionStorage.getItem(SESSION_FLAG) === "1") return;
     // ... incrementa en localStorage ...
   }
   ```

   Reemplazalo **completo** por el patrón de JUEGO-5 (constantes
   `VISITOR_ENDPOINT` / `VISITOR_KEY` / `VISITOR_SESSION_FLAG`,
   `fetchVisitorCount`, `readLocalVisitorCount`, `writeLocalVisitorCount`,
   `useVisitorCount` async, `markFirstAttempt` async). Cuidado:

   - Algunos juegos tienen 1-2 líneas de comentario extra arriba (e.g.
     "Contador de partidas completadas..." o variantes en español).
     Mantené esos comentarios si describen algo del juego; reemplazá
     solo el bloque del visitor counter.
   - La línea `Object.assign(window, { ..., useVisitorCount,
     markFirstAttempt });` al final del archivo **se mantiene** — los
     nombres exportados no cambian.
   - Si el juego tiene `incrementGamesCompleted()` (contador de partidas
     completadas, también `localStorage`-based), **dejalo como está**.
     Es per-usuario, no global — `localStorage` es lo correcto.

3. **Re-empaquetar:**

   ```powershell
   Set-Location juegos\<slug>
   powershell -ExecutionPolicy Bypass -File .planning\bundle.ps1
   ```

   Si falta `bundle.ps1` y solo hay `bundle.py`, y `python` está como
   stub del Microsoft Store en PATH (caso del autor), copiá el
   `bundle.ps1` de JUEGO-5 (`juegos/JUEGO-5-coordenadas-rectangulares/.planning/bundle.ps1`)
   al `.planning/` del juego destino. Es idéntico entre juegos.

4. **Verificar** que `index.html` y `EDINUN GAMES.html` tienen el mismo
   `Length`. Si difieren, algo en el bundle se rompió.

## Actualizar la skill `edinun-game-builder`

Después de los 13 juegos, dejar el patrón cocido en el template para
que los juegos futuros nazcan con el contador server-side.

1. **`.claude/skills/edinun-game-builder/assets/template-juego/counter.php`**
   — crear (copia del de JUEGO-5).

2. **`.claude/skills/edinun-game-builder/assets/template-juego/screens.jsx`**
   — reemplazar el bloque del contador legacy por el patrón server-side
   (idéntico al de JUEGO-5).

3. **Re-empaquetar el template** (si la skill mantiene los HTML del
   template empaquetados, lo cual es así — ver `template-juego/index.html`
   y `template-juego/EDINUN GAMES.html`). Si el template no tiene
   `bundle.ps1`, copiar el de JUEGO-5 al `.planning/` del template.

4. **`.claude/skills/edinun-game-builder/references/invariants.md`** —
   agregar una sección breve documentando que el contador es server-side
   (PHP + flock + counts/visits.txt) con fallback localStorage, y que
   los nuevos juegos heredan `counter.php` del template sin
   personalización.

5. **`.claude/skills/edinun-game-builder/assets/template-juego/CLAUDE.md.template`**
   — agregar una sección "Contador de visitas (server-side con fallback)"
   similar a la que se agregó en JUEGO-5/CLAUDE.md.

6. **`.claude/skills/edinun-game-builder/SKILL.md`** — si tiene un
   checklist de archivos del juego, agregar `counter.php` a la lista.

## Actualizar el CLAUDE.md raíz

En `CLAUDE.md` raíz, agregar una sección breve (3-5 líneas) bajo "Editar
un juego" o como sección nueva: "Contador de visitas — patrón
server-side". Mencionar:

- Cada juego tiene `counter.php` (Apache+PHP en producción).
- `counts/visits.txt` se gitignorea (ya está en `.gitignore`).
- En GitHub Pages / servidor estático, el fetch cae a `localStorage`.
- Para probar el contador global localmente: `php -S localhost:8000` en
  la carpeta del juego.

## Verificación final

1. Por cada juego modificado, confirmá que tiene:
   - `counter.php` en la raíz (mismo SHA que JUEGO-5).
   - El bloque del contador en `screens.jsx` con `VISITOR_ENDPOINT =
     "counter.php"`.
   - `index.html` y `EDINUN GAMES.html` con el mismo tamaño.

2. Test funcional local (opcional pero recomendado para 1 juego de
   muestra):

   ```powershell
   Set-Location juegos\JUEGO-1-valor-posicional
   php -S localhost:8000
   ```

   Abrí Chrome y Firefox en `http://localhost:8000/`. Llegá al primer
   intento real del juego (no solo Home). El número en el contador debe
   coincidir entre los dos navegadores e incrementarse en uno por
   sesión.

3. **No commitees `counts/`** (ya está en `.gitignore`).

## Commit

Cuando todo esté verde, hacé **un solo commit**:

```
feat(contador): rollout del contador server-side a los 13 juegos restantes + skill

- counter.php en cada juego (Apache+PHP, atómico con flock)
- screens.jsx: useVisitorCount/markFirstAttempt con fetch + fallback localStorage
- Template de la skill edinun-game-builder actualizado para juegos futuros
- CLAUDE.md raíz documenta el patrón

Referencia del fix piloto: JUEGO-5 (MEMORY.md sección 2026-05-14).
```

No hagas push. El usuario decide cuándo.
