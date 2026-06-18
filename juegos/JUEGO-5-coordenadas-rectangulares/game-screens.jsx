// game-screens.jsx — Juego de Sistema de coordenadas rectangulares
// 1 nivel, 3 rondas con mecánicas distintas. Audiencia 9 años.

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG } = React;

function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Constantes y helpers de coordenadas
// ─────────────────────────────────────────────────────────────
const COLS = ["A", "B", "C", "D", "E"];
const EMOJIS_R1 = ["🏠", "🍎", "🌸", "⭐", "🍉", "🐶"];

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────────────────────
// makeProblem(cat, idx)
//   idx 0 → R1: grid 5×5 con emojis, ¿en qué casilla está X? (4 opciones)
//   idx 1 → R2: plano cartesiano numérico, ¿qué par ordenado es este punto? (4 opciones)
//   idx 2 → R3: camino del perro Kody, numpad guiado en 2 pasos
// ─────────────────────────────────────────────────────────────
function makeProblem(cat, idx = 0) {
  if (idx === 0) {
    // 6 emojis distintos en 6 casillas del grid 5×5 (cols A-E, rows 1-5).
    const positions = [];
    const used = new Set();
    const emojiList = shuffle(EMOJIS_R1);
    while (positions.length < emojiList.length) {
      const c = rand(0, 4);
      const r = rand(1, 5);
      const key = `${c},${r}`;
      if (used.has(key)) continue;
      used.add(key);
      positions.push({ col: c, row: r, emoji: emojiList[positions.length] });
    }
    const target = positions[rand(0, positions.length - 1)];
    const correct = `(${COLS[target.col]}, ${target.row})`;
    const distractors = new Set();
    while (distractors.size < 3) {
      const c = rand(0, 4);
      const r = rand(1, 5);
      const opt = `(${COLS[c]}, ${r})`;
      if (opt !== correct) distractors.add(opt);
    }
    const options = shuffle([correct, ...Array.from(distractors)]);
    return {
      type: "coords", idx,
      positions, target,
      correct, options,
    };
  }

  if (idx === 1) {
    // Plano numérico 0..6 × 0..6. Un punto marcado.
    const x = rand(0, 6);
    const y = rand(0, 6);
    const correct = `(${x}, ${y})`;
    // Distractores: cercanos al correcto (no el mismo).
    const distractors = new Set();
    let guard = 0;
    while (distractors.size < 3 && guard < 30) {
      guard++;
      let dx = x + rand(-2, 2);
      let dy = y + rand(-2, 2);
      dx = Math.max(0, Math.min(6, dx));
      dy = Math.max(0, Math.min(6, dy));
      const opt = `(${dx}, ${dy})`;
      if (opt !== correct) distractors.add(opt);
    }
    // Si no se completaron 3 (caso extremo), rellenar con randoms.
    while (distractors.size < 3) {
      const dx = rand(0, 6);
      const dy = rand(0, 6);
      const opt = `(${dx}, ${dy})`;
      if (opt !== correct) distractors.add(opt);
    }
    const options = shuffle([correct, ...Array.from(distractors)]);
    return {
      type: "coords", idx,
      x, y, correct, options,
    };
  }

  // R3 — camino del cohete a la luna. Cohete en (0,0), luna en (X, Y).
  const X = rand(2, 5);
  const Y = rand(2, 5);
  return {
    type: "coords", idx,
    targetX: X, targetY: Y,
  };
}

