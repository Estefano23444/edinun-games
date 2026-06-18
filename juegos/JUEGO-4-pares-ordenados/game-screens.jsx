// game-screens.jsx — Pares ordenados (juego de plano cartesiano con 2 niveles).

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Constantes geométricas del plano cartesiano (compartidas entre la
// rejilla, los marcadores y el avatar/tesoro virtual).
// ─────────────────────────────────────────────────────────────
const GRID_MAX = 6;                         // coordenadas en 0..GRID_MAX
const CELLS    = GRID_MAX + 1;              // 7 líneas (puntos)
// Dimensiones de la rejilla parametrizadas por modo (las pasa GameScreen
// a CartesianBoard como props):
//   coords   → compacta, deja espacio para slots + numpad debajo.
//   producto → más grande, llena la zona-central porque no hay bandeja.
const SIZE = {
  coords:   { step: 36, axisPad: 28, tipPad: 44 },
  producto: { step: 50, axisPad: 32, tipPad: 48 },
};

// ─────────────────────────────────────────────────────────────
// Generador de problemas. 2 modos:
//   coords   → un punto (x, y) random en 0..6 (sin (0,0)). El estudiante
//              escribe la coordenada en slots numéricos.
//   producto → conjuntos A y B con |A| = |B| = 2, valores únicos en
//              0..6. El estudiante debe marcar las 4 intersecciones del
//              producto cartesiano A × B en el plano.
// ─────────────────────────────────────────────────────────────
function makeProblem(cat) {
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  if (cat === "producto") {
    function pickTwo() {
      const a = rand(0, GRID_MAX);
      let b = rand(0, GRID_MAX);
      while (b === a) b = rand(0, GRID_MAX);
      return [a, b].sort((u, v) => u - v);
    }
    const A = pickTwo();
    const B = pickTwo();
    const pares = [];
    for (const a of A) for (const b of B) pares.push({ x: a, y: b });
    return { mode: "producto", A, B, pares };
  }
  // coords (default)
  let x = 0, y = 0;
  while (x === 0 && y === 0) {
    x = rand(0, GRID_MAX);
    y = rand(0, GRID_MAX);
  }
  return { mode: "coords", x, y };
}

// ─────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO — Pares ordenados (coordenadas + producto cartesiano)
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
// CartesianBoard — rejilla 7×7 con ejes rotulados, flechas y letras
// X (cian) e Y (rosa). Acepta:
//   - un punto fijo (target) — se dibuja como círculo cian; usado por
//     el modo "coords" para mostrar la coordenada que el estudiante
//     debe identificar.
//   - un set de marcas tap-ables — usado por el modo "producto"; cada
//     intersección puede marcarse/desmarcarse por toque.
//   - resaltados en los ejes — los valores de A en X y de B en Y se
//     pintan con un color más fuerte para guiar visualmente.
// ─────────────────────────────────────────────────────────────
function CartesianBoard({ target, marked, toggleMark, highlightA, highlightB, feedback, revealKeys = null, step = SIZE.coords.step, axisPad = SIZE.coords.axisPad, tipPad = SIZE.coords.tipPad }) {
  const STEP = step;
  const AXIS_PAD = axisPad;
  const TIP_PAD  = tipPad;
  const GRID_W = (CELLS - 1) * STEP;
  const GRID_H = (CELLS - 1) * STEP;
  const TOTAL_W = AXIS_PAD + GRID_W + TIP_PAD;
  const TOTAL_H = TIP_PAD + GRID_H + AXIS_PAD;
  const cellLeft = (x) => AXIS_PAD + x * STEP;
  const cellTop  = (y) => TIP_PAD + (GRID_MAX - y) * STEP;

  return (
    <div style={{
      position: "relative",
      width: TOTAL_W, height: TOTAL_H,
      margin: "0 auto",
      userSelect: "none",
    }}>
      {/* Etiquetas de los ejes — TODOS los números se ven igual (mismo
          peso, mismo tamaño, mismo color), sin distinguir los que
          pertenecen a A o B. La pista pedagógica para el modo
          producto vive sólo en el cartel del enunciado (A = (...),
          B = (...)), no en los ejes. */}
      {/* Eje Y — etiquetas SOBRE cada línea horizontal */}
      {Array.from({ length: CELLS }).map((_, i) => (
        <div key={`y${i}`} style={{
          position: "absolute",
          left: 0, top: cellTop(i) - 11,
          width: AXIS_PAD - 6, height: 22,
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          paddingRight: 6,
          fontFamily: "var(--ed-font-mono)", fontWeight: 700, fontSize: 14,
          color: "#fce9a8",
        }}>{i}</div>
      ))}
      {/* Eje X — etiquetas SOBRE cada línea vertical */}
      {Array.from({ length: CELLS }).map((_, i) => (
        <div key={`x${i}`} style={{
          position: "absolute",
          left: cellLeft(i) - 12, top: cellTop(0) + 8,
          width: 24, height: 20,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--ed-font-mono)", fontWeight: 700, fontSize: 14,
          color: "#fce9a8",
        }}>{i}</div>
      ))}

      {/* Letras grandes X / Y al final de cada eje. La X se centra
          verticalmente con la flecha cian (que está centrada en cellTop(0)),
          desplazándola -11 px (la mitad de la altura visual de la letra). */}
      <div style={{
        position: "absolute",
        left: cellLeft(GRID_MAX) + 16, top: cellTop(0) - 11,
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22,
        color: "#4fd8ff",
        textShadow: "0 0 10px rgba(79,216,255,0.65), 0 2px 4px rgba(0,0,0,0.5)",
        letterSpacing: "0.04em", lineHeight: 1,
      }}>X</div>
      <div style={{
        position: "absolute",
        left: cellLeft(0) - 8, top: cellTop(GRID_MAX) - 46,
        fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22,
        color: "#ff79c6",
        textShadow: "0 0 10px rgba(255,121,198,0.65), 0 2px 4px rgba(0,0,0,0.5)",
        letterSpacing: "0.04em", lineHeight: 1,
      }}>Y</div>

      {/* Líneas verticales — eje Y (x=0) destacado */}
      {Array.from({ length: CELLS }).map((_, i) => {
        const isAxisY = i === 0;
        return (
          <div key={`vline${i}`} style={{
            position: "absolute",
            left: cellLeft(i) - (isAxisY ? 1.5 : 1), top: cellTop(GRID_MAX),
            width: isAxisY ? 3 : 2, height: GRID_H,
            background: isAxisY ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.18)",
            boxShadow: isAxisY ? "0 0 10px rgba(255,255,255,0.6)" : "none",
            pointerEvents: "none",
          }} />
        );
      })}
      {/* Líneas horizontales — eje X (y=0) destacado */}
      {Array.from({ length: CELLS }).map((_, i) => {
        const isAxisX = i === 0;
        return (
          <div key={`hline${i}`} style={{
            position: "absolute",
            left: cellLeft(0), top: cellTop(i) - (isAxisX ? 1.5 : 1),
            width: GRID_W, height: isAxisX ? 3 : 2,
            background: isAxisX ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.18)",
            boxShadow: isAxisX ? "0 0 10px rgba(255,255,255,0.6)" : "none",
            pointerEvents: "none",
          }} />
        );
      })}

      {/* Flecha X */}
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
      {/* Flecha Y */}
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

      {/* Punto objetivo (modo coords) */}
      {target && (
        <div style={{
          position: "absolute",
          left: cellLeft(target.x) - 14,
          top:  cellTop(target.y) - 14,
          width: 28, height: 28, borderRadius: "50%",
          background: "radial-gradient(circle at 30% 30%, #79e8ff, #1f7fb8)",
          boxShadow: "0 0 18px rgba(79,216,255,0.9), inset 0 0 6px rgba(255,255,255,0.55)",
          pointerEvents: "none",
          zIndex: 4,
        }} />
      )}

      {/* Celdas tap-ables y marcas (modo producto). Cada intersección
          (x, y) tiene un hit-area cuadrado centrado de 36×36 px que
          alterna marcado/desmarcado al tocar. La marca es un círculo
          dorado (cuando OK) o rojo suave (cuando feedback === "err"). */}
      {marked && toggleMark && Array.from({ length: CELLS * CELLS }).map((_, i) => {
        const x = i % CELLS;
        const y = Math.floor(i / CELLS);
        const key = `${x},${y}`;
        const isMarked = marked.has(key);
        const dotColor = feedback === "ok"
          ? "radial-gradient(circle at 30% 30%, #b9ffd2, #1e8a5d)"
          : feedback === "err"
            ? "radial-gradient(circle at 30% 30%, #ffc6c6, #c33b3b)"
            : "radial-gradient(circle at 30% 30%, #fce9a8, #d9a441)";
        return (
          <div
            key={`hit-${key}`}
            onClick={() => toggleMark(x, y)}
            style={{
              position: "absolute",
              left: cellLeft(x) - 18,
              top:  cellTop(y) - 18,
              width: 36, height: 36, borderRadius: "50%",
              cursor: "pointer",
              zIndex: 3,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {isMarked && (
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                background: dotColor,
                boxShadow: "0 0 12px rgba(252,233,168,0.8), inset 0 0 4px rgba(255,255,255,0.4)",
                pointerEvents: "none",
              }} />
            )}
          </div>
        );
      })}

      {/* Revelado (modo producto): los pares correctos en verde con ✓, para
          que el niño vea dónde debían ir las marcas antes del "¡UPS!". Sus
          propias marcas (rojas, vía feedback "err") quedan visibles debajo. */}
      {revealKeys && [...revealKeys].map((key) => {
        const [xs, ys] = key.split(",");
        const x = parseInt(xs, 10);
        const y = parseInt(ys, 10);
        return (
          <div key={`reveal-${key}`} style={{
            position: "absolute",
            left: cellLeft(x) - 13,
            top:  cellTop(y) - 13,
            width: 26, height: 26, borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, #b9ffd2, #1e8a5d)",
            border: "2px solid #2ecc8f",
            boxShadow: "0 0 14px rgba(46,204,143,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#06281c", fontSize: 14, fontWeight: 900,
            pointerEvents: "none",
            zIndex: 5,
          }}>✓</div>
        );
      })}
    </div>
  );
}

