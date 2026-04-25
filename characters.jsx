// characters.jsx — Personajes 3D estilizados para EDINUN GAMES.
// Cada uno es un SVG con gradientes radiales + sombras para simular volumen.
// No son ilustraciones finales — son placeholders pulidos que el equipo de
// arte 3D puede reemplazar manteniendo la composición.

// ─────────────────────────────────────────────────────────────
// Defs reutilizables — gradientes y sombras comunes a varios personajes
// ─────────────────────────────────────────────────────────────
function CharDefs({ id }) {
  return (
    <defs>
      {/* Piel con volumen */}
      <radialGradient id={`${id}-skin`} cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#ffe2c0" />
        <stop offset="55%" stopColor="#f4c59a" />
        <stop offset="100%" stopColor="#b88156" />
      </radialGradient>
      {/* Piel más oscura */}
      <radialGradient id={`${id}-skin-dark`} cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#d9a683" />
        <stop offset="55%" stopColor="#a77249" />
        <stop offset="100%" stopColor="#5e3e24" />
      </radialGradient>
      {/* Barba / cabello blanco */}
      <radialGradient id={`${id}-white-hair`} cx="45%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="60%" stopColor="#dce1ef" />
        <stop offset="100%" stopColor="#8892b3" />
      </radialGradient>
      {/* Brillo general */}
      <radialGradient id={`${id}-shine`} cx="30%" cy="20%" r="50%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </radialGradient>
      <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="0.6" />
      </filter>
      <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.35" />
      </filter>
    </defs>
  );
}

// Estrellas / chispas alrededor del personaje
function Sparkles({ color = "#fce9a8", count = 6, seed = 1 }) {
  const pts = Array.from({ length: count }, (_, i) => {
    const a = (i * 360) / count + seed * 37;
    const r = 55 + (i % 3) * 8;
    const x = 100 + Math.cos((a * Math.PI) / 180) * r;
    const y = 100 + Math.sin((a * Math.PI) / 180) * r;
    const s = 2 + (i % 3);
    return { x, y, s, delay: i * 0.35 };
  });
  return (
    <g>
      {pts.map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          <circle r={p.s} fill={color} opacity="0.9">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2.4s" begin={`${p.delay}s`} repeatCount="indefinite" />
          </circle>
        </g>
      ))}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. El Mago — "Merlín" · Nivel avanzado · álgebra y lógica
