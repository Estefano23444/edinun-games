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
// Detección de "resize REAL" vs "zoom del navegador".
//
// Idea: el tamaño FÍSICO de la zona visible en píxeles del display es
// invariante al ctrl+rueda. Cuando subes el zoom de 100 % a 500 %:
//   · innerWidth en CSS-px se divide entre 5
//   · devicePixelRatio se multiplica por 5
//   · innerWidth × devicePixelRatio queda igual ⇒ NO hubo resize real.
//
// Cuando arrastras la esquina de la ventana o rotas el dispositivo:
//   · innerWidth en CSS-px cambia
//   · devicePixelRatio NO cambia
//   · innerWidth × devicePixelRatio cambia ⇒ SÍ hubo resize real.
//
// Por eso comparamos contra `innerWidth × devicePixelRatio` y solo
// actualizamos el state cuando ese producto cambia. Así el lienzo se
// queda con su tamaño CSS previo durante el zoom y el navegador lo
// amplifica visualmente — junto con los glifos, que ya leen `glyphSize`
// del mismo state defendido (ver DeviceStage).
//
// La defensa anterior (tracker de _lastDPR) era frágil: se actualizaba
// en CADA evento, así que si el navegador disparaba dos resize seguidos
// para la misma acción de zoom, el segundo veía el dpr ya guardado y
// recalculaba el tamaño con el viewport pequeño. Esto causaba que los
// glifos quedaran enormes mientras el lienzo se recomprimía.
function physicalSize() {
  if (typeof window === "undefined") return { w: 0, h: 0 };
  const dpr = window.devicePixelRatio || 1;
  return { w: window.innerWidth * dpr, h: window.innerHeight * dpr };
}
let _lastPhysical = physicalSize();

function useViewportSize() {
  const [size, setSize] = useStateA(() => readSize());
  useEffectA(() => {
    function onChange() {
      const phys = physicalSize();
      // Tolerancia de 4 px reales para absorber redondeos del navegador.
      if (Math.abs(phys.w - _lastPhysical.w) < 4 && Math.abs(phys.h - _lastPhysical.h) < 4) {
        // Mismo display, distinto zoom — no actualizamos el state.
        return;
      }
      _lastPhysical = phys;
      setSize(readSize());
    }
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onChange);
    }
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onChange);
      }
    };
  }, []);
  return size;
}
function readSize() {
  if (typeof window === "undefined") return { vw: 0, vh: 0 };
  const vv = window.visualViewport;
  // Cuando el usuario hace pinch-zoom, vv.scale > 1 y vv.width/height
  // reflejan la región visible (más pequeña). Usar esos valores haría
  // que la escala del lienzo se reduzca al hacer zoom — exactamente lo
  // contrario de lo que el usuario quiere. Solo confiamos en vv cuando
  // scale ≈ 1 (sin zoom) — ahí da una lectura más fiel que innerWidth/
  // Height en iOS Safari (descuenta correctamente la URL bar visible).
  if (vv && Math.abs(vv.scale - 1) < 0.05) {
    return { vw: vv.width, vh: vv.height };
  }
  return { vw: window.innerWidth, vh: window.innerHeight };
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
  // lado menor ≤ 600 CSS-px es un teléfono. Cubre todos los teléfonos
  // actuales (iPhone SE 320 → S25 Ultra/Pro Max ~432) con margen para
  // modelos futuros más anchos. La menor tablet (iPad mini 744) queda
  // bien por encima, así que no se rompe el caso "tablet portrait usable
  // letterboxed". Solo bloqueamos cuando teléfono Y portrait — el lienzo
  // paisaje queda demasiado pequeño para jugar.
  const isPhone = minSide <= 600;
  const lockPortrait = isPhone && portrait;

  // Tamaño de los glifos del fondo: equivalente al `clamp(48px, 7vmin, 110px)`
  // que tenía el CSS, pero calculado a partir del vw/vh DEFENDIDO contra
  // cambios de DPR. Esto evita que con ctrl+rueda del mouse los glifos
  // crezcan más rápido que el lienzo (el lienzo se congela vía la defensa
  // del DPR; si CSS lee el vmin actual, los glifos no se congelan y desync).
  const glyphSize = Math.max(48, Math.min(minSide * 0.07, 110));

  // Debug: añadir #debug a la URL para ver lo que el navegador del
  // dispositivo está leyendo en tiempo real (vw, vh, mode, lockPortrait).
  // Útil para entender por qué no se dispara el overlay en un dispositivo
  // específico. Sin #debug, no se renderiza nada.
  const debug = typeof window !== "undefined" && /(?:^|[#&])debug(?:&|$)/.test(window.location.hash || "");

  return (
    // Wrapper en `position: relative`, NO `fixed`. iOS Safari maneja
    // pésimamente el pinch-zoom sobre elementos `position: fixed`: el
    // elemento queda anclado al layout viewport mientras el usuario panea
    // el visual viewport, así que el contenido se "desliza" respecto al
    // gesto y se siente inestable. Con `relative` el elemento fluye en el
    // documento normal y la zoom del visual viewport amplifica todo de
    // forma uniforme. Mantiene el efecto de "cubrir el viewport" porque
    // ya lo dimensionamos con 100vw × 100dvh.
    <div style={{
      width: "100vw", height: "100dvh",
      minHeight: "-webkit-fill-available",
      overflow: "hidden",
      position: "relative",
      background: variant === "chalkboard" ? "#0b3a2d" : "#050214",
    }}>
      <CosmosBg variant={variant} glyphSize={glyphSize} />

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
      {debug && (
        <div style={{
          position: "fixed", top: 6, left: 6, zIndex: 999999,
          background: "rgba(0,0,0,0.85)", color: "#0f0",
          font: "11px ui-monospace,Menlo,monospace",
          padding: "6px 8px", borderRadius: 6,
          maxWidth: "90vw", whiteSpace: "pre",
          pointerEvents: "none",
        }}>
{`vw=${vw} vh=${vh}
min=${minSide} max=${maxSide}
mode=${mode} portrait=${portrait}
isPhone=${isPhone} LOCK=${lockPortrait}
vv=${typeof window!=="undefined" && window.visualViewport ? "yes" : "no"}
ua=${(typeof navigator!=="undefined" ? navigator.userAgent : "?").slice(0,60)}`}
        </div>
      )}
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
