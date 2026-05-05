# MEMORY.md — Bitácora del juego "Fracciones"

Bitácora de decisiones del juego `juegos/fracciones/` dentro del repo
multi-juego `edinun-games`. Las decisiones del shell compartido
(DeviceStage, pinch-zoom, modales, scoring, ResultsScreen) viven en
los CLAUDE.md de los demás juegos y en la skill — acá solo lo
específico de este juego.

## 2026-05-05 · Setup inicial del juego

Decisiones tomadas con el usuario antes de implementar:

### Audiencia: 9-12 años (excepción)

El default del repo es 6-8 años (lo dice `USER.md` y todos los demás
juegos). Para `fracciones` el usuario pidió explícitamente
**audiencia 9-12 años**. Esto se traduce en:

- Denominadores hasta 10 en `frac1`, hasta 12 en `frac2`.
- `frac3` incluye centésimas (slots de 2 dígitos), no solo décimas.
- Copy menos infantilizado: "Amplifica la fracción" en vez de
  "Iguala las pizzas". El bocadillo del personaje sigue
  imperativo simple ("Tocá las porciones para representarla")
  porque la pista de mecánica no necesita vocabulario técnico.

Si en el futuro se crean más juegos para 9-12 conviene mover este
patrón al USER.md (o crear una variante). Por ahora, **excepción
documentada para `fracciones` solamente**.

### Mecánicas por nivel

| Nivel       | Categoría | Mecánica                                       |
| ----------- | --------- | ---------------------------------------------- |
| basic       | `frac1`   | Pinta porciones de una pizza (tap)             |
| medium      | `frac2`   | Dos pizzas + slot del numerador equivalente    |
| advanced    | `frac3`   | Barra/cuadrícula + slots fracción y decimal    |

- `frac1` valida por **cantidad** de porciones pintadas, no por
  posición. Pintar 3 porciones cualquiera de 8 cuenta como 3/8.
  Pedagógicamente correcto y más permisivo.
- `frac2` la pizza B muestra autopinta visual del valor que el
  estudiante va escribiendo (feedback inmediato). Si más adelante
  se quiere rigor sin pista, sacar la propiedad `painted` del
  segundo `Pizza` y dejarla en 0.
- `frac3` usa una mezcla por ronda: 1/3 décimas (1 dígito por
  slot), 2/3 centésimas (2 dígitos por slot). N evita ser múltiplo
  de 10 en centésimas para que la décima no sea trivial.

### Personaje destacado en el landing

**Pita** (la geómetra). Las porciones de pizza y la cuadrícula 10×10
son representaciones espaciales/geométricas, alinea con su rol.

### Glifos del fondo

Cosmic (15): `½ ⅓ ¼ ⅔ ¾ ⅖ ⅛ / = ÷ % 0,5 0,25 0,75 ≡`
Chalkboard (10): `½ ⅓ ¼ / = 0,5 0,75 0,3 ÷ ?`

## Anti-patrones a evitar

- **No** mostrar fracciones impropias (numerador ≥ denominador).
  Mantenemos solo propias para evitar mezcla de conceptos.
- **No** validar por posición de las porciones pintadas en `frac1`
  — la fracción es cantidad de partes iguales, no qué partes
  específicas.
- **No** romper el contrato de `lastResult.log` que consume
  `ResultsScreen`. Si una mecánica nueva no tiene `a/b/op`
  numéricos naturales, codificar como string descriptivo (lo
  hacemos para `frac2` y `frac3`).
- **No** modificar `ResultsScreen`, `PrintableReport`, los modales
  de salir/cambio de nivel ni el HUD superior — son shell
  compartido y propagan a todos los juegos.
