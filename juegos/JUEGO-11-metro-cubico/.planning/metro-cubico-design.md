# Metro cúbico — diseño

## Tema

Múltiplos y submúltiplos del metro cúbico. Audiencia 10 años.

Diferencia clave con medidas lineales/masa: el factor entre unidades
adyacentes en volumen es **×1000**, no ×10. Pedagogía: el chico debe
internalizar que para volumen "se mueven 3 ceros por escalón".

## Niveles

**1 nivel, 3 rondas con mecánicas escalonadas por operación.**

## Mecánica

Mecánica única: ecuación de conversión + numpad. Sin alternativas
visuales por ronda — la complejidad escala por el tipo de operación.

Escala: `km³ · hm³ · dam³ · m³ · dm³ · cm³ · mm³` (7 unidades).

| idx | Tema | Mecánica | Ejemplo |
| --- | ---- | -------- | ------- |
| 0 | Multiplicar (mayor → menor) | Numpad. Sortea par + valor 1-99 (1-9 si saltos 3). | `3 m³ = ___ dm³` → 3000 |
| 1 | Dividir (menor → mayor) | Numpad. Sortea par + answer 1-3 dígitos, calcula `fromValue = answer × factor`. | `5.000.000 mm³ = ___ dm³` → 5 |
| 2 | Litros (1:1) | Numpad. Sortea entre `dm³ ↔ L` y `cm³ ↔ mL` + dirección. Valor 1-999. | `5 dm³ = ___ L` → 5 |

### Restricciones

- **Tope 10 cifras** (≤ 9.999.999.999). Habilita saltos hasta 3 (10⁹).
  Saltos > 3 quedan fuera (10¹² ya supera 10 cifras incluso con valor 1).
- **Solo respuestas enteras.** En R2 el `fromValue = answer × factor`
  garantiza que la división dé entero. En R1 también es entero por
  construcción. R3 es 1:1.
- **Una respuesta = se acaba el ejercicio.** Sin "vuelve a intentar".
- **Sin leading zeros** en el numpad (no se acepta `0` en el primer slot).

### Guía visual

- Rondas 1, 2: tabla de unidades horizontal (`km³ | hm³ | dam³ | m³ | dm³ | cm³ | mm³`)
  con el mismo estilo de "tabla del libro" usado en `medidas-de-masa`.
- Ronda 3: píldora con las **dos** equivalencias visibles:
  ```
  1 dm³ = 1 L     1 mL = 1 cm³
  ```

## Glifos del fondo

- **Cosmic (15)**: `m³ dm³ cm³ km³ hm³ dam³ mm³ L mL × ÷ 1000 = 1 ?`
- **Chalkboard (10)**: `m³ dm³ L = × ÷ cm³ 1000 mL ?`

## Copy específico

- **Slug**: `metro-cubico`
- **Personaje destacado en landing**: Nova (`charId: "fisica"`).
- **HomeScreen hero**: `EDINUN · Metro cúbico`
- **Descripción Home**: `Múltiplos y submúltiplos del m³.`
- **catLabel HUD / reporte**: `Metro cúbico`
- **Bocadillo del personaje**: `Multiplica y divide por 1.000.`
- **Instrucción central**:
  - idx 0, 1 → `Convierte la unidad`
  - idx 2 → `Convierte con litros`

## Adaptación del log

| Campo | Valor |
| ----- | ----- |
| `a` | Lado izquierdo (`"5 m³"`) |
| `b` | Unidad destino (`"dm³"`) |
| `op` | `"="` |
| `correctAnswer` | Valor numérico correcto (`"5000"`) |
| `userAnswer` | Lo que escribió el chico |

`ResultsScreen` muestra columnas: "Conversión", "=", "Unidad destino",
"Respuesta del estudiante", "Respuesta correcta", "Estado", "Tiempo".

## Decisiones abiertas / riesgos

- **Slot count alto en R1**: con saltos 3 + valor 9, la respuesta es
  9.000.000.000 (10 dígitos). El layout debe acomodar 10 slots cómodos.
  El array `slotSize` se redujo hasta 22px en el extremo.
- **Tile width en R2**: `fromValue` también puede llegar a 10 dígitos.
  Acomodado con tabla `valueTileWidth` extendida a 216px.
- **R3 trivial pedagógicamente**: como es 1:1, la única exigencia es
  reconocer la equivalencia. Si el usuario quiere algo más calcuado,
  habría que reemplazar R3 por otra mecánica (no permitido por el
  alcance que dio).
