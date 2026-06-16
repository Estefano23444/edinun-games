# Guía para subir los juegos al servidor edinun.com

Esta guía es para la **persona que sube los juegos** al servidor. Cubre
qué hacer si el contador de visitas no funciona después de subir.

## Resumen rápido

Cada juego trae un archivo `counter.php` que cuenta las visitas reales
(no por navegador, sino globales). Para que funcione, **el servidor
necesita poder escribir** dentro de la carpeta del juego — eso es lo
que esta guía explica.

## Antes de subir

Borrá el archivo `visits.txt` si existe dentro del juego (es estado de
pruebas local, no debe ir al servidor):

- Por FTP / cliente: borrá `visits.txt` dentro de `JUEGO-X-…/` antes de
  subir (y la carpeta vieja `counts/` si quedó de versiones anteriores).
- Por línea de comandos en tu computadora:
  ```bash
  rm -f juegos/JUEGO-5-coordenadas-rectangulares/visits.txt
  ```

Si se sube por error, el contador del servidor empieza con el número
que estaba en tu prueba local — no rompe nada, pero queda inflado.

## Cómo saber si funciona

Después de subir, abrí el juego en el navegador (Chrome o el que uses):

1. Andá hasta el primer intento real del juego (no solo la pantalla de
   inicio — hay que tocar la primera respuesta).
2. Presioná **F12** → pestaña **Network** → recargá la página.
3. Buscá en la lista una llamada a `counter.php`.

**Estados posibles:**

| Status | Significa | Qué hacer |
|--------|-----------|-----------|
| **200** + body `{"count": N}` | Todo bien | Nada, está funcionando |
| **500** + body `{"error": "cannot open counter file"}` | Falta permiso de escritura | Ver "Arreglar permisos" abajo |
| **200** + body que empieza con `<?php` | El servidor no ejecuta PHP | Avisar al admin del hosting |
| **404** | Falta el archivo | Volver a subir `counter.php` |

También podés probar abriendo directo en el navegador:

```
https://www.edinun.com/juegos/.../JUEGO-X-…/counter.php
```

Debe mostrar `{"count":0}` o el número actual. Si muestra el código
fuente del archivo, PHP no está activo en el servidor.

## Arreglar permisos (si devuelve 500)

PHP necesita poder escribir el archivo `visits.txt` dentro de la carpeta
del juego. Esto es un permiso del sistema de archivos del servidor.

> Nota: la versión nueva del contador escribe `visits.txt` **directamente
> en la carpeta del juego** (ya no crea una subcarpeta `counts/`). Por eso
> alcanza con dar permiso de escritura a la carpeta del juego.

### Opción 1 — cPanel / Administrador de archivos (lo más común)

1. Entrá al panel del hosting (cPanel, Plesk, DirectAdmin, etc.).
2. Abrí "Administrador de archivos" / "File Manager".
3. Navegá hasta la carpeta del juego (ej. `juegos/.../JUEGO-5-coordenadas-rectangulares/`).
4. Click derecho sobre la carpeta → "Permisos" o "Change permissions".
5. Poné el valor **755** (Lectura/Escritura/Ejecución para el dueño;
   Lectura/Ejecución para grupo y público).
6. Si hay una casilla "Aplicar recursivamente a archivos y carpetas",
   **NO la marques** — solo la carpeta del juego.
7. Probá el juego de nuevo.

Si sigue dando 500, repetí los pasos pero con **775** en vez de 755.

### Opción 2 — Cliente FTP (FileZilla, WinSCP, etc.)

1. Conectate al servidor.
2. Navegá hasta la carpeta del juego.
3. Click derecho sobre la carpeta → "Permisos del archivo" /
   "File permissions".
4. En "Valor numérico" poné **755** (o **775** si 755 no alcanza).
5. **NO marques** "Recurrir a subdirectorios".
6. OK → probá el juego.

### Opción 3 — Crear el archivo a mano (si las opciones 1 y 2 no
funcionan)

Si el panel del hosting no deja cambiar permisos de la carpeta:

1. Dentro de la carpeta del juego en el servidor, creá un archivo nuevo
   llamado `visits.txt` con contenido `0` (solo el número cero).
2. Cambiá los permisos de `visits.txt` a **666** (Lectura/Escritura
   para todos).
3. Probá el juego.

Así PHP solo necesita escribir en un archivo que ya existe (no crear
nada nuevo), que funciona incluso en hostings muy restrictivos.

## Qué hacer si nada de lo anterior funciona

Si después de probar las 3 opciones el contador sigue sin funcionar:

- **El juego sigue siendo jugable** — el contador cae automáticamente a
  un modo local (cada navegador cuenta lo suyo, igual que antes). El
  resto del juego no se afecta en nada.
- Avisale al equipo de desarrollo con esta info:
  - Captura de pantalla del F12 → Network → respuesta de `counter.php`.
  - Nombre del hosting (Hostinger, Bluehost, GoDaddy, etc.) y plan
    contratado.
  - Si en el panel hay opción "PHP version" — qué versión está
    seleccionada.

Con esa info se puede definir si vale la pena escalarlo con soporte
del hosting o cambiar a otro método de contador.

## Resumen visual

```
Subir carpeta del juego al servidor
         ↓
   F12 → Network → counter.php
         ↓
   ┌─────┴─────┐
   │           │
  200         500
{"count":N}  {"error":...}
   │           │
   ✓        cambiar permisos
            de la carpeta a 755
            (o 775, o método 3)
```
