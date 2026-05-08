# Personajes EDINUN GAMES — Prompts originales

Prompts usados con **Nano Banana** (Google Gemini 2.5 Flash Image) para generar los 4 personajes oficiales del catálogo `CHARACTERS`.

> **Uso previsto**: referencia estática para recuperación (si se pierden los PNG) o como guía de estilo si en el futuro se necesita generar un quinto personaje manteniendo coherencia visual con el resto.
>
> **No regenerar los PNG existentes salvo emergencia.** Cualquier regeneración produce variaciones leves que rompen la consistencia entre juegos del repo. Si por alguna razón hay que regenerar, hacerlo para los 4 personajes a la vez (no solo uno) y propagar las copias nuevas a todos los `juegos/<slug>/assets/` con el flujo de "edición del shell" descrito en `repo-structure.md`.

## Reglas de estilo comunes

Estos parámetros son **invariantes** entre los 4 personajes y deben respetarse en cualquier regeneración o personaje nuevo:

- **Estilo**: 3D Pixar-style render.
- **Iluminación**: soft volumetric lighting.
- **Colores**: vibrant saturated colors.
- **Proporciones**: kawaii proportions, big round head, slightly chubby.
- **Encuadre**: full body visible and centered.
- **Sombra**: no floor shadow.
- **Fondo**: transparent PNG background, no border.
- **Texto**: no text on the character (excepto si el personaje incluye un elemento textual intencional, como la tarjeta "E=mc²" de Nova o el "π" de Pita).
- **Formato**: square 1024×1024 (luego se reescalan a 500×500 para el repo).
- **Audiencia**: kids ages 6–12.
- **Tono general**: amigable, accesible, no intimidante.

Una vez generados los 1024×1024, **redimensionar a 500×500** antes de incluirlos en el repo (los `assets/char-<id>.png` actuales son 500×500). Esto reduce el peso del juego significativamente sin perder nitidez perceptible.

## Catálogo de prompts

Los 4 personajes se identifican con estos `id` en el código (`characters.jsx`, función `makeCharacter`):

| id | Nombre | Archivo | Sparkle color (overlay SVG) |
|---|---|---|---|
| `mago` | Merlín | `char-mago.png` | `#fce9a8` (oro suave) |
| `fisica` | Nova | `char-fisica.png` | `#ff5fb3` (rosa) |
| `numero` | Cifra | `char-numero.png` | `#4fd8ff` (cyan) |
| `geo` | Pita | `char-geo.png` | `#7bf5c4` (mint) |

---

### 1. Merlín — `char-mago.png`

```
A friendly cute wizard character named Merlín for a children's math education app.
Chubby kindly old man with rosy cheeks, fluffy snow-white beard, closed
crescent-smiling eyes, wearing a tall pointed deep-purple wizard hat with golden
band and small yellow stars, a flowing dark-purple robe with golden belt, and
holding a wooden magic wand whose tip glows with a cyan orb emitting soft
sparkles. 3D Pixar-style render, soft volumetric lighting, vibrant saturated
colors, slightly chubby kawaii proportions, big round head, full body visible
and centered, no floor shadow. Transparent PNG background, no border, no text.
Square 1024×1024. Should feel magical and approachable for kids ages 6–12.
```

**Elementos identitarios (no cambiar en regeneración):**
- Sombrero violeta puntiagudo con banda dorada y estrellas amarillas.
- Túnica violeta oscuro con cinturón dorado.
- Varita con orbe cyan en la punta.
- Barba blanca fluffy, ojos cerrados sonrientes.

---

### 2. Nova — `char-fisica.png`

```
A friendly cute scientist character named Nova for a children's math education
app. A young cheerful girl with bright magenta-pink hair styled in two big
pigtails, wearing oversized round black glasses, an oversized white lab coat
over a violet t-shirt, a chest pocket with a cyan pen and a pink pen sticking
out. Big sparkly eyes behind the glasses, beaming smile with rosy cheeks. She
holds up a small white index card that reads "E=mc²" in violet letters.
Around her float soft glowing atomic orbit ellipses in cyan and pink, with a
tiny cyan electron speck. 3D Pixar-style render, soft volumetric lighting,
vibrant saturated colors, kawaii proportions, big round head, full body
visible and centered, no floor shadow. Transparent PNG background, no border,
no text other than the formula card. Square 1024×1024. Should feel curious
and inviting for kids ages 6–12.
```

**Elementos identitarios:**
- Pelo magenta-rosado en dos coletas grandes.
- Lentes redondos negros grandes.
- Bata blanca sobre camiseta violeta.
- Tarjeta blanca con "E=mc²" en violeta.
- Órbitas atómicas cyan/rosa flotando alrededor.

---

### 3. Cifra — `char-numero.png`