function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "coords";
  const catLabel = app.currentCatLabel || "Coordenadas";

  const [problem, setProblem] = useStateG(() => makeProblem(cat));

  // State del juego: para coords usamos un array `answer` de 2 slots
  // (X, Y). Para producto usamos un Set `marked` de strings "x,y".
  // Ambos states coexisten sin pisarse — se reinicializan al cambiar
  // de ejercicio o de nivel.
  const [answer, setAnswer] = useStateG([]);
  const [marked, setMarked] = useStateG(() => new Set());

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  // Fase "reveal": antes del overlay "¡UPS!" se marca la respuesta correcta.
  // coords   → { correct: "(x, y)" } → el slot conserva lo que el niño
  //            escribió (en rojo) y aparece un cartel verde con la coordenada
  //            correcta.
  // producto → { correct: "((a,b), ...)", keys: Set } → las marcas del niño
  //            quedan en rojo (feedback "err") y aparece un cartel verde con
  //            los pares correctos.
  const [reveal, setReveal] = useStateG(null);
  // El revelado (respuesta correcta marcada) es el momento educativo → dura
  // más. El overlay "¡UPS!" es solo refuerzo emocional → corto (ver `wait`).
  const REVEAL_MS = 2800;
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [pendingLevel, setPendingLevel] = useStateG(null);
  const [log, setLog] = useStateG([]);

  const slots = 2; // siempre 2 slots en modo coords (X, Y)
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  // press(d) — coords: rellena de izquierda a derecha (X primero).
  function press(d) {
    if (reveal) return;
    if (problem.mode !== "coords") return;
    setAnswer((prev) => {
      const next = [...prev];
      while (next.length < slots) next.push(undefined);
      for (let i = 0; i < slots; i++) {
        if (next[i] === undefined) { next[i] = d; return next; }
      }
      return prev;
    });
  }
  function eraseAt(i) {
    if (reveal) return;
    setAnswer((prev) => {
      const next = [...prev];
      while (next.length < slots) next.push(undefined);
      next[i] = undefined;
      return next;
    });
  }
  function erase() {
    if (reveal) return;
    if (problem.mode === "coords") {
      setAnswer((prev) => {
        const next = [...prev];
        while (next.length < slots) next.push(undefined);
        // Borra el último colocado (el más a la derecha entre los llenos).
        for (let i = slots - 1; i >= 0; i--) {
          if (next[i] !== undefined) { next[i] = undefined; return next; }
        }
        return next;
      });
    } else {
      // producto: REINICIAR desmarca todos los puntos.
      setMarked(new Set());
    }
  }

  function toggleMark(x, y) {
    if (reveal) return;
    setMarked((prev) => {
      const next = new Set(prev);
      const key = `${x},${y}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function verify() {
    if (reveal) return;
    let isCorrect, userAnswerStr, correctAnswerStr;
    // Set de claves correctas (modo producto) para el revelado.
    let correctKeys = null;

    if (problem.mode === "coords") {
      const filled = [answer[0], answer[1]];
      if (filled.some(d => d === undefined || d === "")) {
        setFeedback("err");
        setFeedbackMsg("Completa los casilleros");
        setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
        return;
      }
      const ux = parseInt(filled[0], 10);
      const uy = parseInt(filled[1], 10);
      isCorrect = ux === problem.x && uy === problem.y;
      userAnswerStr = `(${ux}, ${uy})`;
      correctAnswerStr = `(${problem.x}, ${problem.y})`;
    } else {
      // producto
      if (marked.size === 0) {
        setFeedback("err");
        setFeedbackMsg("Marca al menos un par");
        setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
        return;
      }
      const correct = new Set(problem.pares.map(p => `${p.x},${p.y}`));
      correctKeys = correct;
      isCorrect = marked.size === correct.size && [...marked].every(k => correct.has(k));
      const sortKeys = (set) => [...set].sort().map(k => {
        const [x, y] = k.split(",");
        return `(${x}, ${y})`;
      }).join(", ");
      // En el reporte preferimos paréntesis externos para que sea coherente
      // con el cartel del enunciado del juego; los pares internos también
      // usan paréntesis (por ejemplo: "((1, 2), (1, 3), (4, 2), (4, 3))").
      userAnswerStr = marked.size > 0 ? `(${sortKeys(marked)})` : "( )";
      correctAnswerStr = `(${sortKeys(correct)})`;
    }

    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    const entry = {
      mode: problem.mode,
      a: problem.mode === "coords" ? problem.x : `(${problem.A.join(", ")})`,
      b: problem.mode === "coords" ? problem.y : `(${problem.B.join(", ")})`,
      op: problem.mode === "coords" ? "→" : "×",
      correctAnswer: correctAnswerStr,
      userAnswer: userAnswerStr,
    };

    if (!isCorrect) {
      // Mostrar la respuesta correcta antes del "¡UPS!". El input del niño
      // se conserva (queda en rojo vía feedback "err") y aparece un cartel
      // verde con la coordenada / los pares correctos.
      setReveal({ correct: correctAnswerStr, keys: correctKeys });
      // OJO: no tocar `feedback` aquí — el overlay "¡UPS!" se dispara con
      // `feedback` truthy. Durante el revelado los slots/marcas del niño se
      // tiñen de rojo consultando `reveal` directamente (ver render). El
      // "¡UPS!" llega recién en finalize.
      setTimeout(() => {
        setReveal(null);
        finalize(false, entry);
      }, REVEAL_MS);
      return;
    }
    finalize(true, entry);
  }

  function finalize(isCorrect, partialEntry) {
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;

    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsSession = starsSession + earned;
    const newStarsTotal = stars + earned;

    const entry = {
      idx: newAttempted,
      ...partialEntry,
      isCorrect,
      time: exerciseSec,
      earned,
    };
    const newLog = [...log, entry];

    setFeedback(isCorrect ? "ok" : "err");
    setFeedbackMsg(isCorrect
      ? `+${earned} ⭐`
      : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 950 : 1100;
    setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
      setAnswer([]);
      setMarked(new Set());
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

  function applyLevelChange(newLevel) {
    const map = {
      basic:  { catId: "coords",   catLabel: "Coordenadas" },
      medium: { catId: "producto", catLabel: "Producto cartesiano" },
    };
    const { catId, catLabel } = map[newLevel] || map.basic;
    setApp((s) => ({ ...s, level: newLevel, currentCategory: catId, currentCatLabel: catLabel }));
    setProblem(makeProblem(catId));
    setAnswer([]);
    setMarked(new Set());
    setSolved(0);
    setAttempted(0);
    setStarsSession(0);
    setLog([]);
    setFeedback(null);
    setFeedbackMsg("");
    setReveal(null);
    started.current = Date.now();
    exerciseStart.current = Date.now();
    setElapsed(0);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  const levelOfCat = app.level || "basic";

  // Slot activo del modo coords (el primero vacío).
  let activeIdx = -1;
  for (let i = 0; i < slots; i++) {
    if (answer[i] === undefined || answer[i] === "") { activeIdx = i; break; }
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>

      {/* Top HUD — 2 tabs (basic / medium). */}
      <div data-qa="hud" style={{ position: "absolute", top: 10, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <EdinunLogoMini size={64} />
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span className="ed-label" style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}>RONDA</span>
            {[0,1,2].map((i) => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: "50%",
                background: i < attempted ? (i < solved ? "#fce9a8" : "#ff6b6b") : "rgba(255,255,255,0.2)",
                boxShadow: i < attempted ? "0 0 10px currentColor" : "none",
                color: i < solved ? "#fce9a8" : "#ff6b6b",
              }} />
            ))}
          </div>
        </div>

        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {[
            { id: "basic",  label: "COORDENADAS",         c: "#f5a623" },
            { id: "medium", label: "PRODUCTO CARTESIANO", c: "#f5d84b" },
          ].map((lv) => {
            const active = lv.id === levelOfCat;
            return (
              <button
                key={lv.id}
                onClick={() => { if (!active) setPendingLevel(lv.id); }}
                disabled={active}
                style={{
                  padding: "5px 12px", borderRadius: 999,
                  background: active ? lv.c : "rgba(255,255,255,0.15)",
                  color: active ? "#0b3a2d" : "rgba(255,255,255,0.85)",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11,
                  border: active ? `2px solid ${lv.c}` : "2px solid transparent",
                  boxShadow: active ? `0 0 14px ${lv.c}88` : "none",
                  cursor: active ? "default" : "pointer",
                  transition: "background 0.15s ease, transform 0.1s ease",
                  letterSpacing: "0.02em", whiteSpace: "nowrap",
                }}
              >
                {lv.label}
              </button>
            );
          })}
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

      {/* Personaje + bocadillo agrupados: el bocadillo se ancla sobre la
          cabeza del personaje y ambos flotan juntos (la animación
          ed-float-soft va en el grupo, no solo en el personaje). Cambia
          según el modo del problema. */}
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
          <div className="ed-float-soft" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Bocadillo justo encima de la cabeza */}
            <div style={{ position: "relative", width: 215, marginBottom: 8, zIndex: 2 }}>
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
                {problem.mode === "coords"
                  ? "Mira el punto: primero cuenta X, después Y."
                  : "Toca cada punto del producto A × B."}
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
            <char.Component size={180} floating={false} />
          </div>
        </div>
        <div style={{
          marginTop: -4,
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
          color: "#fce9a8", letterSpacing: "0.04em",
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}>{char.name}</div>
      </div>

      {/* Instrucción del ejercicio. En modo "producto" agregamos los
          conjuntos A y B para que el estudiante sepa qué marcar. */}
      <div style={{
        position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 18, lineHeight: 1.2,
        color: "#fff",
        textShadow: "0 2px 6px rgba(0,0,0,0.45)",
        whiteSpace: "nowrap", textAlign: "center",
      }}>
        {problem.mode === "coords" ? (
          <span>📍 ¿Cuál es la coordenada del punto?</span>
        ) : (
          <span>
            ✖️ Marca todos los pares de
            <span style={{ color: "#fce9a8", marginLeft: 8 }}>A = {`(${problem.A.join(", ")})`}</span>
            <span style={{ color: "#fff", margin: "0 6px" }}>×</span>
            <span style={{ color: "#fce9a8" }}>B = {`(${problem.B.join(", ")})`}</span>
          </span>
        )}
      </div>

      {/* Plano cartesiano — posición y tamaño según el modo:
          coords   → top fijo (110, justo bajo el enunciado que ahora vive
                     en top 80); rejilla compacta (step 36); deja margen
                     abajo para la bandeja con slots + numpad.
          producto → centrado verticalmente (translate(-50%, -50%), top
                     314 para repartir el aire bajo el enunciado y dejar
                     un margen inferior parejo), rejilla más grande
                     (step 50); aprovecha el espacio porque no hay
                     bandeja inferior. El enunciado subió a top 80 (antes
                     92): el indicador de RONDA ya vive pegado al logo, así
                     que el contenido sube para cerrar el hueco que quedaba
                     encima del enunciado. */}
      <div data-qa="zona-central" style={
        problem.mode === "coords"
          ? { position: "absolute", top: 110, left: "50%", transform: "translateX(-50%)", textAlign: "center" }
          : { position: "absolute", top: 314, left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }
      }>
        <CartesianBoard
          target={problem.mode === "coords" ? { x: problem.x, y: problem.y } : null}
          marked={problem.mode === "producto" ? marked : null}
          toggleMark={problem.mode === "producto" ? toggleMark : null}
          highlightA={problem.mode === "producto" ? problem.A : null}
          highlightB={problem.mode === "producto" ? problem.B : null}
          feedback={reveal ? "err" : feedback}
          revealKeys={problem.mode === "producto" && reveal ? reveal.keys : null}
          step={SIZE[problem.mode].step}
          axisPad={SIZE[problem.mode].axisPad}
          tipPad={SIZE[problem.mode].tipPad}
        />
      </div>

      {/* Cartel verde "Correcta" durante el revelado. NO sobrescribe la
          respuesta del niño (sus slots/marcas quedan en rojo); muestra el
          valor correcto aparte. coords → encima de la bandeja; producto →
          bajo el plano. */}
      {reveal && (
        <div style={
          problem.mode === "coords"
            ? { position: "absolute", bottom: 156, left: "50%", transform: "translateX(-50%)" }
            : { position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)" }
        }>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 999,
            background: "rgba(46,204,143,0.22)", border: "2px solid #2ecc8f",
            color: "#eafff4", fontSize: 18, fontWeight: 800,
            fontFamily: "var(--ed-font-display)",
            boxShadow: "0 0 16px rgba(46,204,143,0.5)",
            whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 14, color: "#bff5df", letterSpacing: "0.03em" }}>Correcta:</span>
            ✓ {reveal.correct}
          </span>
        </div>
      )}

      {/* Slots de respuesta + numpad — solo en modo coords. */}
      {problem.mode === "coords" && (
        <div data-qa="bandeja" style={{
          position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        }}>
          {/* Slots ( [X] , [Y] ) — coma explícita entre los dos slots, igual
              al formato de un par ordenado en notación matemática. */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 30,
            color: "#fce9a8",
          }}>
            <span>(</span>
            {[0, 1].map((i) => {
              const d = answer[i];
              const filled = d !== undefined && d !== "";
              const isActive = i === activeIdx;
              // Durante el revelado (reveal) el input del niño se conserva
              // pero se tiñe de rojo, igual que cuando feedback === "err".
              const errTint = feedback === "err" || reveal;
              return (
                <React.Fragment key={i}>
                  <div
                    className={`ed-answer-slot ${isActive ? "active" : ""} ${filled ? "filled" : ""}`}
                    onClick={() => { if (filled) eraseAt(i); }}
                    title={filled ? "Toca para borrar" : (i === 0 ? "X" : "Y")}
                    style={{
                      width: 50, height: 50, fontSize: 28,
                      borderColor: feedback === "ok" ? "#2ecc8f" : errTint ? "#ff6b6b" : undefined,
                      boxShadow: feedback === "ok"
                        ? "0 0 14px rgba(46,204,143,0.65)"
                        : errTint
                          ? "0 0 14px rgba(255,107,107,0.65)"
                          : undefined,
                      color: errTint ? "#ffe3e3" : "#fff",
                      cursor: filled ? "pointer" : "default",
                    }}
                  >
                    {filled ? d : (i === 0 ? "X" : "Y")}
                  </div>
                  {i === 0 && <span style={{ marginLeft: 2, marginRight: 2 }}>,</span>}
                </React.Fragment>
              );
            })}
            <span>)</span>
          </div>
          {/* Numpad 0..6 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 48px)", gap: 6 }}>
            {["0","1","2","3","4","5","6"].map((d, i) => {
              const colors = ["#ef5a5a","#f5a623","#f5d84b","#4fa0ff","#2ecc8f","#b48aff","#ff79c6"];
              const color = colors[i % colors.length];
              return (
                <button
                  key={d}
                  className="ed-numpad-key"
                  onClick={() => press(d)}
                  style={{
                    height: 52, fontSize: 26,
                    borderColor: color,
                    borderWidth: 2, borderStyle: "solid",
                    cursor: "pointer", fontWeight: 800,
                  }}
                  title={`Colocar ${d}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Botones de acción — columna derecha */}
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
          onClick={erase}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          {problem.mode === "coords" ? "BORRAR" : "REINICIAR"}
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

      {/* Feedback overlay */}
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

      {/* Modal SALIR */}
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

      {/* Modal cambio de nivel */}
      {pendingLevel && (() => {
        const labels = { basic: "Coordenadas", medium: "Producto cartesiano" };
        const colors = { basic: "#f5a623", medium: "#f5d84b" };
        return (
          <PortalToBody>
            <div
              onClick={() => setPendingLevel(null)}
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
                style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(242,194,96,0.35)" }}
              >
                <div className="ed-label" style={{ color: "#fce9a8", marginBottom: 6 }}>
                  Cambiar dificultad
                </div>
                <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
                  ¿Cambiar a <span style={{ color: colors[pendingLevel] }}>{labels[pendingLevel]}</span>?
                </h2>
                <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
                  Vas a reiniciar la ronda actual. Perderás el progreso de los ejercicios resueltos hasta ahora en esta sesión.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button className="ed-btn ed-btn-ghost" onClick={() => setPendingLevel(null)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                    CANCELAR
                  </button>
                  <button className="ed-btn ed-btn-primary" onClick={() => { applyLevelChange(pendingLevel); setPendingLevel(null); }} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                    SÍ, CAMBIAR
                  </button>
                </div>
              </div>
            </div>
          </PortalToBody>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANTALLA DE RESULTADOS
// ─────────────────────────────────────────────────────────────
// formatOp para los 2 modos del juego: en "coords" muestra el par
// objetivo "(x, y)"; en "producto" muestra "A × B".
function formatOp(e) {
  if (e.mode === "coords") return `(${e.a}, ${e.b})`;
  if (e.mode === "producto") return `${e.a} × ${e.b}`;
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
              <th style={printStyles.th}>Pregunta</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Respuesta del estudiante</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Respuesta correcta</th>
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
  const res = app.lastResult || { category: "Coordenadas", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Pregunta</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Respuesta del estudiante</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Respuesta correcta</th>
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
