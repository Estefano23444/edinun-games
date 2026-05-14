# Prompt — Fix del contador de visitas en el OTRO repo (agnóstico al juego)

Pegá este prompt en una sesión nueva de Claude Code abierta **en el otro
repositorio** (el que contiene juegos distintos a los de `edinun-games`).
La sesión es ciega — el prompt es autocontenido. **No supone nada sobre
la temática de los juegos.**

---

## Contexto

Este repo aloja juegos web (HTML estático + JS) que el usuario sube a
`https://www.edinun.com/...` (Apache + PHP). Los juegos llevan un
**contador de visitas** que actualmente se almacena en `localStorage`.
Eso significa que cada navegador tiene su propia cuenta — Chrome muestra
5 visitas, Firefox 0 sobre la misma URL. El usuario necesita un contador
**global** real.

El servidor de producción (`edinun.com`) corre Apache y soporta PHP. La
solución es un endpoint PHP minimalista por juego + un cliente JS que lo
consume, con fallback a `localStorage` si PHP no está disponible (por
ejemplo, en GitHub Pages o desarrollo local sin PHP).

Este patrón **ya está validado en otro repo** (`edinun-games`,
juego JUEGO-5-coordenadas-rectangulares). Este prompt replica el patrón
a este repo, **independientemente de la temática de los juegos**.

## Paso 1 — Mapear el repo

Antes de tocar código, identificá:

1. **Estructura del repo:** ¿juegos en `juegos/<slug>/`, `games/`,
   carpetas en raíz, otra? Listá las carpetas que contienen un juego
   completo (cada una con su `index.html` + scripts/JSX).

2. **Bundler / pipeline:** ¿hay un build step? ¿los HTML se generan a
   partir de `.jsx` / `.ts` / `.vue` / archivos sueltos? Buscá scripts
   en `package.json`, `bundle.py`, `bundle.ps1`, Makefile, etc. Si no
   hay bundler, los HTML son la fuente editable.

3. **Skill / template:** ¿hay un `.claude/skills/.../SKILL.md` o un
   template-juego en este repo? Si sí, ubicalo. Si no, saltá la parte
   de actualizar skill al final.

4. **Localización del contador legacy:** buscá con Grep en todo el repo:

   ```
   patterns: "localStorage" + ("visitor" OR "visit" OR "contador" OR "edinun_visitors")
   ```

   Identificá las funciones que (a) leen el contador y (b) lo
   incrementan. Típicamente se llaman `useVisitorCount` / `getVisitors`
   / `incrementVisitors` / `markVisit` / equivalentes. Anotá:

   - Archivo y línea de cada definición.
   - Cómo se persiste (clave de `localStorage`, formato).
   - Cómo se invoca (¿en `useEffect` al montar Home? ¿en el primer
     click del juego?).
   - Si hay un `sessionStorage` flag para idempotencia por pestaña.

5. **Convención de `fetch` en este repo:** ¿hay `Access-Control-Allow-Origin`
   ya configurado en otro `.php`? ¿hay un `.htaccess` con headers? Eso
   informa si necesitás agregar CORS o si ya viene por defecto.

**Reportá tu mapeo al usuario antes de continuar.** Esperá feedback —
puede haber decisiones (e.g. un solo `counter.php` compartido vs uno
por juego) que solo el usuario puede tomar.

## Paso 2 — Implementar el `counter.php` (idéntico a edinun-games)

Crear el siguiente archivo en la raíz de cada juego (o en una ubicación
compartida si el usuario lo prefiere — ver decisión del Paso 1):

