# Diagnóstico — JUEGO 5 y su contador no funcionan en edinun.com

## ✅ CAUSA CONFIRMADA (2026-06-16) y solución

Los datos del navegador (Console + Network) lo dejaron claro:

- **El iframe y la ruta están BIEN** (`src="JUEGO-5-coordenadas-rectangulares/index.html"`, carga 200).
- **El `index.html` que está en el servidor es una versión VIEJA/equivocada**:
  carga `app.jsx` como archivo aparte (visible en Network como XHR) y **no**
  carga `screens.jsx`. Por eso aparecen en Console:
  - `Identifier 'useStateA' has already been declared` (app.jsx se declara 2 veces),
  - `ReferenceError: CosmosBg is not defined` (screens.jsx nunca se cargó) → juego en blanco.
- El `index.html` correcto del repo es **autocontenido**: trae todo el código
  adentro (1 solo bloque `<script type="text/babel">`, sin `src="*.jsx"`).
  Ninguna versión del repo usó jamás `.jsx` externos → el archivo del servidor
  no salió de este repo (probable export viejo de prototipo).

**Solución (sobreescribir en `.../numerosNaturales/JUEGO-5-coordenadas-rectangulares/`):**

1. Reemplazar `index.html` por `juegos/JUEGO-5-coordenadas-rectangulares/index.html`
   del repo (~108 KB, **sin** `src="app.jsx"`).
2. Subir el `counter.php` actualizado (endurecido) a esa misma carpeta.
3. Tener juntos en la carpeta: `index.html`, `assets/`, `counter.php`, `styles.css`.
4. Borrar los `.jsx` sueltos del servidor (el `index.html` correcto no los usa;
   el `app.jsx` suelto era justo lo que rompía).
5. **Ctrl + Shift + R** en el navegador (había todo en "disk cache").

**Verificación:** tras la recarga forzada, en Network **no debe aparecer `app.jsx`**
y en Console no deben salir los errores de `CosmosBg` / `useStateA`.

> El resto de esta guía es el procedimiento general de diagnóstico (sirve para
> futuras subidas). Ya no es necesario si aplicaste la solución de arriba.

---

Esta guía localiza **por qué el juego sale en blanco y por qué el contador
no cuenta**, en unos minutos, desde tu navegador. (Desde acá no podemos
abrir edinun.com: el servidor bloquea conexiones que no sean de un navegador
normal, así que necesitamos que corras estos pasos vos.)

El juego se ve así en el servidor: una página **envoltorio**
(`planoCartesianoArrastrarLetras.html`) que mete el juego adentro de un
`<iframe>`. Eso quiere decir que el juego vive en **una subcarpeta** y se
carga "dentro de un cuadro" en la página. La mayoría de las fallas vienen de
esa estructura.

---

## Parte A — Abrir la consola (1 minuto)

1. Abrí en **Chrome**:
   `https://edinun.com/juegos/simpl/matematica/numerosNaturales/planoCartesianoArrastrarLetras.html`
2. Apretá **F12** → pestaña **Console** (Consola).
3. Recargá la página (**F5**).
4. **Mirá si hay texto en rojo.** Copiá lo que diga. Los mensajes clave:

| Mensaje en rojo (aprox.) | Qué significa | Causa |
|---|---|---|
| `Refused to display ... in a frame because it set 'X-Frame-Options'` | El servidor prohíbe mostrar el juego dentro de un cuadro | **Header X-Frame-Options** |
| `Refused to frame ... 'frame-ancestors'` | Igual que el anterior, otra variante | **CSP frame-ancestors** |
| `GET https://.../index.html 404` | El juego no está en la ruta que el cuadro busca | **Ruta del iframe / subida** |
| `GET https://.../assets/... 404` | Faltan las imágenes (logo / personajes) | **No se subió `assets/`** |
| `Mixed Content: ... insecure ...` | El cuadro apunta a `http://` en una página `https://` | **iframe con http** |
| `net::ERR ... unpkg.com` | No cargan React/Babel desde internet | CDN bloqueado / sin internet |

> Si **no hay nada en rojo** pero igual sale en blanco, seguí a la Parte B.

---

## Parte B — Pestaña Network (2 minutos)

