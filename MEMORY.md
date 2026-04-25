# MEMORY.md — EDINUN GAMES

Bitácora del proyecto: qué se ha hecho, decisiones tomadas, estado actual.

## Origen

Handoff bundle de Claude Design (claude.ai/design). Prototipo HTML/JSX que se llevó a producción manteniendo HTML estático sin build (servido por GitHub Pages).

## Stack y deploy

- **Frontend:** React 18 + Babel Standalone cargados desde unpkg (CDN). Todo el JSX vive inline en `index.html` / `EDINUN GAMES.html` dentro de un único `<script type="text/babel" data-presets="react">`.
- **Sin build, sin package manager, sin tests.** Doble clic en `index.html` funciona local (`file://`).
- **Repo:** https://github.com/Estefano23444/edinun-games (público).
- **URL live:** https://estefano23444.github.io/edinun-games/ (GitHub Pages, branch `main`, path `/`).
- **Workflow editar:** modificar `.jsx` fuente → re-empaquetar al HTML (ver `CLAUDE.md`) → commit → push → Pages redespliega.

## Identidad de producto

- Nombre: **EDINUN GAMES** (no "EDINUN Conecta" — renombrado).
- Logo: `assets/edinun-logo.png` dorado oficial. Se usa como `EdinunLogo` (grande, con glow) y `EdinunLogoMini` (HUD). Sin reconstrucción SVG.
- Paleta cósmica + dorado EDINUN definida en `styles.css` con variables `--ed-*`.

## Flujo de la app

`Home` (nombre + nivel) → `Personaje` (4 personajes) → `Juego` (3 rondas) → `Resultados` (con imprimir + reiniciar).

Sin pantalla de menú ni perfil — el nivel elegido en Home determina la operación:
- `basic` → suma o resta aleatoria
- `medium` → multiplicación
- `advanced` → división

## Decisiones clave de UX (validadas con el usuario)

- **Personajes** son tipo Mario Kart: solo profesión + vibe (Merlín mago, Nova física, Cifra numerólogo, Pita geómetra). **No** mencionar niveles, álgebra ni fracciones en sus descripciones.
- **Juego** tiene la **ecuación como protagonista** (no el personaje). Personaje queda pequeño en esquina inferior izquierda.
- **Resolución de cifras de derecha a izquierda** (U → D → C). Drag & drop de fichas a slots, con tap-to-place como fallback. Click en slot lleno → borra ese dígito.
- **3 rondas por sesión** (no 5).
- **Botones VERIFICAR y Borrar** en columna derecha del juego, sin botón de Pista.
- **Contador de visitantes** persistente en `localStorage` (`edinun_visitors_v1`), incrementa una vez por sesión vía `sessionStorage` guard.
- **Resultados:** botones de Imprimir reporte (CSS `@media print` recorta a `.ed-print-area`) y Reiniciar juego.
- **Glifos matemáticos del fondo** (x², π, ½, ∑, ∞, ÷, +, −, ×, =, △, %, números) más visibles y bien contrastados — opacidad 0.42, glow blanco+dorado.

## Decisiones técnicas de producción

- **`DeviceStage` adaptativo:** clasifica viewport en `desktop` / `tablet` / `mobile` por dimensiones (no UA). Sin marco de teléfono, sin notch.
- **Lienzo lógico fijo 900×540 paisaje** escalado con `transform: scale()` (estrategia *contain*). Las pantallas usan `position: absolute` con coordenadas pixel — el lienzo fijo preserva el layout.
- **Fondo cósmico al viewport completo** (rendered en `DeviceStage`, no en cada pantalla). Las pantallas son transparentes — ya no se renderiza `<CosmosBg/>` adentro. Esto evita que las "barras laterales" en aspect ratios distintos se vean negras: el cosmos se extiende edge-to-edge.
- **Glifos del fondo responsive** con `font-size: clamp(48px, 7vmin, 110px)` en `.ed-glyphs` + tamaños relativos `em` por glifo. Misma escala visual en cualquier dispositivo.
- **Variant del fondo por ruta:** `cosmic` por defecto, `chalkboard` (verde pizarra) para la pantalla de juego. App pasa la variant a `DeviceStage`.
- **Móvil portrait:** el lienzo paisaje queda letterboxed (pequeño). Aparece pildorita `↻ Gira tu dispositivo` no bloqueante. **El contenido nunca rota** — el usuario gira físicamente el teléfono.
- **`DebugNav`** del prototipo eliminado (era la barra `demo Inicio Personaje Juego Resultados`).
- **React `.production.min.js`** en vez de development.

## Limitaciones conocidas / pendientes

- Layouts internos siguen siendo pixel-positioned dentro del lienzo 900×540, así que la UI no se "estira" fluida en desktop — se escala uniforme. Refactor a layout fluido con `vw/vh`/grid es trabajo mayor pendiente si se quiere que botones/personajes crezcan más en pantallas grandes.
- Drag & drop HTML5 funciona con mouse; en móvil táctil el fallback es tap (toca dígito → llena siguiente slot vacío U→D→C).
- Sin backend: trazabilidad y progreso solo viven en `localStorage` del navegador del estudiante.
- `design-canvas.jsx` y carpeta `uploads/` son residuos del bundle original — están en `.gitignore`, no se publican.

## Archivos cargados en runtime

`index.html` (idéntico a `EDINUN GAMES.html`) + `styles.css` + `assets/edinun-logo.png`. Los `.jsx` son fuente editable que se re-empaqueta al HTML, no se cargan en runtime.