// ─────────────────────────────────────────────────────────────
function MagoCharacter({ size = 200, floating = true }) {
  const id = "mago";
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={floating ? "ed-float-soft" : ""}>
      <CharDefs id={id} />
      <defs>
        <radialGradient id={`${id}-hat`} cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#8a5af2" />
          <stop offset="55%" stopColor="#4a22a8" />
          <stop offset="100%" stopColor="#1c0a55" />
        </radialGradient>
        <radialGradient id={`${id}-robe`} cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#6a3dd6" />
          <stop offset="60%" stopColor="#3a1d8a" />
          <stop offset="100%" stopColor="#120542" />
        </radialGradient>
      </defs>

      <Sparkles color="#fce9a8" count={8} />

      {/* Cuerpo / túnica */}
      <g filter={`url(#${id}-shadow)`}>
        <path
          d="M 65 168 Q 62 132 78 118 Q 88 112 100 112 Q 112 112 122 118 Q 138 132 135 168 Z"
          fill={`url(#${id}-robe)`}
        />
        {/* cinturón dorado */}
        <rect x="74" y="148" width="52" height="6" rx="2" fill="url(#gold-grad)" />

        {/* barba blanca */}
        <path
          d="M 78 108 Q 78 145 100 150 Q 122 145 122 108 Q 120 120 112 124 Q 100 128 88 124 Q 80 120 78 108 Z"
          fill={`url(#${id}-white-hair)`}
        />

        {/* cabeza */}
        <ellipse cx="100" cy="95" rx="22" ry="24" fill={`url(#${id}-skin)`} />
        <ellipse cx="100" cy="85" rx="18" ry="8" fill={`url(#${id}-shine)`} opacity="0.5" />

        {/* ojos cerrados sonrientes */}
        <path d="M 90 92 Q 93 89 96 92" stroke="#1a0f40" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 104 92 Q 107 89 110 92" stroke="#1a0f40" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* nariz */}
        <path d="M 100 97 Q 97 100 100 104 Q 103 102 100 97" fill="#c8976a" opacity="0.7" />
        {/* boca */}
        <path d="M 94 108 Q 100 112 106 108" stroke="#5a2a0a" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* sombrero cónico */}
        <path
          d="M 70 80 Q 95 6 115 22 Q 130 36 130 80 Q 125 72 100 70 Q 78 72 70 80 Z"
          fill={`url(#${id}-hat)`}
        />
        {/* banda del sombrero */}
        <path d="M 72 78 Q 100 68 128 78 L 125 86 Q 100 78 75 86 Z" fill="#f2c260" opacity="0.9" />
        <circle cx="100" cy="82" r="3" fill="#fce9a8" />
        {/* estrellas en sombrero */}
        <g fill="#fce9a8" opacity="0.95">
          <path d="M 86 48 l 2 5 l 5 1 l -3.5 3.5 l 1 5 l -4.5 -2.5 l -4.5 2.5 l 1 -5 l -3.5 -3.5 l 5 -1 z" transform="scale(0.6) translate(58 30)" />
          <circle cx="110" cy="42" r="2" />
          <circle cx="95" cy="58" r="1.5" />
        </g>
        {/* punta ligeramente doblada */}
        <path d="M 102 10 Q 108 2 116 6 Q 112 14 106 18 Z" fill={`url(#${id}-hat)`} />

        {/* manos sosteniendo varita */}
        <ellipse cx="76" cy="140" rx="7" ry="6" fill={`url(#${id}-skin)`} />
        <ellipse cx="126" cy="132" rx="7" ry="6" fill={`url(#${id}-skin)`} />
        {/* varita */}
        <rect x="130" y="90" width="4" height="48" rx="2" fill="#6b3410" transform="rotate(18 132 114)" />
        <circle cx="142" cy="84" r="8" fill="url(#cyan-grad)">
          <animate attributeName="r" values="7;9;7" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="142" cy="84" r="5" fill="#fff" opacity="0.8" />
      </g>

      {/* Defs globales reutilizables dentro del SVG */}
      <defs>
        <linearGradient id="gold-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fce9a8" />
          <stop offset="50%" stopColor="#f2c260" />
          <stop offset="100%" stopColor="#a8781e" />
        </linearGradient>
        <radialGradient id="cyan-grad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#4fd8ff" />
          <stop offset="100%" stopColor="#1a6ba0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. La Física — "Nova" · Nivel medio · multiplicación, fracciones