// ─────────────────────────────────────────────────────────────
// Slot de un dígito (R3).
// ─────────────────────────────────────────────────────────────
function SlotBox({ value, feedback, size = 50 }) {
  const filled = value !== "" && value !== undefined;
  const h = Math.round(size * 1.3);
  const fs = Math.round(size * 0.66);
  return (
    <div style={{
      width: size, height: h,
      display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 10,
      border: `2px solid ${
        feedback === "ok" ? "#2ecc8f" :
        feedback === "err" ? "#ff6b6b" :
        filled ? "#fce9a8" : "rgba(252,233,168,0.45)"
      }`,
      background: filled ? "rgba(252,233,168,0.12)" : "rgba(0,0,0,0.25)",
      fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: fs,
      color: "#fff",
      boxShadow: feedback === "ok" ? "0 0 14px rgba(46,204,143,0.55)"
              : feedback === "err" ? "0 0 14px rgba(255,107,107,0.55)" : "none",
      transition: "all 0.15s ease",
    }}>
      {filled ? value : ""}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Grid R1 — 5×5 con encabezados A-E (arriba) y 1-5 (izq).
// ─────────────────────────────────────────────────────────────
function GridR1({ positions, target }) {
  const cell = 44;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `28px repeat(5, ${cell}px)`,
      gridTemplateRows: `24px repeat(5, ${cell}px)`,
      gap: 2,
      background: "rgba(10,6,35,0.55)",
      padding: 6, borderRadius: 12,
      border: "2px solid rgba(252,233,168,0.45)",
    }}>
      {/* esquina vacía */}
      <div />
      {/* encabezados de columnas A-E */}
      {COLS.map((col) => (
        <div key={`h-${col}`} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16,
          color: "#fce9a8",
        }}>
          {col}
        </div>
      ))}
      {/* filas: encabezado numérico + 5 celdas */}
      {[1,2,3,4,5].map((row) => [
        <div key={`r-${row}`} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 16,
          color: "#fce9a8",
        }}>
          {row}
        </div>,
        ...COLS.map((col, c) => {
          const here = positions.find((p) => p.col === c && p.row === row);
          const isTarget = target && here && here === target;
          return (
            <div key={`c-${col}-${row}`} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              background: isTarget ? "rgba(252,233,168,0.22)" : "rgba(255,255,255,0.05)",
              border: isTarget ? "2px solid #fce9a8" : "1px solid rgba(255,255,255,0.18)",
              borderRadius: 6,
              fontSize: 22,
              boxShadow: isTarget ? "0 0 14px rgba(252,233,168,0.55)" : "none",
            }}>
              {here ? here.emoji : ""}
            </div>
          );
        }),
      ])}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Plano cartesiano R2 / R3 — ejes 0..N con un punto marcado.