```php
<?php
// counter.php — Contador de visitas global por juego (servidor con PHP).
//
// GET (sin params)  → devuelve {"count": N}
// GET ?inc=1        → incrementa atómicamente y devuelve {"count": N+1}
//
// Almacena el conteo en ./counts/visits.txt (creado en demanda).
// Atómico vía flock(LOCK_EX) para evitar carreras entre peticiones simultáneas.
//
// Requiere Apache + PHP con permisos de escritura sobre la carpeta del juego.
// En GitHub Pages u otros servidores estáticos el archivo se sirve como
// texto plano: el cliente detecta el fallo de JSON.parse y cae al contador
// localStorage (ver lógica del cliente).

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');

$dir = __DIR__ . '/counts';
if (!is_dir($dir)) {
    @mkdir($dir, 0755, true);
}
$file = $dir . '/visits.txt';

$increment = isset($_GET['inc']) && $_GET['inc'] === '1';

$fp = @fopen($file, 'c+');
if ($fp === false) {
    http_response_code(500);
    echo json_encode(['error' => 'cannot open counter file']);
    exit;
}

@flock($fp, LOCK_EX);
$raw = stream_get_contents($fp);
$current = (int) trim((string) $raw);
if ($increment) {
    $current += 1;
    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, (string) $current);
    fflush($fp);
}
@flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['count' => $current]);
```

## Paso 3 — Modificar el cliente JS

Reemplazá el bloque legacy del contador (identificado en el Paso 1) por
este patrón. La forma exacta depende del framework — abajo va React
puro (igual al de edinun-games); si el otro repo usa Vue, Vanilla JS,
Svelte, etc., **adaptá la forma manteniendo la lógica idéntica**:

```jsx
const VISITOR_ENDPOINT = "counter.php"; // relativo a index.html del juego
const VISITOR_KEY = "edinun_visitors_v1"; // o la clave existente del repo — preservala
const VISITOR_SESSION_FLAG = "edinun_visit_counted_v1";

async function fetchVisitorCount(opts) {
  const inc = opts && opts.increment;
  const url = inc ? VISITOR_ENDPOINT + "?inc=1" : VISITOR_ENDPOINT;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("counter http " + res.status);
  const data = await res.json();
  if (typeof data.count !== "number") throw new Error("counter invalid payload");
  return data.count;
}

function readLocalVisitorCount() {
  const raw = localStorage.getItem(VISITOR_KEY);
  const v = raw ? parseInt(raw, 10) : 0;
  return isNaN(v) ? 0 : v;
}

function writeLocalVisitorCount(n) {
  localStorage.setItem(VISITOR_KEY, String(n));
}

function useVisitorCount() {
  const [n, setN] = useState(() => readLocalVisitorCount());

  useEffect(() => {
    let cancelled = false;
    fetchVisitorCount()
      .then((count) => {
        if (cancelled) return;
        setN(count);
        writeLocalVisitorCount(count);
      })
      .catch(() => { /* fallback localStorage ya cargado */ });

    function onUpdate(ev) {
      const value = ev && ev.detail && ev.detail.count;
      if (typeof value === "number") setN(value);
      else setN(readLocalVisitorCount());
    }
    window.addEventListener("edinun:visitors-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("edinun:visitors-updated", onUpdate);
    };
  }, []);

  return n;
}

function markFirstAttempt() {
  if (sessionStorage.getItem(VISITOR_SESSION_FLAG) === "1") return;
  sessionStorage.setItem(VISITOR_SESSION_FLAG, "1");

  fetchVisitorCount({ increment: true })
    .then((count) => {
      writeLocalVisitorCount(count);
      window.dispatchEvent(new CustomEvent("edinun:visitors-updated", { detail: { count } }));
    })
    .catch(() => {
      const next = readLocalVisitorCount() + 1;
      writeLocalVisitorCount(next);
      window.dispatchEvent(new CustomEvent("edinun:visitors-updated", { detail: { count: next } }));
    });
}
```

**Reglas de adaptación:**

- **Preservá las firmas exportadas.** Si el código existente exporta
  `useVisitorCount` y `markFirstAttempt`, mantené esos nombres. Si usa
  otros (`getVisitorCount`, `bumpVisitors`, etc.), renombrá las funciones
  nuevas para que coincidan — los call-sites no deberían tocarse.
- **Preservá las claves de `localStorage` y `sessionStorage`** si el
  repo ya tiene datos en producción que no querés invalidar. Si las
  claves son distintas a las de arriba, ajustá las constantes.
