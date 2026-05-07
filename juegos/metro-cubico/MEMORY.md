# MEMORY.md — Bitácora del juego "Metro cúbico"

Bitácora de decisiones del juego `juegos/metro-cubico/` dentro del
repo multi-juego `edinun-games`. Las decisiones del shell compartido
viven en los CLAUDE.md de los demás juegos — acá solo lo específico.

## 2026-05-07 · Setup inicial

### Audiencia: 10 años (excepción)

El default del repo es 6-8 años. Para `metro-cubico` el usuario pidió
**audiencia 10 años**. A esta edad ya:
- Manejan multiplicación y división por potencias de 10/100/1000.
- Conocen la magnitud de millones y miles de millones.
- Conocen 2 equivalencias de litros (las que se enseñan en el currículo):
  - `1 dm³ = 1 L`
  - `1 mL = 1 cm³`

### Escala completa con factor ×1000

Diferencia clave con `medidas-de-masa` (mismo formato pero factor ×10):
en volumen el factor entre adyacentes es **×1000**. Esto es la fuente
de confusión más común a esta edad — los chicos vienen de pensar ×10
para masa/longitud y de pronto ×1000 para volumen/capacidad.

Escala: `km³ · hm³ · dam³ · m³ · dm³ · cm³ · mm³` (7 unidades).

### Tope 10 cifras

El usuario expandió el tope desde el inicial de 7 cifras (sugerido por
la skill, herencia de `medidas-de-masa`) a **10 cifras (≤ 9.999.999.999)**
para que `km³ ↔ m³` (factor 10⁹) sea posible. Saltos mayores (10¹², 10¹⁵)
quedan fuera porque ya superan 10 cifras incluso con `fromValue=1`.

### Caps de fromValue por saltos

Para mantener `answer ≤ 10 cifras`:
- Saltos 1 (×1.000): `fromValue` 1-99 → answer máx 99.000 (5 cifras)
- Saltos 2 (×1.000.000): `fromValue` 1-99 → answer máx 99.000.000 (8 cifras)
- Saltos 3 (×1.000.000.000): `fromValue` 1-9 → answer máx 9.000.000.000 (10 cifras)

### 3 rondas escalonadas por operación

| idx | Tema | Operación | Ejemplo |
| --- | ---- | --------- | ------- |
| 0   | Multiplicar | mayor → menor (×1000^N) | `3 m³ = 3000 dm³` |
| 1   | Dividir | menor → mayor (÷1000^N) | `5.000.000 mm³ = 5 dm³` |
| 2   | Litros | 1:1 con dm³/L o cm³/mL | `5 dm³ = 5 L`, `12 cm³ = 12 mL` |

### Por qué solo 2 equivalencias en R3

El usuario aclaró explícitamente: a 10 años los chicos **solo** conocen
`1 dm³ = 1 L` y `1 mL = 1 cm³`. Otras derivaciones (`1 m³ = 1000 L`,
`1 L = 1000 cm³`) no están en el currículo a esta edad.

Por eso R3 es **conversión 1:1 estricta** entre los pares dados, con
el valor 1-999 para variar la cantidad de dígitos. La "habilidad" en
R3 es reconocer la equivalencia, no calcular.

### Píldora vs tabla

- Rondas 1, 2: tabla de unidades (km³ → mm³) en horizontal estilo libro.
- Ronda 3: píldora con ambas equivalencias visibles (`1 dm³ = 1 L · 1 mL = 1 cm³`).

### Personaje destacado: Nova

Nova (`charId: "fisica"`) por afinidad temática con magnitudes físicas
(volumen es magnitud física). Mismo charId que `medidas-de-masa`.

### Glifos del fondo

Cosmic (15): `m³ dm³ cm³ km³ hm³ dam³ mm³ L mL × ÷ 1000 = 1 ?`
Chalkboard (10): `m³ dm³ L = × ÷ cm³ 1000 mL ?`

## Anti-patrones a evitar

- **No** confundir factor ×1000 con ×10. La escala lineal y de masa
  usan ×10; volumen usa ×1000.
- **No** introducir más equivalencias de litros en R3 (ej. `1 m³ = 1000 L`)
  — el usuario fue explícito en que solo se conocen las 2 dadas.
- **No** permitir saltos > 3 — supera el tope de 10 cifras.
- **No** modificar `ResultsScreen`, `PrintableReport`, los modales
  ni el HUD core — son shell compartido.
- **No** cambiar la categoría a "metro-cubico" en `currentCategory`
  arbitrariamente — internamente usamos `"volumen"`.