// ─────────────────────────────────────────────────────────────
function FisicaCharacter({ size = 200, floating = true }) {
  const id = "fisica";
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={floating ? "ed-float-soft" : ""}>
      <CharDefs id={id} />
      <defs>
        <radialGradient id={`${id}-hair`} cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ff8fd8" />
          <stop offset="55%" stopColor="#d64aa8" />
          <stop offset="100%" stopColor="#7a1a5c" />
        </radialGradient>
        <radialGradient id={`${id}-coat`} cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#d0d6ea" />
          <stop offset="100%" stopColor="#7b86a8" />
        </radialGradient>
      </defs>

      <Sparkles color="#ff5fb3" count={6} seed={2} />

      {/* órbita atómica */}
      <g opacity="0.55">
        <ellipse cx="100" cy="100" rx="75" ry="22" fill="none" stroke="#4fd8ff" strokeWidth="1.5" transform="rotate(25 100 100)" />
        <ellipse cx="100" cy="100" rx="75" ry="22" fill="none" stroke="#ff5fb3" strokeWidth="1.5" transform="rotate(-30 100 100)" />
        <circle cx="172" cy="92" r="4" fill="#4fd8ff">
          <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="6s" repeatCount="indefinite" />
        </circle>
      </g>

      <g filter={`url(#${id}-shadow)`}>
        {/* bata blanca */}
        <path d="M 62 172 Q 60 128 78 118 L 100 116 L 122 118 Q 140 128 138 172 Z" fill={`url(#${id}-coat)`} />
        <line x1="100" y1="120" x2="100" y2="172" stroke="#c6cde4" strokeWidth="2" strokeDasharray="4 3" />
        {/* bolsillo con bolígrafo */}
        <rect x="108" y="138" width="14" height="14" rx="2" fill="rgba(0,0,0,0.05)" />
        <rect x="113" y="130" width="2.5" height="10" fill="#4fd8ff" />
        <rect x="116" y="130" width="2.5" height="10" fill="#ff5fb3" />

        {/* cuello morado de la camiseta */}
        <path d="M 88 120 Q 100 132 112 120 L 112 126 Q 100 136 88 126 Z" fill="#6a3dd6" />

        {/* cabeza */}
        <ellipse cx="100" cy="95" rx="22" ry="24" fill={`url(#${id}-skin)`} />
        <ellipse cx="100" cy="85" rx="18" ry="8" fill={`url(#${id}-shine)`} opacity="0.5" />

        {/* cabello magenta — dos coletas */}
        <path
          d="M 78 82 Q 74 66 88 58 Q 100 52 112 58 Q 126 66 122 82 Q 122 72 100 70 Q 78 72 78 82 Z"
          fill={`url(#${id}-hair)`}
        />
        <ellipse cx="72" cy="96" rx="10" ry="18" fill={`url(#${id}-hair)`} transform="rotate(-15 72 96)" />
        <ellipse cx="128" cy="96" rx="10" ry="18" fill={`url(#${id}-hair)`} transform="rotate(15 128 96)" />

        {/* gafas */}
        <g>
          <circle cx="91" cy="94" r="7" fill="rgba(79,216,255,0.25)" stroke="#1a0f40" strokeWidth="2" />
          <circle cx="109" cy="94" r="7" fill="rgba(79,216,255,0.25)" stroke="#1a0f40" strokeWidth="2" />
          <line x1="98" y1="94" x2="102" y2="94" stroke="#1a0f40" strokeWidth="2" />
        </g>
        {/* ojos tras las gafas */}
        <circle cx="91" cy="94" r="2.5" fill="#1a0f40" />
        <circle cx="109" cy="94" r="2.5" fill="#1a0f40" />
        <circle cx="92" cy="93" r="0.8" fill="#fff" />
        <circle cx="110" cy="93" r="0.8" fill="#fff" />

        {/* boca sonriente */}
        <path d="M 92 107 Q 100 114 108 107" stroke="#5a2a0a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        {/* mejillas */}
        <circle cx="84" cy="105" r="3" fill="#ff8fb3" opacity="0.55" />
        <circle cx="116" cy="105" r="3" fill="#ff8fb3" opacity="0.55" />

        {/* mano sosteniendo fórmula */}
        <ellipse cx="130" cy="148" rx="7" ry="6" fill={`url(#${id}-skin)`} />
        <g transform="translate(118 122) rotate(12)">
          <rect x="0" y="0" width="34" height="22" rx="3" fill="#fff" stroke="#1a0f40" strokeWidth="1.5" />
          <text x="17" y="15" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontSize="11" fontWeight="700" fill="#6a3dd6">E=mc²</text>
        </g>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. El Numerólogo — "Cifra" · Nivel básico · sumas y restas
// ─────────────────────────────────────────────────────────────
function NumerologoCharacter({ size = 200, floating = true }) {
  const id = "numero";
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={floating ? "ed-float-soft" : ""}>
      <CharDefs id={id} />
      <defs>
        <radialGradient id={`${id}-body`} cx="35%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#ffd176" />
          <stop offset="55%" stopColor="#f5a623" />
          <stop offset="100%" stopColor="#8a4a05" />
        </radialGradient>
        <radialGradient id={`${id}-body-inner`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe7a8" />
          <stop offset="100%" stopColor="#f5a623" />
        </radialGradient>
      </defs>

      <Sparkles color="#4fd8ff" count={5} seed={3} />

      {/* dígitos flotando */}
      <g fontFamily="Fredoka, sans-serif" fontWeight="700" opacity="0.85">
        <text x="30" y="50" fontSize="22" fill="#4fd8ff">7</text>
        <text x="160" y="48" fontSize="18" fill="#ff5fb3">3</text>
        <text x="170" y="150" fontSize="20" fill="#7bf5c4">+</text>
        <text x="22" y="160" fontSize="18" fill="#f2c260">=</text>
      </g>

      <g filter={`url(#${id}-shadow)`}>
        {/* Es un número "1" antropomórfico en 3D */}
        <path
          d="M 72 60 Q 80 38 100 38 Q 120 38 118 62 L 118 148 Q 118 160 128 162 L 128 176 L 72 176 L 72 162 Q 82 160 82 148 L 82 78 Q 78 82 72 80 Z"
          fill={`url(#${id}-body)`}
          stroke="#6b3410"
          strokeWidth="2"
        />
        {/* highlight en el cuerpo */}
        <path
          d="M 88 50 Q 92 46 100 46 L 100 148"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />

        {/* cara */}
        <g transform="translate(100 100)">
          {/* ojos grandes tipo kawaii */}
          <ellipse cx="-10" cy="-2" rx="6" ry="8" fill="#fff" />
          <ellipse cx="10" cy="-2" rx="6" ry="8" fill="#fff" />
          <ellipse cx="-9" cy="0" rx="3.5" ry="5" fill="#1a0f40" />
          <ellipse cx="11" cy="0" rx="3.5" ry="5" fill="#1a0f40" />
          <circle cx="-8" cy="-2" r="1.5" fill="#fff" />
          <circle cx="12" cy="-2" r="1.5" fill="#fff" />
          {/* boca sonriente */}
          <path d="M -8 10 Q 0 18 8 10" stroke="#5a2a0a" strokeWidth="2.2" fill="#fff" strokeLinejoin="round" />
          {/* mejillas */}
          <circle cx="-17" cy="8" r="3" fill="#ff8fb3" opacity="0.7" />
          <circle cx="17" cy="8" r="3" fill="#ff8fb3" opacity="0.7" />
        </g>

        {/* bracitos */}
        <g>
          <ellipse cx="62" cy="120" rx="10" ry="6" fill={`url(#${id}-body)`} transform="rotate(-20 62 120)" />
          <ellipse cx="138" cy="120" rx="10" ry="6" fill={`url(#${id}-body)`} transform="rotate(20 138 120)" />
          <circle cx="56" cy="128" r="6" fill={`url(#${id}-skin)`} />
          <circle cx="144" cy="128" r="6" fill={`url(#${id}-skin)`} />
        </g>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. La Geómetra — "Pita" · Geometría, patrones y lógica
// ─────────────────────────────────────────────────────────────
function GeometraCharacter({ size = 200, floating = true }) {
  const id = "geo";
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={floating ? "ed-float-soft" : ""}>
      <CharDefs id={id} />
      <defs>
        <radialGradient id={`${id}-hair`} cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#6a3dd6" />
          <stop offset="55%" stopColor="#3a1d8a" />
          <stop offset="100%" stopColor="#120542" />
        </radialGradient>
        <radialGradient id={`${id}-shirt`} cx="50%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#7bf5c4" />
          <stop offset="60%" stopColor="#2ecc8f" />
          <stop offset="100%" stopColor="#0a5a3a" />
        </radialGradient>
      </defs>

      <Sparkles color="#7bf5c4" count={6} seed={4} />

      {/* formas geométricas 3D flotando */}
      <g opacity="0.9">
        {/* cubo */}
        <g transform="translate(22 50)">
          <polygon points="0,6 12,0 24,6 12,12" fill="#8a5af2" />
          <polygon points="0,6 0,22 12,28 12,12" fill="#5a2dc0" />
          <polygon points="24,6 24,22 12,28 12,12" fill="#3a1d8a" />
        </g>
        {/* triángulo 3D */}
        <g transform="translate(158 142)">
          <polygon points="10,0 20,18 0,18" fill="#ff5fb3" />
          <polygon points="10,0 20,18 14,20" fill="#b8368a" />
        </g>
      </g>

      <g filter={`url(#${id}-shadow)`}>
        {/* cuerpo / camiseta */}
        <path d="M 66 172 Q 64 130 80 120 L 100 118 L 120 120 Q 136 130 134 172 Z" fill={`url(#${id}-shirt)`} />
        {/* símbolo π en el pecho */}
        <text x="100" y="150" textAnchor="middle" fontFamily="Fredoka" fontSize="22" fontWeight="700" fill="#fff" opacity="0.85">π</text>

        {/* cabeza — piel oscura */}
        <ellipse cx="100" cy="94" rx="22" ry="24" fill={`url(#${id}-skin-dark)`} />
        <ellipse cx="100" cy="84" rx="18" ry="8" fill={`url(#${id}-shine)`} opacity="0.35" />

        {/* cabello afro redondo */}
        <path
          d="M 76 80 Q 70 58 88 50 Q 100 44 112 50 Q 130 58 124 80 Q 125 66 100 64 Q 75 66 76 80 Z"
          fill={`url(#${id}-hair)`}
        />
        <circle cx="80" cy="78" r="9" fill={`url(#${id}-hair)`} />
        <circle cx="120" cy="78" r="9" fill={`url(#${id}-hair)`} />
        <circle cx="86" cy="58" r="8" fill={`url(#${id}-hair)`} />
        <circle cx="114" cy="58" r="8" fill={`url(#${id}-hair)`} />
        <circle cx="100" cy="52" r="8" fill={`url(#${id}-hair)`} />

        {/* diadema dorada */}
        <path d="M 80 76 Q 100 70 120 76 L 120 80 Q 100 76 80 80 Z" fill="url(#geo-gold)" />
        <circle cx="100" cy="76" r="3" fill="#fce9a8" />

        {/* ojos */}
        <ellipse cx="91" cy="94" rx="3" ry="4" fill="#1a0f40" />
        <ellipse cx="109" cy="94" rx="3" ry="4" fill="#1a0f40" />
        <circle cx="92" cy="93" r="0.9" fill="#fff" />
        <circle cx="110" cy="93" r="0.9" fill="#fff" />

        {/* boca sonriente */}
        <path d="M 92 106 Q 100 112 108 106" stroke="#3a1a08" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <circle cx="84" cy="104" r="2.5" fill="#ff8fb3" opacity="0.45" />
        <circle cx="116" cy="104" r="2.5" fill="#ff8fb3" opacity="0.45" />

        {/* mano sosteniendo compás */}
        <ellipse cx="72" cy="150" rx="7" ry="6" fill={`url(#${id}-skin-dark)`} />
        {/* compás */}
        <g transform="translate(60 122) rotate(-15)">
          <line x1="6" y1="0" x2="0" y2="28" stroke="#bfc5d4" strokeWidth="3" strokeLinecap="round" />
          <line x1="6" y1="0" x2="14" y2="28" stroke="#bfc5d4" strokeWidth="3" strokeLinecap="round" />
          <circle cx="6" cy="0" r="3" fill="#f2c260" />
        </g>
      </g>

      <defs>
        <linearGradient id="geo-gold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fce9a8" />
          <stop offset="100%" stopColor="#a8781e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Avatar compacto (para HUD / perfil / cards)
// ─────────────────────────────────────────────────────────────
function CharacterAvatar({ char, size = 56 }) {
  const map = {
    mago: MagoCharacter,
    fisica: FisicaCharacter,
    numero: NumerologoCharacter,
    geo: GeometraCharacter,
  };
  const C = map[char] || MagoCharacter;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%",
      background: "radial-gradient(circle at 30% 30%, rgba(138,90,242,.8), rgba(18,10,55,.95))",
      boxShadow: "inset 0 0 0 2px rgba(242,194,96,.8), 0 0 14px rgba(138,90,242,.45)",
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div style={{ transform: `translateY(${size * 0.08}px) scale(1.3)` }}>
        <C size={size} floating={false} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Catálogo de personajes
// ─────────────────────────────────────────────────────────────
const CHARACTERS = [
  {
    id: "mago",
    name: "Merlín",
    title: "El Mago",
    specialty: "Maestro de los hechizos",
    quote: "¡Abracadabra! Con un pase de varita, todo es posible.",
    Component: MagoCharacter,
  },
  {
    id: "fisica",
    name: "Nova",
    title: "La Física",
    specialty: "Exploradora del cosmos",
    quote: "El universo está lleno de misterios esperando a ser descubiertos.",
    Component: FisicaCharacter,
  },
  {
    id: "numero",
    name: "Cifra",
    title: "El Numerólogo",
    specialty: "Guardián de los dígitos",
    quote: "¡Vamos a contar una gran aventura juntos!",
    Component: NumerologoCharacter,
  },
  {
    id: "geo",
    name: "Pita",
    title: "La Geómetra",
    specialty: "Arquitecta de las formas",
    quote: "Todo en el universo tiene una forma perfecta.",
    Component: GeometraCharacter,
  },
];

Object.assign(window, {
  MagoCharacter,
  FisicaCharacter,
  NumerologoCharacter,
  GeometraCharacter,
  CharacterAvatar,
  CHARACTERS,
});