- **Idempotencia por pestaña** debe quedar igual: el incremento se
  dispara solo una vez por sesión, idealmente en el primer intento real
  del juego (no en `useEffect` de la pantalla Home — eso contaría
  "visitas" de gente que solo abrió el link sin jugar).
- **Si el repo no usa React:** la lógica es idéntica — un fetch al
  montar para leer el valor inicial, y un fetch al primer intento del
  juego con `?inc=1`. Adaptá a `addEventListener('DOMContentLoaded')` /
  `onMounted` / lo que use el framework.

## Paso 4 — Re-empaquetar / build

Si el repo tiene un bundler (`bundle.py`, `bundle.ps1`, `vite build`,
`webpack`, etc.), corré el comando equivalente sobre cada juego
modificado. Verificá que los HTML quedan consistentes.

## Paso 5 — Verificar localmente

Por cada juego modificado (al menos uno como muestra):

```powershell
Set-Location <ruta-del-juego>
php -S localhost:8000
```

Abrí `http://localhost:8000/` en Chrome y Firefox.

- En la pantalla Home, el contador debe leer el valor actual del
  servidor (puede ser 0 al principio).
- Tras llegar al primer intento real del juego, el contador debe
  incrementarse en 1, **y el mismo número** debe aparecer en el otro
  navegador tras recargar.
- En F12 → Network: el request a `counter.php` devuelve
  `Content-Type: application/json` y un body `{"count": N}`.

Si todo funciona localmente, el rollout a edinun.com es subir los
archivos modificados (cada `counter.php` + los HTML re-empaquetados).
Verificar permisos: si Apache devuelve 500 al hacer `?inc=1`, falta
permiso de escritura en la carpeta del juego.

## Paso 6 — Actualizar la skill del repo (si existe)

Si el repo tiene `.claude/skills/<nombre>/` con un template-juego:

1. Agregá `counter.php` al template (mismo archivo, idéntico).
2. Modificá el `screens.jsx` / `app.js` / archivo equivalente del
   template para usar el patrón nuevo.
3. Si el template tiene HTML empaquetados, re-empaquetá.
4. Si la skill tiene `references/invariants.md` o equivalente, agregá
   una sección breve documentando que el contador es server-side (PHP
   + flock + `counts/visits.txt`) con fallback localStorage.
5. Si el template tiene un `CLAUDE.md.template`, agregá una sección
   "Contador de visitas (server-side con fallback)" que describa el
   patrón, cómo probar local con `php -S`, y la nota sobre permisos en
   edinun.com.

## Paso 7 — `.gitignore`

Agregá `counts/` (y/o el path equivalente donde se guarde `visits.txt`)
al `.gitignore` raíz del repo. Es estado de producción, no código —
nunca se commitea.

## Paso 8 — Commit

Cuando todo esté verde, **un solo commit**:

```
feat(contador): contador de visitas global server-side (PHP) con fallback localStorage

- counter.php en cada juego (Apache+PHP, atómico con flock)
- Cliente JS: fetch al endpoint con fallback localStorage si PHP no responde
- counts/visits.txt gitignoreado
- Skill / template actualizados (si aplica) para juegos futuros

Solución portada desde el repo edinun-games (JUEGO-5).
Probado local con `php -S localhost:8000`.
```

No hagas push. El usuario decide cuándo.

## Notas finales

- **No cambies la temática ni la lógica de los juegos.** Este prompt
  solo toca el contador.
- **No cambies la pantalla Home** ni dónde se renderiza el número —
  reemplaza solo las funciones internas. Las llamadas a
  `useVisitorCount()` y `markFirstAttempt()` desde Home / GameScreen no
  deberían moverse.
- **Si encontrás más de una clave de localStorage** relacionada con
  contadores (e.g. `games_completed_v1`, `streak_v1`), **dejá las otras
  como están**. Solo el contador de **visitas** es global; los
  contadores per-usuario (partidas completadas, racha, etc.) son
  legítimamente `localStorage`.
- **Si el repo no tiene PHP soportado en producción**, parar y
  reportarlo al usuario antes de hacer el rollout — el patrón depende
  de que el servidor de producción ejecute PHP.
