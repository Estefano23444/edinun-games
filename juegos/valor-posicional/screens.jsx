// screens.jsx — Todas las pantallas del prototipo EDINUN GAMES.
// Importa (globalmente) CHARACTERS, personajes, EdinunLogo, EdinunLogoMini.

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Fondo cósmico + glifos matemáticos flotantes (se reusa en todas las
// pantallas excepto la del aula en pizarra).
// ─────────────────────────────────────────────────────────────
function CosmosBg({ variant = "cosmic", glyphSize }) {
  // `glyphSize` es la fuente base de los glifos en CSS px, calculada en
  // DeviceStage a partir del vw/vh defendido contra cambios de DPR. Si se
  // recibe, se aplica inline y gana sobre el `clamp(48px, 7vmin, 110px)` de
  // styles.css. Sin esto, ctrl+rueda del mouse hace que los glifos crezcan
  // mucho más rápido que el lienzo: el lienzo está congelado pero CSS sigue
  // leyendo el vmin actual del navegador y los glifos tocan el mínimo del
  // clamp, mientras el navegador amplifica todo visualmente.
  const glyphsStyle = glyphSize ? { fontSize: glyphSize + "px" } : undefined;
  if (variant === "chalkboard") {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, #3a9b7a 0%, #1d6b53 55%, #0b3a2d 100%)",
          overflow: "hidden",
        }}
      >
        <div className="ed-glyphs" style={{ color: "rgba(255,255,255,0.10)", ...glyphsStyle }}>
          <span style={{ left: "6%", top: "12%", "--rot": "-8deg" }}>U</span>
          <span style={{ left: "82%", top: "16%", "--rot": "6deg", fontSize: "0.62em" }}>D</span>
          <span style={{ left: "10%", top: "78%", "--rot": "12deg", fontSize: "0.7em" }}>C</span>
          <span style={{ left: "88%", top: "72%", "--rot": "-10deg", fontSize: "0.55em" }}>M</span>
          <span style={{ left: "45%", top: "8%", "--rot": "4deg", fontSize: "0.5em" }}>+</span>
          <span style={{ left: "3%", top: "45%", "--rot": "-4deg", fontSize: "0.6em" }}>=</span>
          <span style={{ left: "92%", top: "45%", "--rot": "8deg", fontSize: "0.4em" }}>10</span>
          <span style={{ left: "30%", top: "55%", "--rot": "-6deg", fontSize: "0.36em" }}>100</span>
          <span style={{ left: "70%", top: "62%", "--rot": "8deg", fontSize: "0.52em" }}>?</span>
          <span style={{ left: "55%", top: "30%", "--rot": "-4deg", fontSize: "0.5em" }}>▮</span>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="ed-cosmos" />
      <div className="ed-glyphs" style={glyphsStyle}>
        <span style={{ left: "5%", top: "10%", "--rot": "-8deg" }}>U</span>
        <span style={{ left: "84%", top: "6%", "--rot": "6deg", fontSize: "0.78em" }}>D</span>
        <span style={{ left: "92%", top: "72%", "--rot": "-12deg", fontSize: "0.74em" }}>C</span>
        <span style={{ left: "3%", top: "82%", "--rot": "12deg", fontSize: "0.55em" }}>UM</span>
        <span style={{ left: "46%", top: "4%", "--rot": "-4deg", fontSize: "0.5em" }}>DM</span>
        <span style={{ left: "7%", top: "46%", "--rot": "-4deg", fontSize: "0.55em" }}>CM</span>
        <span style={{ left: "88%", top: "40%", "--rot": "8deg", fontSize: "0.5em" }}>UMi</span>
        <span style={{ left: "22%", top: "22%", "--rot": "10deg", fontSize: "0.5em" }}>DMi</span>
        <span style={{ left: "70%", top: "24%", "--rot": "-6deg", fontSize: "0.5em" }}>CMi</span>
        <span style={{ left: "32%", top: "70%", "--rot": "8deg", fontSize: "0.6em" }}>+</span>
        <span style={{ left: "62%", top: "78%", "--rot": "-10deg", fontSize: "0.63em" }}>=</span>
        <span style={{ left: "18%", top: "58%", "--rot": "14deg", fontSize: "0.48em" }}>10</span>
        <span style={{ left: "78%", top: "56%", "--rot": "-8deg", fontSize: "0.45em" }}>100</span>
        <span style={{ left: "50%", top: "88%", "--rot": "4deg", fontSize: "0.32em" }}>1 000 000</span>
        <span style={{ left: "40%", top: "38%", "--rot": "-6deg", fontSize: "0.6em" }}>▮</span>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Visitor ticker — valor persistente en localStorage que se incrementa
// al entrar. Útil para dar sensación de "contador público" sin backend.
// ─────────────────────────────────────────────────────────────
// Contador de partidas completadas (persistente en localStorage).
// Se incrementa al terminar cada juego. Pensado para servidores estáticos
// sin backend — sólo HTML + localStorage del navegador.
// Contador de VISITANTES ─────────────────────────────────────
// Suma +1 cada vez que se monta HomeScreen (cada entrada al inicio cuenta,
// incluso múltiples veces en el mismo dispositivo). El total vive en
// localStorage y persiste entre sesiones. Pensado para servidores estáticos
// sin backend.
function useVisitorCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const KEY = "edinun_visitors_v1";
    let current = parseInt(localStorage.getItem(KEY) || "0", 10);
    if (isNaN(current)) current = 0;
    current += 1;
    localStorage.setItem(KEY, String(current));
    setN(current);
  }, []);
  return n;
}

