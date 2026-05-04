// game-screens.jsx — Juego (plano cartesiano), resultados, perfil.

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

// Portal a <body> para sacar overlays/modales del scope del DeviceStage,
// que aplica `transform: scale()` al lienzo 900×540. Sin esto, un
// `position: fixed` o `absolute` con `inset: 0` solo cubre el área del
// lienzo escalado y deja los laterales del letterboxing sin oscurecer.
function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Generador de problemas para Plano cartesiano (1 nivel único, cuadrante I,
// coordenadas 0..6). Excluye el origen (0,0) para que siempre haya un
// movimiento que hacer.
// ─────────────────────────────────────────────────────────────
const GRID_MAX = 6; // coordenadas en 0..GRID_MAX (rejilla 7×7)

function makeProblem(cat) {
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  let x = 0, y = 0;
  while (x === 0 && y === 0) {
    x = rand(0, GRID_MAX);
    y = rand(0, GRID_MAX);
  }
  return { mode: "tesoro", x, y };
}

// ─────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO — plano cartesiano "tesoro"
// ─────────────────────────────────────────────────────────────
const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "Los números no muerden 🔢",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Las matemáticas son una aventura.",
  "¡Vamos al siguiente reto!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// CartesianGrid — rejilla 7×7 con ejes X e Y rotulados, tesoro en la
// celda objetivo y avatar arrastrable del personaje. Drag-and-drop +
// tap para colocar. La rejilla se renderiza en coordenadas SVG-like:
// (0,0) es la esquina inferior izquierda; X crece hacia la derecha,
// Y crece hacia arriba (convención matemática).
// ─────────────────────────────────────────────────────────────
function CartesianGrid({ problem, avatar, char, feedback, errorCell }) {
  // Convención de plano cartesiano: los puntos son las INTERSECCIONES de
  // las líneas, no el centro de las celdas. Por eso:
  //  - Las líneas de la rejilla pasan en x = 0, 1, 2, ..., GRID_MAX (en
  //    coordenadas lógicas) y se dibujan en CSS pixel cellLeft(x).
  //  - Las etiquetas de los ejes se centran SOBRE cada línea (no en el
  //    medio de la celda).
  //  - El avatar y el tesoro se centran sobre la intersección (x, y).
  const cells = GRID_MAX + 1;       // 0..6 → 7 líneas (no celdas)
  const step = 44;                   // separación entre líneas en px
  const axisPad = 32;                // espacio para etiquetas de los ejes
  const tipPad  = 50;                // espacio extra al final de cada eje (flecha + letra),
                                     // suficiente para que la "Y" quede separada de la flecha rosa
  const gridW = (cells - 1) * step;  // ancho real entre línea 0 y GRID_MAX
  const gridH = (cells - 1) * step;
  const totalW = axisPad + gridW + tipPad;
  const totalH = tipPad + gridH + axisPad;

  // Coordenada lógica → posición CSS de la línea correspondiente.
  function cellLeft(x) { return axisPad + x * step; }
  function cellTop(y)  { return tipPad + (GRID_MAX - y) * step; }

  // Tamaño del avatar y del tesoro, en px.
  const avatarSize = 32;
  const treasureSize = 28;

  return (
    <div style={{
      position: "relative",
      width: totalW, height: totalH,
      margin: "0 auto",
      userSelect: "none",
    }}>
      {/* Eje Y — etiquetas 0..GRID_MAX centradas SOBRE cada línea horizontal */}
      {Array.from({ length: cells }).map((_, i) => {
        const v = i;
        return (
          <div key={`y${v}`} style={{
            position: "absolute",
            left: 0, top: cellTop(v) - 11,
            width: axisPad - 6, height: 22,
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            paddingRight: 6,
            fontFamily: "var(--ed-font-mono)", fontWeight: 700, fontSize: 14,
            color: "#fce9a8",
          }}>{v}</div>
        );
      })}
      {/* Eje X — etiquetas 0..GRID_MAX centradas SOBRE cada línea vertical */}
      {Array.from({ length: cells }).map((_, i) => {
        const v = i;
        return (
          <div key={`x${v}`} style={{
            position: "absolute",
            left: cellLeft(v) - 12, top: cellTop(0) + 8,
            width: 24, height: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--ed-font-mono)", fontWeight: 700, fontSize: 14,
            color: "#fce9a8",
          }}>{v}</div>
        );
      })}

      {/* Letras grandes de los ejes — al final de cada flecha. */}
      {/* X grande a la derecha del eje X */}
      <div style={{
        position: "absolute",
        left: cellLeft(GRID_MAX) + 14, top: cellTop(0) - 4,
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22,
        color: "#4fd8ff",
        textShadow: "0 0 10px rgba(79,216,255,0.65), 0 2px 4px rgba(0,0,0,0.5)",
        letterSpacing: "0.04em",
      }}>X</div>
      {/* Y grande arriba del eje Y — separada de la flecha rosa por unos
          px verticales para que no se mezclen visualmente. */}
      <div style={{
        position: "absolute",
        left: cellLeft(0) - 8, top: cellTop(GRID_MAX) - 46,
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22,
        color: "#ff79c6",
        textShadow: "0 0 10px rgba(255,121,198,0.65), 0 2px 4px rgba(0,0,0,0.5)",
        letterSpacing: "0.04em",
        lineHeight: 1,
      }}>Y</div>

      {/* Líneas verticales de la rejilla. La línea x=0 (eje Y, a la
          IZQUIERDA) se resalta blanca. */}
      {Array.from({ length: cells }).map((_, i) => {
        const isAxisY = i === 0;
        return (
          <div key={`vline${i}`} style={{
            position: "absolute",
            left: cellLeft(i) - (isAxisY ? 1.5 : 1), top: cellTop(GRID_MAX),
            width: isAxisY ? 3 : 2, height: gridH,
            background: isAxisY ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.18)",
            boxShadow: isAxisY ? "0 0 10px rgba(255,255,255,0.6)" : "none",
            pointerEvents: "none",
          }} />
        );
      })}
      {/* Líneas horizontales de la rejilla. La línea y=0 (eje X, ABAJO) se
          resalta blanca. `i` recorre las coordenadas Y de las líneas; la
          línea de abajo es la de y=0, no la de y=GRID_MAX. */}
      {Array.from({ length: cells }).map((_, i) => {
        const isAxisX = i === 0;
        return (
          <div key={`hline${i}`} style={{
            position: "absolute",
            left: cellLeft(0), top: cellTop(i) - (isAxisX ? 1.5 : 1),
            width: gridW, height: isAxisX ? 3 : 2,
            background: isAxisX ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.18)",
            boxShadow: isAxisX ? "0 0 10px rgba(255,255,255,0.6)" : "none",
            pointerEvents: "none",
          }} />
        );
      })}

      {/* Flecha X — punta del eje horizontal hacia la derecha */}
      <div style={{
        position: "absolute",
        left: cellLeft(GRID_MAX) + 2, top: cellTop(0) - 8,
        width: 0, height: 0,
        borderTop: "8px solid transparent",
        borderBottom: "8px solid transparent",
        borderLeft: "12px solid #4fd8ff",
        filter: "drop-shadow(0 0 4px rgba(79,216,255,0.65))",
        pointerEvents: "none",
      }} />
      {/* Flecha Y — punta del eje vertical hacia arriba */}
      <div style={{
        position: "absolute",
        left: cellLeft(0) - 8, top: cellTop(GRID_MAX) - 14,
        width: 0, height: 0,
        borderLeft: "8px solid transparent",
        borderRight: "8px solid transparent",
        borderBottom: "12px solid #ff79c6",
        filter: "drop-shadow(0 0 4px rgba(255,121,198,0.65))",
        pointerEvents: "none",
      }} />

      {/* Tesoro 🏆 — centrado sobre la intersección (problem.x, problem.y).
          El "punto" del plano cartesiano es la intersección de líneas, no
          el centro de una celda. */}
      <div style={{
        position: "absolute",
        left: cellLeft(problem.x) - treasureSize / 2,
        top:  cellTop(problem.y) - treasureSize / 2,
        width: treasureSize, height: treasureSize,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: treasureSize, pointerEvents: "none",
        filter: "drop-shadow(0 0 10px rgba(252,233,168,0.95))",
        zIndex: 4,
      }}>🏆</div>

      {/* Feedback rojo — círculo en la intersección donde el estudiante se
          equivocó (cuando errorCell está activo, durante 1200 ms). */}
      {errorCell && (
        <div style={{
          position: "absolute",
          left: cellLeft(errorCell.x) - 18,
          top:  cellTop(errorCell.y) - 18,
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,107,107,0.4)",
          boxShadow: "0 0 14px rgba(255,107,107,0.75)",
          pointerEvents: "none",
          zIndex: 3,
        }} />
      )}

      {/* Avatar del personaje — centrado sobre la intersección (avatar.x,
          avatar.y). El movimiento es exclusivamente por los botones
          direccionales de GameScreen. */}
      <div
        style={{
          position: "absolute",
          left: cellLeft(avatar.x) - avatarSize / 2,
          top:  cellTop(avatar.y) - avatarSize / 2,
          width: avatarSize, height: avatarSize,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
          transition: "left 0.25s ease, top 0.25s ease",
          zIndex: 5,
          filter: feedback === "ok" ? "drop-shadow(0 0 14px rgba(46,204,143,0.95))"
                : feedback === "err" ? "drop-shadow(0 0 14px rgba(255,107,107,0.9))"
                : "drop-shadow(0 0 10px rgba(79,216,255,0.65))",
        }}
      >
        <char.Component size={avatarSize} floating={false} />
      </div>
    </div>
  );
}

