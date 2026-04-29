# MEMORY.md — Valor posicional

Bitácora de este juego concreto. Para la historia del shell común
(pinch-zoom, DeviceStage, contadores, decisiones de marca) ver
`MEMORY.md` del juego `juegos/operaciones-basicas/`, que es el original
y arrastra todo ese contexto.

## Origen

Segundo juego del repo `edinun-games`, creado tras migrar el monolito
original a `juegos/operaciones-basicas/`. Hereda intacto el shell
(`app.jsx`, `characters.jsx`, `logo.jsx`, `styles.css`) y solo aporta
mecánica nueva en `screens.jsx` (HomeScreen, CosmosBg, mapeo
level→catLabel) y `game-screens.jsx` (makeProblem, GameScreen, helpers
de formato).

## Tema y niveles (validados con el usuario)

| Nivel    | Rango                    | catId | Modo visual            |
|----------|--------------------------|-------|------------------------|
| basic    | 11–40                    | vp40  | Bloques de Dienes      |
| medium   | 11–60                    | vp60  | Bloques de Dienes      |
| advanced | 8 o 9 cifras (aleatorio) | vp9   | Slots posicionales 9   |

Etiquetas literales en HomeScreen: **"Números hasta el 40"**,
**"Números hasta el 60"**, **"9 cifras"** (sin "BÁSICO/MEDIO/AVANZADO"
como label, eso solo se conserva en los tabs del HUD del juego porque
los colores son la pista visual).

## Decisión clave: dos modos visuales según rango

Bloques de Dienes son intuitivos para 11–60 pero absurdos para 9 cifras
(no caben 9 millones de cubitos en pantalla). Slots posicionales con
cartel narrado son perfectos para números grandes pero mecánicamente
sobrados para "armar 27". Por eso `GameScreen` mira `problem.mode` y
renderiza una zona central distinta.

Lo que es **compartido** entre los dos modos: HUD superior (logo +
tabs + cronómetro + estrellas), bocadillo del personaje, personaje en
esquina, racha, modales (salir + cambio de nivel), feedback overlay,
contrato `lastResult` y la fórmula de estrellas decreciente con tiempo.

## Notación pedagógica (corregido por el usuario)

- Centenas / decenas / unidades de millón se escriben **`CMi DMi UMi`**
  (no `CMM DMM UMM`).
- Separador de millares: **espacio** (`123 456 789`), no punto.
- En el reporte académico la operación se imprime como
  `Armar 12 345 678` (no `12345678 VP 8`) gracias a `formatOp` y
  `fmtAnswer`.

## Archivos editados respecto al template

- `screens.jsx` — `CosmosBg` (glifos cosmic + chalkboard adaptados a
  VP), `HomeScreen` (hero, etiquetas y descripciones de niveles),
  `CharacterScreen.choose()` (mapeo level→vp40/vp60/vp9).
- `game-screens.jsx` — `makeProblem` reescrito para vp40/vp60/vp9;
  `numberToSpanish`, `fmtThousands`, `fmtAnswer`, `formatOp`,
  `levelToCat` añadidos; `DienesBar`/`DienesCube` añadidos;
  `GameScreen` reescrito con dos modos (state Dienes vs state
  Dígitos, dos paneles centrales condicionales, dos bandejas
  inferiores condicionales, botón BORRAR/QUITAR ÚLTIMO dinámico);
  tabla de resultados usa `fmtAnswer` para mostrar números grandes
  con espacios.
- `app.jsx`, `characters.jsx`, `logo.jsx`, `styles.css`,
  `assets/*` — **no tocados** (shell heredado).

## Bundle

El juego no usa `python .planning/bundle.py` directamente porque el
entorno del autor no tiene Python instalado (solo stubs del Microsoft
Store). El re-empaquetado se hace con un equivalente PowerShell que
implementa la misma lógica (concatenar los 5 `.jsx` y reemplazar el
bloque `<script type="text/babel">` en ambos HTML). Si en el futuro se
instala Python, `bundle.py` sigue funcionando idéntico — la carpeta
`.planning/` con el script Python original se mantiene.

## Estado actual

Juego funcional con los 3 niveles. Falta QA responsive en los 6
viewports canónicos (`USER.md`). Aún no se ha probado en iPhone real
con la mecánica nueva — confirmar que el feedback visual de los
contenedores Dienes y el cartel del modo dígitos no se rompen al
escalar a `375×667` letterboxed.