// SVG de personitas para el contador de visitantes.
function PeopleIcon({ size = 18, color = "#fce9a8" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="7" r="3" fill={color} />
      <circle cx="16" cy="7" r="3" fill={color} opacity="0.85" />
      <path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6v1H2v-1z" fill={color} />
      <path d="M14 20c0-2 -.7-3.8-1.8-5.2 1-.5 2.1-.8 3.3-.8 3.3 0 6 2.7 6 6v1H14v-1z" fill={color} opacity="0.85" />
    </svg>
  );
}

function incrementGamesCompleted() {
  const KEY = "edinun_games_completed_v1";
  const raw = localStorage.getItem(KEY);
  const next = (raw ? parseInt(raw, 10) : 0) + 1;
  localStorage.setItem(KEY, String(next));
  window.dispatchEvent(new Event("edinun:games-updated"));
  return next;
}

// ─────────────────────────────────────────────────────────────
// 1. PANTALLA DE INICIO — nombre + selección rápida de nivel
// ─────────────────────────────────────────────────────────────
function HomeScreen({ app, setApp, go }) {
  const visitors = useVisitorCount();
  const [name, setName] = useState(app.studentName || "");
  const [level, setLevel] = useState(app.level || "basic");

  function start() {
    if (!name.trim()) return;
    setApp((s) => ({
      ...s,
      studentName: name.trim(),
      level,
      sessionStart: Date.now(),
    }));
    go("character");
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>


      {/* Contador de visitantes (abajo derecha, con icono de personitas) */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          right: 22,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(10,6,35,0.55)",
          border: "1px solid rgba(242,194,96,0.3)",
          borderRadius: 999,
          padding: "6px 12px",
          backdropFilter: "blur(8px)",
        }}
      >
        <PeopleIcon size={16} color="#fce9a8" />
        <div style={{ fontFamily: "var(--ed-font-mono)", fontSize: 11, color: "#f2c260", letterSpacing: "0.06em" }}>
          {visitors.toLocaleString("es-CO")}
          <span style={{ color: "rgba(246,241,255,0.55)", marginLeft: 6 }}>visitas</span>
        </div>
      </div>

      {/* Contenido principal */}
      <div
        style={{
          position: "absolute", inset: 0,
          display: "grid",
          gridTemplateColumns: "1fr 1.15fr",
          alignItems: "center",
          padding: "40px 56px",
          gap: 40,
        }}
      >
        {/* Columna izquierda — logo protagonista */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <EdinunLogo size={300} />
        </div>

        {/* Columna derecha — entrada + niveles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 520 }}>
          <div>
            <div className="ed-label" style={{ color: "#4fd8ff", marginBottom: 8 }}>
              EDINUN · Valor posicional
            </div>
            <h1 className="ed-h1" style={{ fontSize: 44, lineHeight: 1.05 }}>
              ¡Bienvenido/a,{" "}
              <span style={{
                background: "linear-gradient(180deg,#fce9a8,#d9a441)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 600,
              }}>
                Estudiante!
              </span>
            </h1>
          </div>

          {/* 1. Selección de nivel — primer paso del flujo. Va arriba para que
              el niño elija qué quiere jugar antes de identificarse: tocar un
              botón grande de color es más concreto que escribir un nombre. */}
          <div>
            <div className="ed-label" style={{ marginBottom: 10 }}>
              Selecciona un tema para jugar
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { id: "basic", label: "Números hasta el 40", grad: "linear-gradient(180deg, #ffc06e, #e4881a)", ink: "#3a2608" },
                { id: "medium", label: "Números hasta el 60", grad: "linear-gradient(180deg, #ffe97a, #d7b12a)", ink: "#3a2608" },
                { id: "advanced", label: "9 cifras", grad: "linear-gradient(180deg, #7ab8ff, #2773d8)", ink: "#08264d" },
              ].map((lv) => {
                const active = level === lv.id;
                return (
                  <button
                    key={lv.id}
                    onClick={() => setLevel(lv.id)}
                    style={{
                      padding: "14px 6px",
                      borderRadius: 18,
                      background: lv.grad,
                      color: lv.ink,
                      fontFamily: "var(--ed-font-display)",
                      fontWeight: 700,
                      fontSize: 14,
                      lineHeight: 1.15,
                      letterSpacing: "0.01em",
                      boxShadow: active
                        ? "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -3px 0 rgba(0,0,0,0.2), 0 0 0 3px rgba(255,255,255,0.85), 0 0 28px rgba(255,255,255,0.35)"
                        : "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.18), 0 6px 14px -4px rgba(0,0,0,0.45)",
                      transform: active ? "translateY(-2px)" : "none",
                      transition: "all 0.18s ease",
                      textShadow: "0 1px 0 rgba(255,255,255,0.25)",
                    }}
                  >
                    {lv.label}
                  </button>
                );
              })}
            </div>
            {/* Descripción corta del nivel — pensada para 2do (6–8 años):
                una frase clara, sin detalles técnicos. */}
            <div style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(10,6,35,0.55)",
              border: "1px solid rgba(148,120,255,0.3)",
              fontFamily: "var(--ed-font-display)", fontWeight: 600,
              fontSize: 15, lineHeight: 1.3,
              color: "#fce9a8",
              textAlign: "center",
            }}>
              {{
                basic: "Arma números hasta el 40",
                medium: "Arma números hasta el 60",
                advanced: "Arma números de hasta 9 cifras",
              }[level]}
            </div>
          </div>

          {/* 2. Nombre + ENTRAR — segundo paso. El placeholder hace de copy
              explicativo, sin párrafo redundante (USER.md: corto y accionable). */}
          <div>
            <div className="ed-label" style={{ marginBottom: 10 }}>
              Escribe tu nombre y entra
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  className="ed-input"
                  placeholder="Escribe tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && start()}
                />
              </div>
              <button className="ed-btn ed-btn-primary" onClick={start} disabled={!name.trim()}
                style={{ height: 52, padding: "0 28px", fontSize: 16, opacity: name.trim() ? 1 : 0.5 }}>
                ENTRAR →
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. SELECCIÓN DE PERSONAJE
// ─────────────────────────────────────────────────────────────
function CharacterScreen({ app, setApp, go }) {
  const [sel, setSel] = useState(app.character || "mago");
  const current = CHARACTERS.find((c) => c.id === sel) || CHARACTERS[0];

  function choose() {
    // Derivar la categoría desde el nivel elegido en Home:
    //   básico   → vp40 (números hasta 40, modo Dienes)
    //   medio    → vp60 (números hasta 60, modo Dienes)
    //   avanzado → vp9  (8 o 9 cifras, modo dígitos posicionales)
    const level = app.level || "basic";
    let catId = "vp40", catLabel = "Valor posicional - Hasta 40";
    if (level === "medium") {
      catId = "vp60"; catLabel = "Valor posicional - Hasta 60";
    } else if (level === "advanced") {
      catId = "vp9"; catLabel = "Valor posicional - Números grandes";
    }
    setApp((s) => ({
      ...s,
      character: sel,
      currentCategory: catId,
      currentCatLabel: catLabel,
    }));
    go("game");
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>


      {/* Header — primero "Hola, X", luego logo grande a la derecha */}
      <div style={{ position: "absolute", top: 18, left: 24, right: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button className="ed-btn ed-btn-ghost" onClick={() => go("home")} style={{ padding: "8px 14px" }}>
          ← VOLVER
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, color: "#fce9a8", fontSize: 20, textShadow: "0 2px 6px rgba(0,0,0,0.45)" }}>
            Hola, {app.studentName || "Estudiante"} 👋
          </div>
          <EdinunLogoMini size={64} />
        </div>
      </div>

      {/* Contenido */}
      <div style={{
        position: "absolute", inset: "92px 32px 24px 32px",
        display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: 24, alignItems: "center",
      }}>
        {/* Columna izquierda — personaje seleccionado, más grande con frase carismática */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0 }}>
          <div style={{ position: "relative" }}>
            {/* plataforma */}
            <div style={{
              position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)",
              width: 220, height: 28, borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(242,194,96,0.45), transparent 70%)",
              filter: "blur(5px)",
            }} />
            <current.Component size={280} floating />
          </div>
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <h2 className="ed-h1" style={{ fontSize: 28, lineHeight: 1 }}>{current.name}</h2>
            <div className="ed-label" style={{ color: "#fce9a8", marginTop: 2, fontSize: 10 }}>{current.title}</div>
            <div className="ed-body" style={{ marginTop: 6, maxWidth: 320, fontStyle: "italic", fontSize: 13, lineHeight: 1.35 }}>
              "{current.quote}"
            </div>
          </div>
        </div>

        {/* Columna derecha — grid seleccionable */}
        <div>
          <div className="ed-label" style={{ marginBottom: 10 }}>Elige tu guía matemático</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {CHARACTERS.map((c) => {
              const active = sel === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSel(c.id)}
                  className="ed-card"
                  style={{
                    padding: 12,
                    textAlign: "left",
                    cursor: "pointer",
                    transform: active ? "translateY(-2px)" : "none",
                    boxShadow: active
                      ? "var(--ed-shadow-card), 0 0 0 2px rgba(79,216,255,0.7), 0 0 30px rgba(79,216,255,0.35)"
                      : "var(--ed-shadow-card)",
                    transition: "all 0.18s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 68, height: 68, flexShrink: 0 }}>
                      <c.Component size={68} floating={false} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 18 }}>
                        {c.name}
                      </div>
                      <div className="ed-label" style={{ fontSize: 10, color: "#4fd8ff" }}>
                        {c.specialty}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={choose}
            className="ed-btn ed-btn-primary"
            style={{ marginTop: 20, width: "100%", height: 52, fontSize: 17 }}
          >
            ¡VAMOS, {current.name.toUpperCase()}! →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. MENÚ DE CATEGORÍAS
// ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "suma", name: "Sumas", level: "basic", emoji: "+", tone: "#f5a623", prog: 0.8, locked: false },
  { id: "resta", name: "Restas", level: "basic", emoji: "−", tone: "#ff8a5c", prog: 0.55, locked: false },
  { id: "mult", name: "Multiplicación", level: "medium", emoji: "×", tone: "#f5d84b", prog: 0.3, locked: false },
  { id: "div", name: "División", level: "medium", emoji: "÷", tone: "#b3e65e", prog: 0.1, locked: false },
  { id: "frac", name: "Fracciones", level: "medium", emoji: "½", tone: "#7bf5c4", prog: 0, locked: false },
  { id: "geom", name: "Geometría", level: "advanced", emoji: "△", tone: "#4fd8ff", prog: 0, locked: true },
  { id: "alge", name: "Álgebra", level: "advanced", emoji: "x²", tone: "#8a5af2", prog: 0, locked: true },
  { id: "logic", name: "Lógica", level: "advanced", emoji: "∞", tone: "#ff5fb3", prog: 0, locked: true },
];

function MenuScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];

  function play(cat) {
    if (cat.locked) return;
    setApp((s) => ({ ...s, currentCategory: cat.id, currentCatLabel: cat.name }));
    go("game");
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>


      {/* Header */}
      <div style={{ position: "absolute", top: 16, left: 24, right: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button className="ed-btn ed-btn-ghost" onClick={() => go("character")} style={{ padding: "8px 14px" }}>← Volver</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <EdinunLogoMini size={34} />
          <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, color: "#f2c260" }}>EDINUN</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(10,6,35,0.7)", padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(242,194,96,0.35)" }}>
            <span style={{ fontSize: 16 }}>⭐</span>
            <span style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600 }}>{app.stars || 48}</span>
          </div>
          <button onClick={() => go("profile")} style={{ padding: 0, borderRadius: "50%" }}>
            <CharacterAvatar char={app.character} size={40} />
          </button>
        </div>
      </div>

      {/* Título */}
      <div style={{ position: "absolute", top: 74, left: 40, right: 40 }}>
        <h1 className="ed-h1" style={{ fontSize: 32 }}>
          ¡Hola, <span style={{ color: "#fce9a8" }}>{app.studentName}</span>!{" "}
          <span style={{ fontSize: 22, fontWeight: 400, color: "var(--ed-ink-dim)" }}>
            — Elige una aventura con {char.name}
          </span>
        </h1>
      </div>

      {/* Grid de categorías — 4x2 */}
      <div style={{
        position: "absolute",
        top: 130, left: 40, right: 40, bottom: 32,
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "1fr 1fr",
        gap: 14,
      }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => play(cat)}
            className="ed-card"
            style={{
              padding: "14px 14px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              cursor: cat.locked ? "not-allowed" : "pointer",
              opacity: cat.locked ? 0.55 : 1,
              position: "relative",
              overflow: "hidden",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => !cat.locked && (e.currentTarget.style.transform = "translateY(-3px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            {/* halo tono */}
            <div style={{
              position: "absolute", inset: -20,
              background: `radial-gradient(circle at 30% 0%, ${cat.tone}44, transparent 55%)`,
              pointerEvents: "none",
            }} />
            <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div className={`ed-chip ed-chip-${cat.level}`} style={{ fontSize: 10, padding: "2px 8px" }}>
                {cat.level === "basic" ? "Básico" : cat.level === "medium" ? "Medio" : "Avanzado"}
              </div>
              {cat.locked && <div style={{ fontSize: 18 }}>🔒</div>}
            </div>
            <div style={{
              position: "relative",
              fontFamily: "var(--ed-font-display)",
              fontWeight: 600,
              fontSize: 58,
              lineHeight: 1,
              color: cat.tone,
              textShadow: `0 0 20px ${cat.tone}66, 0 3px 0 rgba(0,0,0,0.3)`,
              textAlign: "center",
              margin: "8px 0",
            }}>
              {cat.emoji}
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
                {cat.name}
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.12)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.round(cat.prog * 100)}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${cat.tone}, #fff)`,
                }} />
              </div>
              <div className="ed-label" style={{ fontSize: 10, marginTop: 4, color: "rgba(246,241,255,0.55)" }}>
                {cat.locked ? "Pensum superior" : `${Math.round(cat.prog * 100)}% completado`}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, CharacterScreen, MenuScreen, CosmosBg, CATEGORIES, incrementGamesCompleted });