function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "tesoro";
  const catLabel = app.currentCatLabel || "Plano cartesiano";

  const [problem, setProblem] = useStateG(() => makeProblem(cat));
  const [avatar, setAvatar] = useStateG({ x: 0, y: 0 });
  const [errorCell, setErrorCell] = useStateG(null);
  // Sin fases: el estudiante puede mover el avatar en cualquier orden
  // (X→Y, Y→X, alternado). El bocadillo del personaje sugiere "primero
  // X, después Y" como guía pedagógica, pero no se fuerza por código.
  const [elapsed, setElapsed] = useStateG(0);
  // Estrellas SIEMPRE empiezan en 0 al iniciar una partida — no acumulan
  // entre rondas (regla pedida por el usuario).
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [log, setLog] = useStateG([]);

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // Cronómetro total
  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  function reset() {
    setAvatar({ x: 0, y: 0 });
  }

  // Mueve el avatar UNA celda en la dirección indicada. Se bloquea sólo en
  // los bordes del plano (no permite x<0, y<0, x>GRID_MAX, y>GRID_MAX).
  // No hay restricción de orden — el estudiante elige cómo moverse.
  function move(dx, dy) {
    setAvatar((prev) => {
      const nx = Math.max(0, Math.min(GRID_MAX, prev.x + dx));
      const ny = Math.max(0, Math.min(GRID_MAX, prev.y + dy));
      return { x: nx, y: ny };
    });
  }

  function verify() {
    // Si el avatar sigue en (0,0) y el objetivo no es (0,0), pedir que se mueva
    // sin consumir intento (paralelo a "Completa todos los casilleros" en CDU).
    if (avatar.x === 0 && avatar.y === 0 && (problem.x !== 0 || problem.y !== 0)) {
      setFeedback("err");
      setFeedbackMsg("Mueve a tu personaje primero");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    const isCorrect = avatar.x === problem.x && avatar.y === problem.y;
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    // Estrellas por ejercicio: máximo 10, decrece con el tiempo.
    const earned = isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;

    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsSession = starsSession + earned;
    const newStarsTotal = stars + earned;

    const entry = {
      idx: newAttempted,
      mode: "tesoro",
      a: problem.x,
      b: problem.y,
      op: "→",
      correctAnswer: `(${problem.x}, ${problem.y})`,
      userAnswer: `(${avatar.x}, ${avatar.y})`,
      isCorrect,
      time: exerciseSec,
      earned,
    };
    const newLog = [...log, entry];

    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect
      ? `+${earned} ⭐`
      : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]
    );
    if (!isCorrect) setErrorCell({ x: avatar.x, y: avatar.y });
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 950 : 1200;
    setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
      setErrorCell(null);
      setAvatar({ x: 0, y: 0 });
      if (newAttempted >= 3) {
        setApp((s) => ({
          ...s,
          stars: newStarsTotal,
          lastResult: {
            category: catLabel,
            solved: newSolved,
            total: 3,
            time: elapsed,
            starsEarned: newStarsSession,
            log: newLog,
          },
        }));
        window.incrementGamesCompleted && window.incrementGamesCompleted();
        go("results");
      } else {
        setProblem(makeProblem(cat));
        exerciseStart.current = Date.now();
      }
    }, wait);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>

      {/* Top HUD — sin tabs de nivel (este juego es de un solo nivel).
          Se conserva el logo a la izq y cronómetro + estrellas a la der. */}
      <div data-qa="hud" style={{ position: "absolute", top: 10, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <EdinunLogoMini size={64} />
        </div>

        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
          color: "rgba(255,255,255,0.85)",
          letterSpacing: "0.04em",
          background: "rgba(255,255,255,0.12)",
          padding: "5px 14px", borderRadius: 999,
          border: "2px solid rgba(255,255,255,0.18)",
          whiteSpace: "nowrap",
        }}>
          {catLabel.toUpperCase()}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0,0,0,0.35)", borderRadius: 999, padding: "6px 12px",
            border: "1px solid rgba(242,194,96,0.4)", fontFamily: "var(--ed-font-mono)", fontSize: 13, color: "#fce9a8",
          }}>
            ⏱ {formatTime(elapsed)}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(0,0,0,0.35)", borderRadius: 999, padding: "6px 12px",
            border: "1px solid rgba(242,194,96,0.4)", fontFamily: "var(--ed-font-display)", fontWeight: 600, color: "#fce9a8",
          }}>
            ⭐ {stars}
          </div>
        </div>
      </div>

      {/* Bocadillo de pista — posicionado JUSTO ARRIBA del personaje (bottom
          relativo al lienzo) para que se lea como un pensamiento del propio
          personaje, no como un cartel suelto. */}
      <div data-qa="bocadillo" style={{
        position: "absolute", left: 14, bottom: 230, width: 215,
        pointerEvents: "none",
      }}>
        <div style={{
          position: "relative",
          background: "linear-gradient(180deg, rgba(20,12,55,0.92), rgba(10,6,35,0.92))",
          border: "1.5px solid rgba(242,194,96,0.55)",
          borderRadius: 16,
          padding: "12px 14px",
          fontFamily: "var(--ed-font-display)",
          fontWeight: 700, fontSize: 15, lineHeight: 1.3,
          color: "#fce9a8", textAlign: "center",
          boxShadow: "0 8px 22px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}>
          Primero cuenta en el eje X, después en el eje Y.
          <div style={{
            position: "absolute", bottom: -8, left: "50%", marginLeft: -7,
            width: 0, height: 0,
            borderLeft: "7px solid transparent",
            borderRight: "7px solid transparent",
            borderTop: "8px solid rgba(20,12,55,0.92)",
            filter: "drop-shadow(0 1px 0 rgba(242,194,96,0.55))",
          }} />
        </div>
      </div>

      {/* Personaje compañero — esquina inferior izquierda. */}
      <div data-qa="personaje" style={{
        position: "absolute", left: 8, bottom: 30, width: 220,
        pointerEvents: "none", textAlign: "center",
      }}>
        <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
          <div style={{
            position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: 150, height: 18, borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(242,194,96,0.45), transparent 70%)",
            filter: "blur(5px)",
          }} />
          <char.Component size={180} floating />
        </div>
        <div style={{
          marginTop: -4,
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
          color: "#fce9a8", letterSpacing: "0.04em",
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}>{char.name}</div>
      </div>

      {/* Racha / progreso — separado del HUD para coincidir con el resto del repo */}
      <div style={{
        position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span className="ed-label" style={{ color: "rgba(255,255,255,0.7)" }}>Ronda</span>
        {[0,1,2].map((i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: "50%",
            background: i < attempted ? (i < solved ? "#fce9a8" : "#ff6b6b") : "rgba(255,255,255,0.2)",
            boxShadow: i < attempted ? "0 0 10px currentColor" : "none",
            color: i < solved ? "#fce9a8" : "#ff6b6b",
          }} />
        ))}
      </div>

      {/* Instrucción del ejercicio — un solo elemento absoluto arriba,
          igual que en operaciones-avanzadas para mantener la estética
          del repo. Personaliza con el nombre del personaje y las coords. */}
      <div style={{
        position: "absolute", top: 92, left: "50%", transform: "translateX(-50%)",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 22, lineHeight: 1.15,
        color: "#fff",
        textShadow: "0 2px 6px rgba(0,0,0,0.45)",
        whiteSpace: "nowrap",
      }}>
        ¡Pon a {char.name} en (<span style={{ color: "#fce9a8" }}>{problem.x}</span>, <span style={{ color: "#fce9a8" }}>{problem.y}</span>)!
      </div>

      {/* Plano cartesiano protagonista — centrado en la zona disponible.
          Subo a top: 110 para dejar margen para la fila de botones
          direccionales (la rejilla creció en alto al agregar tipPad=50
          arriba para que la Y quede separada de la flecha rosa). */}
      <div data-qa="zona-central" style={{
        position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)",
        textAlign: "center",
      }}>
        <CartesianGrid
          problem={problem}
          avatar={avatar}
          setAvatar={setAvatar}
          char={char}
          feedback={feedback}
          errorCell={errorCell}
        />
      </div>

      {/* Botones direccionales — fila horizontal debajo de la rejilla.
          El estudiante puede mover en cualquier orden (X→Y, Y→X o
          alternado). Los botones sólo se deshabilitan al chocar con un
          borde del plano. Color del borde alineado con el color del eje:
          cian (X) para ←/→ y rosa (Y) para ↑/↓. */}
      <div data-qa="bandeja" style={{
        position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 12, alignItems: "center",
      }}>
        {[
          { label: "←", dx: -1, dy:  0, disabled: avatar.x <= 0,        color: "#4fd8ff" },
          { label: "→", dx:  1, dy:  0, disabled: avatar.x >= GRID_MAX, color: "#4fd8ff" },
          { label: "↑", dx:  0, dy:  1, disabled: avatar.y >= GRID_MAX, color: "#ff79c6" },
          { label: "↓", dx:  0, dy: -1, disabled: avatar.y <= 0,        color: "#ff79c6" },
        ].map((b) => (
          <button
            key={b.label}
            onClick={() => move(b.dx, b.dy)}
            disabled={b.disabled}
            className="ed-numpad-key"
            style={{
              width: 64, height: 64, fontSize: 38,
              borderColor: b.disabled ? "rgba(255,255,255,0.2)" : b.color,
              borderWidth: 3, borderStyle: "solid",
              opacity: b.disabled ? 0.32 : 1,
              cursor: b.disabled ? "not-allowed" : "pointer",
              fontWeight: 900,
              color: b.disabled ? "rgba(80,40,10,0.45)" : "#1a0e3a",
              textShadow: b.disabled ? "none" : `0 0 6px ${b.color}99`,
              lineHeight: 1,
            }}
            title={b.disabled ? "No puedes ir más allá del borde" : `Mover ${b.label}`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Botones de acción — columna derecha, centrados verticalmente. */}
      <div data-qa="acciones" style={{
        position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 12, width: 150,
      }}>
        <button
          className="ed-btn ed-btn-verify"
          onClick={verify}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          ¡VERIFICAR!
        </button>
        <button
          className="ed-btn ed-btn-erase"
          onClick={reset}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          REINICIAR
        </button>
        <button
          className="ed-btn ed-btn-ghost"
          onClick={() => setConfirmingExit(true)}
          title="Salir al inicio"
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          SALIR
        </button>
      </div>

      {/* Feedback overlay — vía Portal para cubrir todo el viewport */}
      {feedback && (
        <PortalToBody>
          <div style={{
            position: "fixed", inset: 0, zIndex: 1000,
            pointerEvents: "none",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 14,
            background: "rgba(0,0,0,0.62)",
            backdropFilter: "blur(3px)",
            animation: "ed-pop-in 0.3s",
          }}>
            <div style={{
              fontFamily: "'Fredoka','Baloo 2',system-ui,sans-serif",
              fontWeight: 700, fontSize: "clamp(60px, 11vmin, 120px)",
              color: feedback === "ok" ? "#2ecc8f" : "#ff6b6b",
              textShadow: "0 4px 0 rgba(0,0,0,0.45), 0 0 60px currentColor",
            }}>
              {feedback === "ok" ? "¡EXCELENTE!" : "¡UPS!"}
            </div>
            {feedbackMsg && (
              <div style={{
                fontFamily: "'Fredoka','Baloo 2',system-ui,sans-serif",
                fontWeight: 700, fontSize: "clamp(18px, 2.6vmin, 30px)",
                color: feedback === "ok" ? "#fce9a8" : "#fff",
                background: "rgba(0,0,0,0.55)",
                padding: "8px 26px", borderRadius: 999,
                textShadow: "0 2px 6px rgba(0,0,0,0.6)",
                textAlign: "center", maxWidth: "80vw",
              }}>
                {feedback === "ok" ? feedbackMsg : `${feedbackMsg} — ${char.name}`}
              </div>
            )}
          </div>
        </PortalToBody>
      )}

      {/* Modal de confirmación de SALIR */}
      {confirmingExit && (
        <PortalToBody>
          <div
            onClick={() => setConfirmingExit(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.62)",
              backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "ed-pop-in 0.18s",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="ed-card"
              style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(255,107,107,0.3)" }}
            >
              <div className="ed-label" style={{ color: "#ff8b8b", marginBottom: 6 }}>
                Salir del juego
              </div>
              <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
                ¿Volver al inicio?
              </h2>
              <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
                Vas a perder el progreso de esta ronda ({attempted}/3 ejercicios). No habrá reporte de esta sesión.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingExit(false)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SEGUIR JUGANDO
                </button>
                <button className="ed-btn ed-btn-primary" onClick={() => { setConfirmingExit(false); go("home"); }} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SÍ, SALIR
                </button>
              </div>
            </div>
          </div>
        </PortalToBody>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANTALLA DE RESULTADOS
// ─────────────────────────────────────────────────────────────
// Formatea una operación de ejercicio. En modo "tesoro" la "operación"
// es solo el par de coordenadas: "(3, 4)".
function formatOp(e) {
  if (e.mode === "tesoro") return `(${e.a}, ${e.b})`;
  return `${e.a} ${e.op} ${e.b}`;
}

const printStyles = {
  doc: { padding: 0, margin: 0, color: "#111", background: "#fff" },
  head: {
    display: "flex", alignItems: "center", gap: 14,
    borderBottom: "2px solid #d9a441",
    paddingBottom: 10, marginBottom: 14,
  },
  logo: { width: 56, height: 56, objectFit: "contain" },
  title: { flex: 1, minWidth: 0 },
  org: { fontFamily: "'Fredoka','Baloo 2','Nunito',sans-serif", fontWeight: 700, fontSize: "16pt", letterSpacing: "0.03em", lineHeight: 1.1, margin: 0 },
  sub: { fontSize: "9pt", color: "#555", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 },
  date: { fontFamily: "ui-monospace,Consolas,monospace", fontSize: "10pt", color: "#555", textAlign: "right", whiteSpace: "nowrap" },
  fields: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 },
  field: { padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd" },
  fieldL: { fontSize: "8pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#666" },
  fieldV: { fontSize: "12pt", fontWeight: 700, marginTop: 2 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "11pt" },
  thHead: { borderBottom: "2px solid #111" },
  th: { padding: 8, textAlign: "left", fontSize: "9pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#555", fontWeight: 700 },
  thR: { textAlign: "right" },
  thC: { textAlign: "center" },
  tr: { borderBottom: "1px solid #ccc" },
  td: { padding: "9px 8px", fontFamily: "ui-monospace,Consolas,monospace" },
  tdNum: { color: "#888", width: 36 },
  tdOp: { fontWeight: 700 },
  tdR: { textAlign: "right" },
  tdC: { textAlign: "center", fontFamily: "'Nunito',sans-serif", fontWeight: 700 },
  tdDim: { color: "#888" },
  tdOk: { color: "#1e8a5d" },
  tdErr: { color: "#c33b3b" },
  tdEmpty: { padding: 24, textAlign: "center", color: "#888", fontStyle: "italic" },
  summary: { marginTop: 16, borderTop: "2px solid #d9a441", paddingTop: 12,
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 },
  cell: { padding: 10, borderRadius: 6, border: "1px solid #ddd", textAlign: "center" },
  cellEmp: { background: "#faf3df", borderColor: "#d9a441" },
  cellL: { fontSize: "8pt", textTransform: "uppercase", letterSpacing: "0.08em", color: "#666" },
  cellV: { fontSize: "18pt", fontWeight: 800, marginTop: 4 },
  foot: { marginTop: 16, fontSize: "9pt", color: "#888", textAlign: "center" },
};

function PrintableReport({ studentName, res, dateStr, m, s, attemptedCount, totalEx, accuracy }) {
  const log = res.log || [];
  return (
    <PortalToBody>
      <div className="ed-print-doc" style={printStyles.doc} aria-hidden="true">
        <div style={printStyles.head}>
          <img src="assets/edinun-logo.png" alt="" style={printStyles.logo} />
          <div style={printStyles.title}>
            <h1 style={printStyles.org}>EDINUN — Ediciones Nacionales Unidas</h1>
            <div style={printStyles.sub}>Reporte académico · Juegos de Matemáticas</div>
          </div>
          <div style={printStyles.date}>{dateStr}</div>
        </div>

        <div style={printStyles.fields}>
          <div style={printStyles.field}>
            <div style={printStyles.fieldL}>Estudiante</div>
            <div style={printStyles.fieldV}>{studentName || "—"}</div>
          </div>
          <div style={printStyles.field}>
            <div style={printStyles.fieldL}>Categoría</div>
            <div style={printStyles.fieldV}>{res.category || "—"}</div>
          </div>
          <div style={printStyles.field}>
            <div style={printStyles.fieldL}>Tiempo total</div>
            <div style={printStyles.fieldV}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</div>
          </div>
        </div>

        <table style={printStyles.table}>
          <thead>
            <tr style={printStyles.thHead}>
              <th style={printStyles.th}>#</th>
              <th style={printStyles.th}>Coordenadas</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Respuesta del estudiante</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Coordenada correcta</th>
              <th style={{ ...printStyles.th, ...printStyles.thC }}>Estado</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {log.map((e) => (
              <tr key={e.idx} style={printStyles.tr}>
                <td style={{ ...printStyles.td, ...printStyles.tdNum }}>{e.idx}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{formatOp(e)}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{e.userAnswer}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{e.correctAnswer}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdC, ...(e.isCorrect ? printStyles.tdOk : printStyles.tdErr) }}>
                  {e.isCorrect ? "Correcto" : "Incorrecto"}
                </td>
                <td style={{ ...printStyles.td, ...printStyles.tdR, ...printStyles.tdDim }}>{e.time}s</td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr><td colSpan={6} style={printStyles.tdEmpty}>No se registraron ejercicios en esta sesión.</td></tr>
            )}
          </tbody>
        </table>

        <div style={printStyles.summary}>
          <div style={printStyles.cell}>
            <div style={printStyles.cellL}>Ejercicios</div>
            <div style={printStyles.cellV}>{attemptedCount} / {totalEx}</div>
          </div>
          <div style={printStyles.cell}>
            <div style={printStyles.cellL}>Correctos</div>
            <div style={printStyles.cellV}>{res.solved}</div>
          </div>
          <div style={printStyles.cell}>
            <div style={printStyles.cellL}>Estrellas</div>
            <div style={printStyles.cellV}>{res.starsEarned}</div>
          </div>
          <div style={{ ...printStyles.cell, ...printStyles.cellEmp }}>
            <div style={printStyles.cellL}>Precisión total</div>
            <div style={printStyles.cellV}>{accuracy}%</div>
          </div>
        </div>

        <div style={printStyles.foot}>EDINUN GAMES · Reporte generado automáticamente</div>
      </div>
    </PortalToBody>
  );
}

function ResultsScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const res = app.lastResult || { category: "Plano cartesiano", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
  const m = Math.floor(res.time / 60), s = res.time % 60;
  const totalEx = res.total || 3;
  const attemptedCount = (res.log || []).length;
  const accuracy = attemptedCount > 0 ? Math.round((res.solved / attemptedCount) * 100) : 0;
  const dateStr = new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 14, left: 24, right: 24, display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
        <button className="ed-btn ed-btn-ghost" onClick={() => go("home")} style={{ padding: "8px 14px", fontWeight: 800, letterSpacing: "0.04em" }}>← VOLVER AL INICIO</button>
      </div>

      <div style={{
        position: "absolute", inset: "70px 32px 20px 32px",
        display: "grid", gridTemplateColumns: "0.85fr 1.4fr", gap: 24, alignItems: "stretch",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 36,
            background: "linear-gradient(180deg, #fce9a8, #d9a441)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            lineHeight: 1, marginBottom: 4,
          }}>
            {res.surrendered ? "Sesión terminada" : "¡Ronda completa!"}
          </div>
          <char.Component size={180} />
          <div className="ed-body" style={{ fontStyle: "italic", textAlign: "center", maxWidth: 240, fontSize: 13 }}>
            "{app.studentName}, lograste {res.solved} de {totalEx} ejercicios."
            <div style={{ marginTop: 4, color: "var(--ed-ink-soft)", fontSize: 12 }}>— {char.name}</div>
          </div>
        </div>

        <div className="ed-card" style={{ padding: 16, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            borderBottom: "2px solid rgba(242,194,96,0.45)",
            paddingBottom: 10, marginBottom: 12,
          }}>
            <EdinunLogoMini size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 18, letterSpacing: "0.04em", lineHeight: 1.1 }}>
                EDINUN — Ediciones Nacionales Unidas
              </div>
              <div style={{ fontFamily: "var(--ed-font-ui)", fontSize: 11, color: "var(--ed-ink-soft)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
                Reporte académico · Juegos de Matemáticas
              </div>
            </div>
            <div style={{ fontFamily: "var(--ed-font-mono)", fontSize: 11, color: "var(--ed-ink-dim)", textAlign: "right" }}>
              {dateStr}
            </div>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
            fontFamily: "var(--ed-font-ui)", fontSize: 12, marginBottom: 10,
          }}>
            <ReportField label="Estudiante" value={app.studentName || "—"} />
            <ReportField label="Categoría" value={res.category} />
            <ReportField label="Tiempo total" value={`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`} />
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: "auto", marginBottom: 10 }}>
            <table style={{
              width: "100%", borderCollapse: "collapse",
              fontFamily: "var(--ed-font-ui)", fontSize: 12,
            }}>
              <thead>
                <tr style={{
                  fontFamily: "var(--ed-font-ui)", fontWeight: 700, fontSize: 10,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: "var(--ed-ink-dim)",
                  borderBottom: "1px solid rgba(148,120,255,0.3)",
                }}>
                  <th style={{ textAlign: "left", padding: "6px 8px", width: 36 }}>#</th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Coordenadas</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Respuesta del estudiante</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Coordenada correcta</th>
                  <th style={{ textAlign: "center", padding: "6px 8px" }}>Estado</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Tiempo</th>
                </tr>
              </thead>
              <tbody style={{ fontFamily: "var(--ed-font-mono)" }}>
                {(res.log || []).map((e) => (
                  <tr key={e.idx} style={{ borderBottom: "1px solid rgba(148,120,255,0.18)" }}>
                    <td style={{ padding: "8px 8px", color: "var(--ed-ink-soft)" }}>{e.idx}</td>
                    <td style={{ padding: "8px 8px", fontWeight: 600 }}>{formatOp(e)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{e.userAnswer}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{e.correctAnswer}</td>
                    <td style={{
                      padding: "8px 8px", textAlign: "center", fontFamily: "var(--ed-font-display)",
                      fontWeight: 700, color: e.isCorrect ? "#2ecc8f" : "#ff6b6b",
                    }}>
                      {e.isCorrect ? "Correcto" : "Incorrecto"}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "right", color: "var(--ed-ink-dim)" }}>{e.time}s</td>
                  </tr>
                ))}
                {(res.log || []).length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: "16px 8px", textAlign: "center", color: "var(--ed-ink-soft)", fontStyle: "italic" }}>
                      No se registraron ejercicios en esta sesión.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{
            borderTop: "2px solid rgba(242,194,96,0.45)",
            paddingTop: 10,
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
            fontFamily: "var(--ed-font-ui)", fontSize: 11,
          }}>
            <SummaryCell label="Ejercicios" value={`${attemptedCount} / ${totalEx}`} />
            <SummaryCell label="Correctos" value={`${res.solved}`} tone="#2ecc8f" />
            <SummaryCell label="Estrellas" value={`${res.starsEarned}`} tone="#fce9a8" />
            <SummaryCell label="Precisión total" value={`${accuracy}%`} tone="#fce9a8" emphasis />
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              className="ed-btn ed-btn-ghost"
              onClick={() => window.print()}
              style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}
            >
              IMPRIMIR REPORTE
            </button>
            <button className="ed-btn ed-btn-primary" onClick={() => go("game")} style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              JUGAR OTRA RONDA
            </button>
          </div>
        </div>
      </div>

      <PrintableReport
        studentName={app.studentName}
        res={res}
        dateStr={dateStr}
        m={m} s={s}
        attemptedCount={attemptedCount}
        totalEx={totalEx}
        accuracy={accuracy}
      />
    </div>
  );
}

function ReportField({ label, value }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 10,
      background: "rgba(10,6,35,0.45)",
      border: "1px solid rgba(148,120,255,0.25)",
    }}>
      <div className="ed-label" style={{ fontSize: 9, color: "var(--ed-ink-soft)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 14, color: "var(--ed-ink)" }}>{value}</div>
    </div>
  );
}

function SummaryCell({ label, value, tone = "var(--ed-ink)", emphasis = false }) {
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 10,
      background: emphasis ? "rgba(242,194,96,0.12)" : "rgba(10,6,35,0.4)",
      border: `1px solid ${emphasis ? "rgba(242,194,96,0.5)" : "rgba(148,120,255,0.25)"}`,
      textAlign: "center",
    }}>
      <div className="ed-label" style={{ fontSize: 9, color: "var(--ed-ink-soft)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: emphasis ? 22 : 18, color: tone, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

Object.assign(window, { GameScreen, ResultsScreen });