// Si character=true, dibuja además al perro en (0,0) y tesoro en target.
// ─────────────────────────────────────────────────────────────
function CartesianPlane({ x, y, max = 5, point = true, character = false, walkedX = 0, walkedY = 0 }) {
  const step = 32;
  const padL = 36, padB = 36, padT = 36, padR = 44;
  const w = padL + step * max + padR;
  const h = padT + step * max + padB;
  // Conversión: ejes con (0,0) abajo-izquierda.
  const toX = (xv) => padL + xv * step;
  const toY = (yv) => padT + (max - yv) * step;
  return (
    <svg width={w} height={h} style={{
      background: "rgba(10,6,35,0.55)",
      borderRadius: 12,
      border: "2px solid rgba(252,233,168,0.45)",
    }}>
      {/* Grid */}
      {Array.from({ length: max + 1 }, (_, i) => (
        <g key={`v-${i}`}>
          <line x1={toX(i)} y1={toY(0)} x2={toX(i)} y2={toY(max)}
            stroke="rgba(252,233,168,0.18)" strokeWidth="1" />
          <text x={toX(i)} y={toY(0) + 18} fontSize="12" fill="#fce9a8" textAnchor="middle"
            fontFamily="var(--ed-font-display)" fontWeight="700">{i}</text>
        </g>
      ))}
      {Array.from({ length: max + 1 }, (_, i) => (
        <g key={`h-${i}`}>
          <line x1={toX(0)} y1={toY(i)} x2={toX(max)} y2={toY(i)}
            stroke="rgba(252,233,168,0.18)" strokeWidth="1" />
          <text x={toX(0) - 10} y={toY(i) + 4} fontSize="12" fill="#fce9a8" textAnchor="end"
            fontFamily="var(--ed-font-display)" fontWeight="700">{i}</text>
        </g>
      ))}
      {/* Ejes */}
      <line x1={toX(0)} y1={toY(0)} x2={toX(max)} y2={toY(0)}
        stroke="#fce9a8" strokeWidth="2" markerEnd="url(#arrow)" />
      <line x1={toX(0)} y1={toY(0)} x2={toX(0)} y2={toY(max)}
        stroke="#fce9a8" strokeWidth="2" markerEnd="url(#arrow)" />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L7,4 L0,8 z" fill="#fce9a8" />
        </marker>
      </defs>
      {/* Etiqueta x — más allá de la flecha del eje x, separada del último número */}
      <text x={toX(max) + 18} y={toY(0) + 5} fontSize="14" fill="#fce9a8" textAnchor="middle"
        fontFamily="var(--ed-font-display)" fontWeight="700" fontStyle="italic">x</text>
      {/* Etiqueta y — encima de la flecha del eje y, no al lado */}
      <text x={toX(0)} y={toY(max) - 14} fontSize="14" fill="#fce9a8" textAnchor="middle"
        fontFamily="var(--ed-font-display)" fontWeight="700" fontStyle="italic">y</text>

      {/* Camino caminado (R3) */}
      {character && walkedX > 0 && (
        <line x1={toX(0)} y1={toY(0)} x2={toX(walkedX)} y2={toY(0)}
          stroke="#4fd8ff" strokeWidth="3" strokeDasharray="4 3" />
      )}
      {character && walkedY > 0 && (
        <line x1={toX(walkedX)} y1={toY(0)} x2={toX(walkedX)} y2={toY(walkedY)}
          stroke="#4fd8ff" strokeWidth="3" strokeDasharray="4 3" />
      )}

      {/* Luna en target (R3) — centrada sobre (x, y) */}
      {character && (
        <text x={toX(x)} y={toY(y)} fontSize="22" textAnchor="middle" dominantBaseline="central">🌙</text>
      )}
      {/* Cohete — empieza en (0,0) y se mueve a (walkedX, walkedY) según responde */}
      {character && (
        <g style={{
          transform: `translate(${(toX(walkedX) - toX(0))}px, ${(toY(walkedY) - toY(0))}px)`,
          transition: "transform 0.55s ease",
        }}>
          <text x={toX(0)} y={toY(0)} fontSize="22" textAnchor="middle" dominantBaseline="central">🚀</text>
        </g>
      )}

      {/* Punto marcado (R2) */}
      {point && !character && (
        <g>
          <circle cx={toX(x)} cy={toY(y)} r="9" fill="#fce9a8"
            style={{ filter: "drop-shadow(0 0 8px rgba(252,233,168,0.7))" }} />
          <circle cx={toX(x)} cy={toY(y)} r="4" fill="#0a0623" />
        </g>
      )}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Mensajes motivadores
// ─────────────────────────────────────────────────────────────
const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "Recuerda: primero la x, después la y.",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Mira de nuevo los ejes.",
  "¡Vamos al siguiente reto!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "coords";
  const catLabel = app.currentCatLabel || "Sistema de coordenadas rectangulares";

  const [problem, setProblem] = useStateG(() => makeProblem(cat, 0));

  // Estado R3 (numpad guiado, 2 pasos: derecha → arriba)
  const [step, setStep] = useStateG(0); // 0 = derecha, 1 = arriba
  const [slot, setSlot] = useStateG("");
  const [walkedX, setWalkedX] = useStateG(0);
  const [walkedY, setWalkedY] = useStateG(0);

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  // Fase "reveal": antes del overlay "¡UPS!" se marca la respuesta correcta.
  // R1/R2 (opción múltiple): { correct, wrong } → opción correcta en verde con ✓, la elegida en rojo.
  // R3 (numpad): { correctSlot: "<valor correcto>" } → el slot conserva lo que
  //   escribió el niño (en rojo) y aparece un cartel verde con el número correcto.
  const [reveal, setReveal] = useStateG(null);
  // El revelado (respuesta correcta marcada) es el momento educativo → dura más.
  // El overlay "¡UPS!" es solo refuerzo emocional → corto (ver `wait` en finalize).
  const REVEAL_MS = 2800;
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [log, setLog] = useStateG([]);

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // Reset de R3 al cambiar de problema
  useEffectG(() => {
    setStep(0);
    setSlot("");
    setWalkedX(0);
    setWalkedY(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem]);

  // Cronómetro total
  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  function answerTap(userValue) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    let isCorrect = false;
    let entry = {};

    if (problem.idx === 0) {
      isCorrect = userValue === problem.correct;
      entry = {
        a: `${problem.target.emoji} en grid`,
        b: "casilla",
        op: "→",
        correctAnswer: problem.correct,
        userAnswer: userValue,
      };
    } else if (problem.idx === 1) {
      isCorrect = userValue === problem.correct;
      entry = {
        a: "punto en plano",
        b: "par ordenado",
        op: "→",
        correctAnswer: problem.correct,
        userAnswer: userValue,
      };
    }
    if (!isCorrect) {
      // Mostrar la opción correcta (verde ✓) y la elegida (roja) antes del "¡UPS!".
      setReveal({ correct: problem.correct, wrong: userValue });
      setTimeout(() => { setReveal(null); finalize(false, entry); }, REVEAL_MS);
      return;
    }
    finalize(true, entry);
  }

  // R3 — numpad guiado paso a paso. Si un paso falla, finaliza incorrecto.
  function verify() {
    if (problem.idx !== 2 || reveal) return;
    if (slot === "") {
      setFeedback("err");
      setFeedbackMsg("Escribe un número");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }
    const value = parseInt(slot, 10);

    if (step === 0) {
      // Paso 1: pasos a la derecha = X
      const isCorrect = value === problem.targetX;
      if (!isCorrect) {
        const entry = {
          a: `(0,0) → (${problem.targetX},${problem.targetY})`,
          b: "pasos derecha",
          op: "=",
          correctAnswer: String(problem.targetX),
          userAnswer: slot,
        };
        // Mantener lo que escribió el niño (en rojo) y mostrar el número
        // correcto en un cartel verde aparte, antes del "¡UPS!".
        setReveal({ correctSlot: String(problem.targetX) });
        setTimeout(() => {
          setReveal(null); setSlot("");
          finalize(false, entry);
        }, REVEAL_MS);
        return;
      }
      // Avanzar a paso 2
      setWalkedX(problem.targetX);
      setSlot("");
      setStep(1);
      setFeedback("ok");
      setFeedbackMsg(`${value} ✓`);
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 600);
      return;
    }

    // step === 1: pasos hacia arriba = Y
    const isCorrect = value === problem.targetY;
    const entry = {
      a: `(0,0) → (${problem.targetX},${problem.targetY})`,
      b: `${problem.targetX} der. y _ arriba`,
      op: "=",
      correctAnswer: `${problem.targetX} der., ${problem.targetY} arriba`,
      userAnswer: `${problem.targetX} der., ${slot} arriba`,
    };
    if (isCorrect) {
      // Mover el cohete a (X, Y) y esperar la animación antes de finalizar.
      setWalkedY(problem.targetY);
      setTimeout(() => finalize(true, entry), 700);
      return;
    }
    // Mantener lo que escribió el niño (en rojo) y mostrar el número
    // correcto en un cartel verde aparte, antes del "¡UPS!".
    setReveal({ correctSlot: String(problem.targetY) });
    setTimeout(() => {
      setReveal(null); setSlot("");
      finalize(false, entry);
    }, REVEAL_MS);
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
      : ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]
    );
    setAttempted(newAttempted);
    setSolved(newSolved);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 950 : 1100;
    setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
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
        setProblem(makeProblem(cat, newAttempted));
        exerciseStart.current = Date.now();
      }
    }, wait);
  }

  function pressDigit(d) {
    if (problem.idx !== 2 || reveal) return;
    if (d === "0") return; // 0 no es respuesta válida en este juego (igual que antes)
    // Respuesta de un solo dígito: tocar otro número REEMPLAZA el actual,
    // así el niño puede corregir sin tener que tocar BORRAR primero.
    setSlot(d);
  }
  function eraseLast() {
    if (problem.idx !== 2 || reveal) return;
    if (slot !== "") setSlot(slot.slice(0, -1));
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  function restartGame() {
    setConfirmingRestart(false);
    setAttempted(0); setSolved(0);
    setStars(0); setStarsSession(0);
    setFeedback(null); setFeedbackMsg(""); setReveal(null);
    setLog([]); setSlot(""); setStep(0); setWalkedX(0); setWalkedY(0);
    setProblem(makeProblem(cat, 0));
    started.current = Date.now();
    exerciseStart.current = Date.now();
  }

  const bocadilloText = problem.idx === 2
    ? "Ingresa los números correctos."
    : "Selecciona la respuesta correcta.";

  const instructionByIdx = [
    problem.target ? `¿En qué casilla está ${problem.target.emoji}?` : "",
    "¿Qué par ordenado es este punto?",
    step === 0 ? "Guía al cohete 🚀: ¿cuántos pasos a la derecha?" : "¡Ya casi en la Luna 🌙! ¿cuántos pasos hacia arriba?",
  ];
  const instructionText = instructionByIdx[problem.idx] || "";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* HUD superior */}
      <div data-qa="hud" style={{ position: "absolute", top: 10, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <EdinunLogoMini size={64} />
          {/* Indicador de RONDA pegado al logo (antes centrado en top:64,
              donde se cruzaba con el enunciado). */}
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
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 16,
          color: "#fce9a8", letterSpacing: "0.04em",
          textShadow: "0 2px 6px rgba(0,0,0,0.45)",
        }}>
          {catLabel}
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
          ed-float-soft va en el grupo, no solo en el personaje). */}
      <div data-qa="personaje" style={{
        position: "absolute", left: 8, bottom: 90, width: 220,
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
                fontWeight: 700, fontSize: 15, lineHeight: 1.25,
                color: "#fce9a8", textAlign: "center",
                boxShadow: "0 8px 22px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}>
                {bocadilloText}
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
            <char.Component size={200} floating={false} />
          </div>
        </div>
        <div style={{
          marginTop: -4,
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
          color: "#fce9a8", letterSpacing: "0.04em",
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}>{char.name}</div>
      </div>

      {/* ZONA CENTRAL — enunciado fijo arriba (debajo del HUD) y el contenido
          interactivo centrado en el espacio restante. Antes el enunciado iba
          dentro de un space-evenly y quedaba flotando con un hueco arriba
          (donde antes vivía el indicador de RONDA). */}
      <div data-qa="zona-central" style={{
        position: "absolute", left: "50%", top: 80, transform: "translateX(-50%)",
        width: 580, bottom: problem.idx === 2 ? 92 : 28,
        display: "flex", flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 700,
          fontSize: 24, lineHeight: 1.1,
          color: "#fff",
          textShadow: "0 2px 6px rgba(0,0,0,0.45)",
        }}>
          {instructionText}
        </div>

        {/* Contenido interactivo de cada ronda, centrado verticalmente. */}
        <div data-qa="zona-contenido" style={{
          flex: 1, width: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "space-evenly",
        }}>

        {/* R1 — Grid 5×5 con emojis */}
        {problem.idx === 0 && (
          <>
            <GridR1 positions={problem.positions} target={problem.target} />
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8, width: 360,
            }}>
              {problem.options.map((opt, i) => {
                const isCorrectOpt = reveal && reveal.correct != null && opt === reveal.correct;
                const isWrongOpt = reveal && reveal.wrong != null && opt === reveal.wrong;
                const locked = feedback !== null || reveal !== null;
                return (
                <button
                  key={i}
                  onClick={() => answerTap(opt)}
                  disabled={locked}
                  style={{
                    position: "relative",
                    fontFamily: "var(--ed-font-display)", fontWeight: 700,
                    fontSize: 18, lineHeight: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    border: `2px solid ${
                      isCorrectOpt ? "#2ecc8f" :
                      isWrongOpt ? "#ff6b6b" :
                      "rgba(252,233,168,0.5)"
                    }`,
                    background: isCorrectOpt ? "rgba(46,204,143,0.25)"
                            : isWrongOpt ? "rgba(255,107,107,0.22)"
                            : "rgba(10,6,35,0.55)",
                    color: isCorrectOpt ? "#eafff4" : isWrongOpt ? "#ffe3e3" : "#fce9a8",
                    cursor: locked ? "not-allowed" : "pointer",
                    textShadow: "0 0 14px rgba(252,233,168,0.4), 0 2px 6px rgba(0,0,0,0.4)",
                    boxShadow: isCorrectOpt ? "0 0 16px rgba(46,204,143,0.6)"
                            : isWrongOpt ? "0 0 16px rgba(255,107,107,0.5)"
                            : "0 6px 18px rgba(0,0,0,0.4)",
                    transition: "transform 0.15s ease, border-color 0.15s ease",
                    opacity: locked && !isCorrectOpt && !isWrongOpt ? 0.45 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!locked) {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = "#4fd8ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!locked) {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor = "rgba(252,233,168,0.5)";
                    }
                  }}
                >
                  {opt}
                  {isCorrectOpt && (
                    <span style={{
                      position: "absolute", top: -8, right: -8,
                      width: 22, height: 22, borderRadius: "50%",
                      background: "#2ecc8f", color: "#06281c",
                      fontSize: 14, fontWeight: 900,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                    }}>✓</span>
                  )}
                </button>
                );
              })}
            </div>
          </>
        )}

        {/* R2 — Plano cartesiano + 4 botones */}
        {problem.idx === 1 && (
          <>
            <CartesianPlane x={problem.x} y={problem.y} max={6} point={true} />
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8, width: 340,
            }}>
              {problem.options.map((opt, i) => {
                const isCorrectOpt = reveal && reveal.correct != null && opt === reveal.correct;
                const isWrongOpt = reveal && reveal.wrong != null && opt === reveal.wrong;
                const locked = feedback !== null || reveal !== null;
                return (
                <button
                  key={i}
                  onClick={() => answerTap(opt)}
                  disabled={locked}
                  style={{
                    position: "relative",
                    fontFamily: "var(--ed-font-display)", fontWeight: 700,
                    fontSize: 18, lineHeight: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    border: `2px solid ${
                      isCorrectOpt ? "#2ecc8f" :
                      isWrongOpt ? "#ff6b6b" :
                      "rgba(252,233,168,0.5)"
                    }`,
                    background: isCorrectOpt ? "rgba(46,204,143,0.25)"
                            : isWrongOpt ? "rgba(255,107,107,0.22)"
                            : "rgba(10,6,35,0.55)",
                    color: isCorrectOpt ? "#eafff4" : isWrongOpt ? "#ffe3e3" : "#fce9a8",
                    cursor: locked ? "not-allowed" : "pointer",
                    textShadow: "0 0 14px rgba(252,233,168,0.4), 0 2px 6px rgba(0,0,0,0.4)",
                    boxShadow: isCorrectOpt ? "0 0 16px rgba(46,204,143,0.6)"
                            : isWrongOpt ? "0 0 16px rgba(255,107,107,0.5)"
                            : "0 6px 18px rgba(0,0,0,0.4)",
                    transition: "transform 0.15s ease, border-color 0.15s ease",
                    opacity: locked && !isCorrectOpt && !isWrongOpt ? 0.45 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!locked) {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.borderColor = "#4fd8ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!locked) {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor = "rgba(252,233,168,0.5)";
                    }
                  }}
                >
                  {opt}
                  {isCorrectOpt && (
                    <span style={{
                      position: "absolute", top: -8, right: -8,
                      width: 22, height: 22, borderRadius: "50%",
                      background: "#2ecc8f", color: "#06281c",
                      fontSize: 14, fontWeight: 900,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                    }}>✓</span>
                  )}
                </button>
                );
              })}
            </div>
          </>
        )}

        {/* R3 — Plano del Kody con personaje y tesoro + slot */}
        {problem.idx === 2 && (
          <>
            <CartesianPlane
              x={problem.targetX}
              y={problem.targetY}
              max={5}
              point={false}
              character={true}
              walkedX={walkedX}
              walkedY={walkedY}
            />
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              fontFamily: "var(--ed-font-display)", fontWeight: 700,
              fontSize: 26, color: "#fce9a8",
              textShadow: "0 0 12px rgba(252,233,168,0.4), 0 2px 6px rgba(0,0,0,0.45)",
            }}>
              <span>{step === 0 ? "→" : "↑"}</span>
              {/* Al fallar: el slot conserva lo que el niño escribió (en rojo)
                  y al lado aparece un cartel verde con el número correcto. */}
              <SlotBox value={slot} feedback={reveal && reveal.correctSlot != null ? "err" : feedback} size={48} />
              <span style={{ fontSize: 18, color: "rgba(252,233,168,0.7)" }}>
                {step === 0 ? "pasos a la derecha" : "pasos hacia arriba"}
              </span>
              {reveal && reveal.correctSlot != null && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 16px", borderRadius: 999,
                  background: "rgba(46,204,143,0.22)", border: "2px solid #2ecc8f",
                  color: "#eafff4", fontSize: 18, fontWeight: 800,
                  boxShadow: "0 0 16px rgba(46,204,143,0.5)",
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ fontSize: 14, color: "#bff5df", letterSpacing: "0.03em" }}>Correcta:</span>
                  ✓ {reveal.correctSlot}
                </span>
              )}
            </div>
          </>
        )}
        </div>
      </div>

      {/* Numpad — solo R3 */}
      {problem.idx === 2 && (
        <div data-qa="bandeja" style={{
          position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
          display: "grid", gridTemplateColumns: "repeat(10, 60px)", gap: 8,
        }}>
          {["1","2","3","4","5","6","7","8","9","0"].map((d, i) => {
            const color = ["#ef5a5a","#f5a623","#f5d84b","#4fa0ff","#2ecc8f"][i % 5];
            return (
              <button
                key={d}
                className="ed-numpad-key"
                onClick={() => pressDigit(d)}
                style={{
                  height: 64, fontSize: 30,
                  borderColor: color, borderWidth: 2, borderStyle: "solid",
                  cursor: "pointer",
                }}
                title="Toca para colocar"
              >
                {d}
              </button>
            );
          })}
        </div>
      )}

      {/* Acciones laterales */}
      <div data-qa="acciones" style={{
        position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 12, width: 150,
      }}>
        {problem.idx === 2 && (
          <>
            <button
              className="ed-btn ed-btn-verify"
              onClick={verify}
              style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
            >
              ¡VERIFICAR!
            </button>
            <button
              className="ed-btn ed-btn-erase"
              onClick={eraseLast}
              style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
            >
              BORRAR
            </button>
          </>
        )}
        {problem.idx < 2 && (
          <button
            className="ed-btn ed-btn-erase"
            onClick={() => setConfirmingRestart(true)}
            title="Reiniciar el juego"
            style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
          >
            REINICIAR
          </button>
        )}
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

      {/* Modal REINICIAR */}
      {confirmingRestart && (
        <PortalToBody>
          <div
            onClick={() => setConfirmingRestart(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 1000,
              background: "rgba(0,0,0,0.62)",
              backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "ed-pop-in 0.18s", padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="ed-card"
              style={{ padding: 24, maxWidth: 440, textAlign: "center", boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(245,166,35,0.3)" }}
            >
              <div className="ed-label" style={{ color: "#f5a623", marginBottom: 6 }}>
                Reiniciar el juego
              </div>
              <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
                ¿Empezar de nuevo?
              </h2>
              <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
                Vas a perder el progreso de esta ronda ({attempted}/3 ejercicios) y empezarás otra vez desde la primera ronda.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingRestart(false)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SEGUIR JUGANDO
                </button>
                <button className="ed-btn ed-btn-primary" onClick={restartGame} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SÍ, REINICIAR
                </button>
              </div>
            </div>
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
              animation: "ed-pop-in 0.18s", padding: 16,
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
function formatOp(e) {
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
              <th style={printStyles.th}>Enunciado</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Respuesta del estudiante</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Resultado correcto</th>
              <th style={{ ...printStyles.th, ...printStyles.thC }}>Estado</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Tiempo</th>
            </tr>
          </thead>
          <tbody>
            {log.map((e) => (
              <tr key={e.idx} style={printStyles.tr}>
                <td style={{ ...printStyles.td, ...printStyles.tdNum }}>{e.idx}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{e.a}</td>
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
  const res = app.lastResult || { category: "Sistema de coordenadas rectangulares", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Enunciado</th>
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
                    <td style={{ padding: "8px 8px", fontWeight: 600 }}>{e.a}</td>
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
