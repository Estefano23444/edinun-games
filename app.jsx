// app.jsx — Shell de producción EDINUN GAMES.
// Enrutador por estado y device stage adaptativo (desktop / tablet / mobile).
// Móvil portrait: el contenido NUNCA rota; un overlay BLOQUEANTE obliga
// al usuario a girar físicamente el teléfono antes de poder usar la app.

const { useState: useStateA, useEffect: useEffectA } = React;

// ─────────────────────────────────────────────────────────────
// useViewportSize — devuelve el tamaño REAL visible del viewport.
//
// En iOS Safari (y otros mobile browsers), `window.innerHeight` y `100vh`
// reportan la altura de la ventana INCLUYENDO la URL bar, así que el
// contenido escalado a esa altura termina parcialmente fuera de pantalla
// (ej: el numpad del juego queda debajo del fondo visible). La Visual
// Viewport API reporta el área verdaderamente visible y se actualiza
// cuando la URL bar se muestra/oculta.
// ─────────────────────────────────────────────────────────────
function useViewportSize() {
  const [size, setSize] = useStateA(() => readSize());
  useEffectA(() => {
    function onChange() { setSize(readSize()); }
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onChange);
      window.visualViewport.addEventListener("scroll", onChange);
    }
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onChange);
        window.visualViewport.removeEventListener("scroll", onChange);
      }
    };
  }, []);
  return size;
}
function readSize() {
  const vv = (typeof window !== "undefined") ? window.visualViewport : null;
  const vw = vv ? vv.width : window.innerWidth;
  const vh = vv ? vv.height : window.innerHeight;
  return { vw, vh };
}

// ─────────────────────────────────────────────────────────────
// DeviceStage — escala el lienzo lógico 900×540 (paisaje) al viewport.
//
// Reglas:
//   · Desktop / tablet: sin marco, sin notch, fondo cósmico edge-to-edge.
//   · Mobile portrait: lienzo letterboxed Y overlay BLOQUEANTE "Gira el
//     teléfono". El contenido del juego no es accesible hasta que rote.
//   · Mobile landscape: lienzo escalado al viewport visible (visualViewport,
//     no innerHeight, para no clippearse debajo de la URL bar de iOS).
// ─────────────────────────────────────────────────────────────
function DeviceStage({ children, variant = "cosmic" }) {
  const W = 900, H = 540;
  const { vw, vh } = useViewportSize();
  const minSide = Math.min(vw, vh);
  const maxSide = Math.max(vw, vh);
  let mode = "desktop";
  if (maxSide < 820) mode = "mobile";
  else if (minSide < 820) mode = "tablet";
  const portrait = vh > vw;
  const scale = Math.max(Math.min(vw / W, vh / H), 0.15);

  // Detección de teléfono independiente del modo: cualquier dispositivo con
  // lado menor ≤ 500 CSS-px es un teléfono (incluye Pro Max, Plus, Pixel XL,
  // etc.). Tablets en portrait (iPad ~768 ancho) NO entran — son usables
  // letterboxed. Solo se bloquea rotación cuando es teléfono Y está en
  // portrait — el lienzo paisaje queda tan chico que no se puede jugar.
  const isPhone = minSide <= 500;
  const lockPortrait = isPhone && portrait;

  return (
    <div style={{
      width: "100vw", height: "100dvh",
      minHeight: "-webkit-fill-available",
      overflow: "hidden",
      position: "fixed", inset: 0,
      background: variant === "chalkboard" ? "#0b3a2d" : "#050214",
    }}>
      <CosmosBg variant={variant} />

      {/* Lienzo lógico 900×540 centrado y escalado.
          Posicionamos absoluto con left/top 50% + translate(-50%, -50%) ANTES
          de la escala, para que el centro visual coincida con el centro
          del viewport sin importar la relación entre tamaños. */}
      <div style={{
        width: W, height: H,
        position: "absolute",
        left: "50%", top: "50%",
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center center",
        overflow: "hidden",
      }}>
        {children}
      </div>

      {lockPortrait && <RotateLockOverlay />}
    </div>
  );
}

// Overlay bloqueante de rotación. En mobile portrait cubre toda la pantalla
// con un mensaje claro y un ícono animado. NO se puede descartar — el usuario
// DEBE girar el dispositivo para acceder al juego. Se desmonta solo cuando
// el viewport pasa a landscape.
function RotateLockOverlay() {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gira tu teléfono para jugar"
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "linear-gradient(180deg,#050214 0%,#0a0628 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "32px 24px",
        color: "#fce9a8",
        fontFamily: "var(--ed-font-display, system-ui)",
      }}
    >
      <div
        style={{
          width: 132, height: 132, marginBottom: 28,
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "ed-rotate-lock 2.4s ease-in-out infinite",
        }}
        aria-hidden="true"
      >
        {/* Ícono de teléfono que rota */}
        <svg viewBox="0 0 100 100" width="120" height="120" fill="none">
          <rect x="36" y="14" width="28" height="72" rx="6"
                stroke="#f2c260" strokeWidth="3" fill="rgba(242,194,96,0.08)" />
          <rect x="42" y="22" width="16" height="48" rx="2" fill="rgba(242,194,96,0.18)" />
          <circle cx="50" cy="78" r="2.5" fill="#f2c260" />
        </svg>
      </div>
      <div style={{
        fontWeight: 800,
        fontSize: "clamp(18px, 5.2vw, 26px)",
        lineHeight: 1.15,
        textTransform: "uppercase", letterSpacing: "0.02em",
        marginBottom: 12,
      }}>
        Gira tu teléfono
      </div>
      <div style={{
        fontWeight: 500,
        fontSize: "clamp(13px, 4vw, 16px)",
        lineHeight: 1.4,
        color: "rgba(252,233,168,0.78)",
        maxWidth: "min(320px, 80vw)",
      }}>
        Pon tu teléfono de lado para jugar.
      </div>
      <style>{`
        @keyframes ed-rotate-lock {
          0%   { transform: rotate(0deg); }
          45%  { transform: rotate(0deg); }
          70%  { transform: rotate(-90deg); }
          100% { transform: rotate(-90deg); }
        }
      `}</style>
    </div>
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
    stars: 0,
    sessionStart: Date.now(),
    gameSeed: 0,
  });

  function go(r) {
    // Al (re)entrar al juego, regeneramos la seed para que GameScreen se remonte
    // y reinicie ronda, tiempo, racha, etc. También reseteamos las estrellas:
    // cada partida empieza desde 0, no acumula entre rondas.
    if (r === "game") {
      setApp((s) => ({ ...s, gameSeed: (s.gameSeed || 0) + 1, stars: 0 }));
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
