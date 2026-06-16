# Cómo subir el juego a la página (guía fácil)

Esta guía es para quien sube los juegos a la página web. Está escrita
en palabras simples. No necesitás saber de programación.

Cada juego tiene un **contador de visitas** (el numerito de personas
que aparece en la pantalla del juego). Esta guía explica cómo dejarlo
funcionando.

---

## Paso 1 — Antes de subir, borrá un archivo si lo ves

Dentro de la carpeta del juego, fijate si hay un archivo llamado
**`visits.txt`** (o una carpeta vieja llamada **`counts`**).

- Si **está** → borralo antes de subir.
- Si **no está** → perfecto, no hagas nada.

(Ese archivo solo guarda números de prueba. Si lo subís, el contador
arranca con un número falso. No rompe nada, pero queda feo.)

---

## Paso 2 — Subí la carpeta del juego

Subí la carpeta completa del juego a la página, como subís cualquier
otro archivo (por FileZilla, por el panel del hosting, etc.).

---

## Paso 3 — Probá si el contador funciona

1. Abrí el juego en el navegador (Chrome, por ejemplo).
2. Empezá a jugar y respondé el **primer ejercicio**.
3. Mirá el **numerito de visitas** en la pantalla del juego.

Para asegurarte de que cuenta a **todos** (y no a cada uno por
separado), abrí el juego en **dos computadoras o dos celulares
distintos**. Si en los dos aparece el **mismo número** y sube cuando
alguien juega → **está perfecto, ya funciona.** Terminaste.

Si cada dispositivo muestra un número diferente → el contador está
funcionando en "modo simple" (cuenta por separado en cada uno). El
juego anda igual, pero si querés el contador global, seguí al Paso 4.

---

## Paso 4 — Si el contador no cuenta a todos (arreglar permisos)

Esto pasa cuando la página **no tiene permiso para guardar** dentro de
la carpeta del juego. Se arregla cambiando un permiso. Elegí la opción
que te quede más cómoda:

### Opción A — Desde el panel del hosting (lo más común)

1. Entrá al panel de tu página (cPanel, Plesk, o como se llame).
2. Buscá **"Administrador de archivos"** o **"File Manager"**.
3. Entrá hasta la carpeta del juego.
4. Hacé **clic derecho** sobre la carpeta del juego → **"Permisos"**.
5. Escribí el número **755** y guardá.
6. **No** marques la casilla de "aplicar a todo lo de adentro" —
   solo la carpeta del juego.
7. Probá el juego de nuevo (Paso 3).

¿Sigue sin contar a todos? Repetí lo mismo pero con **775** en vez
de 755.

### Opción B — Desde FileZilla (u otro programa de subir archivos)

1. Conectate al servidor.
2. Entrá hasta la carpeta del juego.
3. **Clic derecho** sobre la carpeta → **"Permisos del archivo"**.
4. En el casillero del número escribí **755** (o **775** si 755 no
   alcanza).
5. **No** marques "aplicar a las subcarpetas".
6. Aceptá y probá el juego.

---

## Si después de todo no funciona

No pasa nada grave:

- **El juego se puede jugar igual.** Lo único que cambia es que el
  contador cuenta por separado en cada computadora, en lugar de sumar
  a todos. Nada más se afecta.
- Si te interesa que lo revisemos, mandanos al equipo:
  - El nombre de tu hosting (Hostinger, GoDaddy, Bluehost, etc.).
  - Una foto de la pantalla del juego con el contador.

Con eso vemos si vale la pena seguir intentándolo.

---

## En resumen

```
1. ¿Hay carpeta "counts"?  → borrala
2. Subir la carpeta del juego
3. Jugar el primer ejercicio y mirar el contador
      ¿el numerito sube y es igual en dos dispositivos?
                 │
          SÍ ────┴──── NO
          ✓          cambiar permisos
        listo        de la carpeta a 755
                     (o 775)
```