```
A friendly anthropomorphic golden number "1" character named Cifra for a
children's math education app. The character IS the digit 1: a chunky glossy
3D number "1" sculpted with a smooth radial gradient — cream highlight at the
top-left fading into deep amber shadow at the bottom — with a clear thin
brown outline. In the middle of its body it has a kawaii face: very large
glossy eyes with white star-shaped highlights, a wide closed-eye smile, pink
rosy cheek circles, small open happy mouth. Tiny rounded peach-skinned arms
poke out from the sides with mitten hands waving cheerfully. Around it float
small soft mathematical symbols (a cyan "7", a pink "3", a mint "+", a gold
"="). 3D Pixar-style render, polished glossy surface, soft volumetric
lighting, kawaii proportions. Full body visible and centered, no floor
shadow. Transparent PNG background, no border. Square 1024×1024.
```

**Elementos identitarios:**
- ES el dígito "1" antropomorfizado (no humano sosteniendo un 1).
- Gradiente crema → ámbar dorado.
- Cara kawaii en el medio del cuerpo del 1.
- Bracitos color durazno con manitas tipo mitón.
- Símbolos flotantes: "7" cyan, "3" rosa, "+" mint, "=" oro.

---

### 4. Pita — `char-geo.png`

```
A friendly cute young architect character named Pita for a children's math
education app. A dark-skinned girl with a big rounded purple afro hairstyle,
a slim golden hairband across her forehead with a small gold gem in the
center, big sparkly dark eyes, beaming smile with rosy cheek circles. She
wears a mint-green short-sleeved t-shirt with a clean white "π" symbol on
the chest. In one hand she holds a small silver geometry compass with a gold
hinge. Around her float two small 3D geometric shapes: a glossy purple cube
and a glossy pink tetrahedron/triangular prism. 3D Pixar-style render, soft
volumetric lighting, vibrant saturated colors, kawaii proportions, big round
head, full body visible and centered, no floor shadow. Transparent PNG
background, no border, no text. Square 1024×1024. Should feel creative and
confident for kids ages 6–12.
```

**Elementos identitarios:**
- Piel morena.
- Afro grande violeta.
- Diadema dorada con gema en el centro.
- Camiseta mint-green con "π" blanco.
- Compás plateado con bisagra dorada.
- Cubo violeta + tetraedro/prisma rosa flotando.

---

## Si se necesita un quinto personaje en el futuro

Plantilla genérica respetando las reglas comunes (sustituir lo que está en `[corchetes]`):

```
A friendly cute [tipo: scientist/inventor/explorer/artist/etc.] character named
[NombreNuevo] for a children's math education app. [Descripción física: edad
aparente, género opcional, color de pelo y peinado, color de ojos]. [Vestimenta
con un color dominante distinto a los 4 ya usados — los actuales son violeta
oscuro/Merlín, magenta+blanco/Nova, dorado/Cifra, mint+morado/Pita]. [Un
accesorio temático único que represente su especialidad, sin solapar con los
existentes (varita, tarjeta de fórmula, compás)]. [Opcional: 1–3 elementos
flotantes alrededor relacionados con su tema, en colores que complementen su
paleta]. 3D Pixar-style render, soft volumetric lighting, vibrant saturated
colors, kawaii proportions, big round head, full body visible and centered, no
floor shadow. Transparent PNG background, no border, no text. Square 1024×1024.
Should feel [adjetivo del personaje] for kids ages 6–12.
```

**Después de generar el quinto:**

1. Redimensionar a 500×500.
2. Guardar como `assets/char-<id-nuevo>.png` en la **plantilla de la skill** (no solo en el repo).
3. Añadir entrada al catálogo `CHARACTERS` en `characters.jsx` con `id`, `name`, `title`, `specialty`, `quote`, `Component`.
4. Crear el componente con `makeCharacter("<id-nuevo>", "<sparkleColor>", <seed>)`.
5. Asignar un `sparkleColor` que no choque con los existentes (oro/rosa/cyan/mint).
6. Propagar a todos los `juegos/<slug>/assets/` ya existentes.
7. Regenerar el HTML de cada juego con `bundle.py`.
8. Documentar la decisión en `MEMORY.md` (con justificación de por qué se rompió el invariante "los 4 son siempre los mismos").

**⚠️ Esto requiere conversación explícita con el autor del proyecto.** Los 4 personajes actuales son un invariante validado. Añadir un quinto cambia ese invariante y debería ser una decisión explícita, no un cambio silencioso.

## Si se necesita regenerar uno de los 4 existentes (recuperación)

1. Correr el prompt original tal cual en Nano Banana.
2. Verificar visualmente que el nuevo PNG se parece al de referencia (revisar elementos identitarios listados arriba).
3. Si la generación quedó muy distinta, refinar el prompt (no aceptar variaciones grandes — la consistencia entre juegos depende de esto).
4. Redimensionar a 500×500.
5. Reemplazar `assets/char-<id>.png` en la **plantilla de la skill** Y propagar a todos los `juegos/<slug>/assets/` del repo.
6. Regenerar bundles de todos los juegos.
7. Documentar en `MEMORY.md` por qué se regeneró.