1. Con F12 abierto, andá a la pestaña **Network** (Red).
2. Recargá (**F5**). Vas a ver una lista de archivos. Revisá el **Status**
   (la columna del número) de estos:

   - **`index.html` del juego** (el que carga el cuadro) → debe ser **200**.
     Si es **404**, el juego no está donde el envoltorio lo busca.
   - **`react...js`, `babel...js`** (de `unpkg.com`) → deben ser **200**.
   - **`edinun-logo.png` y `char-...png`** (en `assets/`) → deben ser **200**.
     Si son **404**, no subiste la carpeta `assets/` junto al juego.
   - **`counter.php`** → buscalo en la lista. Hacele clic → pestaña
     **Response** (Respuesta) y mirá qué devuelve:

     | Lo que muestra | Significa | Qué hacer |
     |---|---|---|
     | `{"count":0}` o un número | ✅ funciona | Nada |
     | empieza con `<?php` | El servidor **no ejecuta PHP** en esa carpeta | Avisar al hosting (activar PHP) |
     | **404** | `counter.php` no está en la carpeta del juego | Subir `counter.php` a la subcarpeta del juego |
     | **500** | PHP no puede escribir el archivo | Permisos (ver más abajo) |

---

## Parte C — Las 3 pruebas directas (lo más útil)

Estas URLs nos dicen exactamente qué está mal. Necesitás saber **la
subcarpeta** donde subiste el juego. Para encontrarla:

- En la página del envoltorio, **clic derecho → "Ver código fuente"**
  (View source) y buscá la palabra `iframe`. La parte `src="..."` es la
  ruta de la subcarpeta. Ejemplo: `src="JUEGO-5-coordenadas-rectangulares/index.html"`.

Con esa subcarpeta, pegá en el navegador (reemplazá `SUBCARPETA`):

1. **El juego solo, sin el cuadro:**
   `https://edinun.com/juegos/simpl/matematica/numerosNaturales/SUBCARPETA/index.html`
   - ✅ Si **el juego carga acá** pero **no** en el envoltorio → el problema
     es el **iframe/headers** (Parte A: X-Frame-Options o CSP, o el `src`
     del iframe está mal escrito).
   - ❌ Si **tampoco carga acá** → el problema es **dónde subiste el juego**
     (faltan archivos o ruta equivocada).

2. **El contador directo:**
   `https://edinun.com/juegos/simpl/matematica/numerosNaturales/SUBCARPETA/counter.php`
   - Debe mostrar `{"count":0}` o un número.
   - Si muestra el código `<?php ...` → PHP apagado en el servidor.
   - Si da 404 → `counter.php` no está en esa subcarpeta.

3. **Una imagen del juego:**
   `https://edinun.com/juegos/simpl/matematica/numerosNaturales/SUBCARPETA/assets/edinun-logo.png`
   - Debe mostrar el logo. Si da 404 → no subiste la carpeta `assets/`.

---

## Qué necesito de vos para cerrarlo

Mandame (captura o texto):

1. El texto en **rojo** de la Console (Parte A), si hay.
2. El **src del iframe** (Parte C, "Ver código fuente").
3. El resultado de las **3 pruebas directas** (Parte C): qué pasó en cada una.
4. La respuesta de **counter.php** (Parte B).

Con eso te digo el arreglo exacto. Las causas más probables, en orden:

1. **El juego no está completo en su subcarpeta** — hay que subir la
   **carpeta entera** del juego (con `index.html`, `assets/` y `counter.php`
   adentro), no solo un archivo suelto.
2. **El `src` del iframe del envoltorio no apunta a esa subcarpeta.**
3. **El servidor bloquea mostrar el juego en un cuadro** (X-Frame-Options /
   CSP) — se arregla con una línea en `.htaccess`.

---

## Sobre el contador (ya lo dejé más robusto)

Actualicé `counter.php` para que funcione igual que el contador que ya te
sirve en el otro juego: ahora **guarda el conteo en un archivo `visits.txt`
en la misma carpeta del juego** (antes intentaba crear una subcarpeta
`counts/`, y varios servidores no dejan crear subcarpetas aunque sí dejen
escribir archivos — eso tumbaba el contador).

- **Antes de subir, borrá `visits.txt`** si existe en la carpeta del juego
  (es un número de prueba local).
- Si el contador da **500**, el servidor no puede escribir en la carpeta:
  cambiá los permisos de la **carpeta del juego** a **755** (o **775**),
  como explica `SUBIR-A-SERVIDOR.md`. Si aun así falla, creá a mano un
  archivo `visits.txt` con el número `0` adentro y permisos **666**.
