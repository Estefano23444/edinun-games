// app.jsx — Shell de producción EDINUN GAMES.
// Enrutador por estado y device stage adaptativo (desktop / tablet / mobile).
// Móvil portrait: el contenido NUNCA rota; queda letterboxed y obliga al
// usuario a rotar físicamente el teléfono.

const { useState: useStateA, useEffect: useEffectA } = React;

// ─────────────────────────────────────────────────────────────
// DeviceStage — escala el lienzo lógico 900×540 (paisaje) al viewport.
//
// Reglas:
//   · Desktop / tablet: marco redondeado + notch decorativo, padding cómodo.
//   · Mobile (cualquier orientación): sin marco, sin notch, padding mínimo.
//   · Mobile portrait: scale es pequeño y se ve "horizontal apretado".
//     Eso es intencional — el usuario debe girar el teléfono. Mostramos un
//     hint discreto, no bloqueante.
// ─────────────────────────────────────────────────────────────
function DeviceStage({ children, variant = "cosmic" }) {
  const W = 900, H = 540;
  const [scale, setScale] = useStateA(1);
  const [mode, setMode] = useStateA("desktop");
  const [portrait, setPortrait] = useStateA(false);

  useEffectA(() => {
    function onResize() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const minSide = Math.min(vw, vh);
      const maxSide = Math.max(vw, vh);

      let m = "desktop";
      if (maxSide < 820) m = "mobile";
      else if (minSide < 820) m = "tablet";

      const isPortrait = vh > vw;
      setMode(m);
      setPortrait(isPortrait);

      const s = Math.min(vw / W, vh / H);
      setScale(Math.max(s, 0.15));
    }
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const showRotateHint = mode === "mobile" && portrait;

  return (
    <div style={{
      width: "100vw", height: "100vh",
      overflow: "hidden",
      position: "fixed", inset: 0,
      background: variant === "chalkboard" ? "#0b3a2d" : "#050214",
    }}>
      {/* Fondo cósmico/pizarra al viewport completo — los glifos matemáticos
          flotan sobre toda la pantalla y se ven uniformes en cualquier resolución. */}
      <CosmosBg variant={variant} />

      {/* Lienzo lógico 900×540 centrado y escalado */}
      <div style={{
        position: "absolute", inset: 0,
        display: "grid", placeItems: "center",
      }}>
        <div style={{
          width: W, height: H,
          transform: `scale(${scale})`, transformOrigin: "center center",
          position: "relative",
          overflow: "hidden",
        }}>
          {children}
        </div>
      </div>

      {showRotateHint && <RotateHint />}
    </div>
  );
}

// Hint discreto de rotación — no bloquea el contenido, solo sugiere girar.
// Aparece solo en móvil portrait. Se puede ocultar tocándolo.
function RotateHint() {
  const [hidden, setHidden] = useStateA(false);
  if (hidden) return null;
  return (
    <button
      onClick={() => setHidden(true)}
      style={{
        position: "fixed", left: "50%", bottom: 14, transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(10,6,35,0.85)",
        border: "1px solid rgba(242,194,96,0.4)",
        borderRadius: 999, padding: "8px 14px",
        color: "#fce9a8",
        fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 13,
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
      }}
      aria-label="Gira tu dispositivo para ver mejor"
    >
      <span style={{ display: "inline-block", animation: "ed-rotate-hint 2.4s ease-in-out infinite" }}>↻</span>
      Gira tu dispositivo
      <style>{`
        @keyframes ed-rotate-hint {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(90deg); }
        }
      `}</style>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// App principal
// ─────────────────────────────────────────────────────────────
function App() {
  const [route, setRoute] = useStateA("home");
  const [app, setApp] = useStateA({
    studentName: "",
    character: "mago",
    level: "basic",
    stars: 48,
    sessionStart: Date.now(),
    gameSeed: 0,
  });

  function go(r) {
    // Al (re)entrar al juego, regeneramos la seed para que GameScreen se remonte
    // y reinicie ronda, tiempo, racha, etc.
    if (r === "game") {
      setApp((s) => ({ ...s, gameSeed: (s.gameSeed || 0) + 1 }));
    }
    setRoute(r);
  }

  const screenProps = { app, setApp, go };

  let Screen = window.HomeScreen;
  if (route === "character") Screen = window.CharacterScreen;
  else if (route === "game") Screen = window.GameScreen;
  else if (route === "results") Screen = window.ResultsScreen;

  const variant = route === "game" ? "chalkboard" : "cosmic";

  return (
    <DeviceStage variant={variant}>
      <Screen key={route === "game" ? `game-${app.gameSeed}` : route} {...screenProps} />
    </DeviceStage>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
