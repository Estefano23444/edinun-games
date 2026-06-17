// game-screens.jsx — Juego de Fracciones (3 niveles), resultados.
// Audiencia 9-12 años (excepción al default 6-8 del repo).

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

// Portal a <body> para sacar overlays/modales del scope del DeviceStage,
// que aplica `transform: scale()` al lienzo 900×540. Sin esto, un
// `position: fixed` o `absolute` con `inset: 0` solo cubre el área del
// lienzo escalado y deja los laterales del letterboxing sin oscurecer.
function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Generador de problemas por nivel
//   frac1 = pinta porciones (denom 3..10)
//   frac2 = amplificación / simplificación con slot numérico
//   frac3 = decimal → fracción, dificultad creciente por ejercicio (idx 0,1,2)
// ─────────────────────────────────────────────────────────────
function makeProblem(cat, idx = 0) {
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  if (cat === "frac1") {
    const denom = rand(3, 10);
    const num = rand(1, denom - 1);
    return { type: "frac1", num, denom };
  }

  if (cat === "frac2") {
    // Casos amplificables (numerador y denominador hasta 12).
    const amplifiables = [
      { a: 1, b: 2, mult: [2, 3, 4, 5, 6] },
      { a: 1, b: 3, mult: [2, 3, 4] },
      { a: 2, b: 3, mult: [2, 3, 4] },
      { a: 1, b: 4, mult: [2, 3] },
      { a: 3, b: 4, mult: [2, 3] },
      { a: 1, b: 5, mult: [2] },
      { a: 2, b: 5, mult: [2] },
      { a: 3, b: 5, mult: [2] },
      { a: 1, b: 6, mult: [2] },
      { a: 5, b: 6, mult: [2] },
    ];
    const simplifiables = [
      { a: 2, b: 4, div: 2 },
      { a: 3, b: 6, div: 3 },
      { a: 4, b: 6, div: 2 },
      { a: 2, b: 6, div: 2 },
      { a: 4, b: 8, div: 4 },
      { a: 6, b: 8, div: 2 },
      { a: 2, b: 8, div: 2 },
      { a: 6, b: 9, div: 3 },
      { a: 3, b: 9, div: 3 },
      { a: 8, b: 12, div: 4 },
      { a: 6, b: 12, div: 6 },
      { a: 4, b: 12, div: 4 },
    ];

    if (Math.random() < 0.6) {
      const c = amplifiables[rand(0, amplifiables.length - 1)];
      const f = c.mult[rand(0, c.mult.length - 1)];
      return {
        type: "frac2", mode: "amp",
        a: c.a, b: c.b,
        cAns: c.a * f, d: c.b * f,
      };
    } else {
      const s = simplifiables[rand(0, simplifiables.length - 1)];
      return {
        type: "frac2", mode: "simp",
        a: s.a, b: s.b,
        cAns: s.a / s.div, d: s.b / s.div,
      };
    }
  }

  // frac3 — decimal → fracción, dificultad creciente por idx
  // Ejercicio 0: décima exacta (denom 2 o 5).
  // Ejercicio 1: centésima exacta (denom 4, 5, 20, 25).
  // Ejercicio 2: decimal periódico puro (denom 3, 6, 9).
  const round1 = [
    { decStr: "0,5", num: 1, denom: 2 },
    { decStr: "0,2", num: 1, denom: 5 },
    { decStr: "0,4", num: 2, denom: 5 },
    { decStr: "0,6", num: 3, denom: 5 },
    { decStr: "0,8", num: 4, denom: 5 },
  ];
  const round2 = [
    { decStr: "0,25", num: 1, denom: 4 },
    { decStr: "0,75", num: 3, denom: 4 },
    { decStr: "0,05", num: 1, denom: 20 },
    { decStr: "0,15", num: 3, denom: 20 },
    { decStr: "0,35", num: 7, denom: 20 },
    { decStr: "0,45", num: 9, denom: 20 },
    { decStr: "0,40", num: 2, denom: 5 },
    { decStr: "0,04", num: 1, denom: 25 },
  ];
  const round3 = [
    { decStr: "0,333…", num: 1, denom: 3 },
    { decStr: "0,666…", num: 2, denom: 3 },
    { decStr: "0,111…", num: 1, denom: 9 },
    { decStr: "0,222…", num: 2, denom: 9 },
    { decStr: "0,444…", num: 4, denom: 9 },
    { decStr: "0,555…", num: 5, denom: 9 },
    { decStr: "0,777…", num: 7, denom: 9 },
    { decStr: "0,888…", num: 8, denom: 9 },
  ];
  const pool = idx <= 0 ? round1 : idx === 1 ? round2 : round3;
  const p = pool[rand(0, pool.length - 1)];
  return { type: "frac3", decStr: p.decStr, num: p.num, denom: p.denom, idx };
}

// ─────────────────────────────────────────────────────────────
// Componentes de presentación: Pizza (SVG)
// ─────────────────────────────────────────────────────────────
function PizzaSlice({ cx, cy, r, startAngle, endAngle, painted, onClick, baseColor }) {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  return (
    <path
      d={path}
      fill={painted ? baseColor : "rgba(255,255,255,0.06)"}
      stroke="#fce9a8"
      strokeWidth={2}
      strokeLinejoin="round"
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        transition: "fill 0.15s ease",
        filter: painted ? "drop-shadow(0 0 6px rgba(242,194,96,0.5))" : "none",
      }}
    />
  );
}

function Pizza({ denom, painted, onSlice, size = 240, baseColor = "#f2c260" }) {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const slices = [];
  for (let i = 0; i < denom; i++) {
    const startAngle = (i / denom) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((i + 1) / denom) * 2 * Math.PI - Math.PI / 2;
    const isPainted = painted instanceof Set ? painted.has(i) : i < painted;
    slices.push(
      <PizzaSlice
        key={i}
        cx={cx} cy={cy} r={r}
        startAngle={startAngle}
        endAngle={endAngle}
        painted={isPainted}
        onClick={onSlice ? () => onSlice(i) : undefined}
        baseColor={baseColor}
      />
    );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={cx} cy={cy} r={r + 3} fill="rgba(0,0,0,0.25)" />
      {slices}
    </svg>
  );
}

// Slot de un solo dígito (lo usa frac3). `size` controla width; height crece proporcional.
function SlotBox({ value, feedback, size = 42 }) {
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

// Visualiza una fracción a/b en formato apilado simple
function Fraction({ a, b }) {
  return (
    <span style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center",
      lineHeight: 1, verticalAlign: "middle",
    }}>
      <span>{a}</span>
      <span style={{ width: 22, height: 2, background: "currentColor", margin: "2px 0" }} />
      <span>{b}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Mensajes motivadores cuando se falla un ejercicio
// ─────────────────────────────────────────────────────────────
const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "Las fracciones tienen su truco.",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Cuenta con cuidado las partes.",
  "¡Vamos al siguiente reto!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO — 3 mecánicas según `cat`
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "frac1";
  const catLabel = app.currentCatLabel || "Fracciones";

  const [problem, setProblem] = useStateG(() => makeProblem(cat, 0));

  // Estado por mecánica:
  // frac1 → painted: Set<number>
  // frac2 → numAnswer: string ("" | "1" | "12")
  // frac3 → topDigits[2] (numerador), botDigits[2] (denominador)
  const [painted, setPainted] = useStateG(() => new Set());
  const [numAnswer, setNumAnswer] = useStateG("");
  const [topDigits, setTopDigits] = useStateG([]);
  const [botDigits, setBotDigits] = useStateG([]);

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [pendingLevel, setPendingLevel] = useStateG(null);
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [log, setLog] = useStateG([]);

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // Reset del input cuando cambia el problema (incluye el problema inicial)
  useEffectG(() => {
    if (problem.type === "frac1") {
      setPainted(new Set());
    } else if (problem.type === "frac2") {
      setNumAnswer("");
    } else if (problem.type === "frac3") {
      // Slots dinámicos: largo exacto de la fracción objetivo (irreducible).
      // Ej: 1/2 → 1 slot arriba + 1 abajo. 7/20 → 1 slot arriba + 2 abajo.
      const numLen = String(problem.num).length;
      const denomLen = String(problem.denom).length;
      setTopDigits(Array(numLen).fill(""));
      setBotDigits(Array(denomLen).fill(""));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem]);

  // Cronómetro total
  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  function togglePaint(i) {
    if (problem.type !== "frac1") return;
    setPainted((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  function pressDigit(d) {
    if (problem.type === "frac2") {
      // No permitir leading zero — el slot debe mostrar "8", no "08".
      if (numAnswer === "" && d === "0") return;
      setNumAnswer((prev) => prev.length < 2 ? prev + d : prev);
      return;
    }
    if (problem.type === "frac3") {
      // Llena numerador (izq→der), luego denominador.
      const tIdx = topDigits.findIndex((x) => x === "");
      if (tIdx >= 0) {
        setTopDigits((prev) => { const n = [...prev]; n[tIdx] = d; return n; });
        return;
      }
      const bIdx = botDigits.findIndex((x) => x === "");
      if (bIdx >= 0) {
        setBotDigits((prev) => { const n = [...prev]; n[bIdx] = d; return n; });
      }
    }
  }

  function eraseLast() {
    if (problem.type === "frac1") {
      setPainted(new Set());
      return;
    }
    if (problem.type === "frac2") {
      setNumAnswer((prev) => prev.slice(0, -1));
      return;
    }
    if (problem.type === "frac3") {
      // Borra el último ingresado: denominador de der→izq, luego numerador.
      for (let i = botDigits.length - 1; i >= 0; i--) {
        if (botDigits[i] !== "") {
          setBotDigits((prev) => { const n = [...prev]; n[i] = ""; return n; });
          return;
        }
      }
      for (let i = topDigits.length - 1; i >= 0; i--) {
        if (topDigits[i] !== "") {
          setTopDigits((prev) => { const n = [...prev]; n[i] = ""; return n; });
          return;
        }
      }
    }
  }

  function verify() {
    let userAnswerVal, correctAnswerVal, isCorrect;
    let opLabel, aField, bField;

    if (problem.type === "frac1") {
      if (painted.size === 0) {
        setFeedback("err");
        setFeedbackMsg("Pintá al menos una porción");
        setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
        return;
      }
      userAnswerVal = `${painted.size}/${problem.denom}`;
      correctAnswerVal = `${problem.num}/${problem.denom}`;
      isCorrect = painted.size === problem.num;
      opLabel = "/";
      aField = problem.num;
      bField = problem.denom;
    } else if (problem.type === "frac2") {
      if (numAnswer === "") {
        setFeedback("err");
        setFeedbackMsg("Completa el casillero");
        setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
        return;
      }
      const v = parseInt(numAnswer, 10);
      userAnswerVal = `${v}/${problem.d}`;
      correctAnswerVal = `${problem.cAns}/${problem.d}`;
      isCorrect = v === problem.cAns;
      opLabel = "=";
      aField = `${problem.a}/${problem.b}`;
      bField = `?/${problem.d}`;
    } else {
      // frac3 — validación estricta: sólo la fracción irreducible.
      // Slots son del largo exacto de la respuesta, así que no admiten
      // leading zeros ni equivalentes (5/10 ya no entra en slots de 1+1).
      const topComplete = topDigits.length > 0 && topDigits.every((x) => x !== "");
      const botComplete = botDigits.length > 0 && botDigits.every((x) => x !== "");
      if (!topComplete || !botComplete) {
        setFeedback("err");
        setFeedbackMsg("Completa la fracción");
        setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
        return;
      }
      const userNum = parseInt(topDigits.join(""), 10);
      const userDenom = parseInt(botDigits.join(""), 10);
      isCorrect = userNum === problem.num && userDenom === problem.denom;
      userAnswerVal = `${userNum}/${userDenom}`;
      correctAnswerVal = `${problem.num}/${problem.denom}`;
      opLabel = "=";
      aField = problem.decStr;
      bField = `${problem.num}/${problem.denom}`;
    }

    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;

    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsSession = starsSession + earned;
    const newStarsTotal = stars + earned;

    const entry = {
      idx: newAttempted,
      a: aField,
      b: bField,
      op: opLabel,
      correctAnswer: correctAnswerVal,
      userAnswer: userAnswerVal,
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

    const wait = isCorrect ? 950 : 2600;
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
        // newAttempted = índice del PRÓXIMO ejercicio (0,1,2 → 1,2). Para
        // niveles que escalan dificultad por idx (frac3) esto es clave.
        setProblem(makeProblem(cat, newAttempted));
        exerciseStart.current = Date.now();
      }
    }, wait);
  }

  function applyLevelChange(newLevel) {
    let catId = "frac1", catLabel = "Fracciones";
    if (newLevel === "medium") { catId = "frac2"; catLabel = "Equivalentes"; }
    else if (newLevel === "advanced") { catId = "frac3"; catLabel = "Decimales y fracciones"; }
    setApp((s) => ({ ...s, level: newLevel, currentCategory: catId, currentCatLabel: catLabel }));
    setProblem(makeProblem(catId, 0));
    setSolved(0);
    setAttempted(0);
    setStarsSession(0);
    setLog([]);
    setFeedback(null);
    setFeedbackMsg("");
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

  const bocadilloText = {
    frac1: "Toca las porciones para representarla.",
    frac2: "Encuentra el numerador equivalente.",
    frac3: "Escribe la fracción más simple.",
  }[problem.type];

  const instructionText = (() => {
    if (problem.type === "frac1") return "Pinta la siguiente fracción";
    if (problem.type === "frac2") {
      return problem.mode === "amp" ? "Amplifica la fracción" : "Simplifica la fracción";
    }
    return "¿A qué fracción equivale?";
  })();

  const showNumpad = problem.type !== "frac1";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* HUD superior */}
      <div data-qa="hud" style={{ position: "absolute", top: 10, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <EdinunLogoMini size={64} />
        </div>

        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {[
            { id: "basic", label: "FRACCIONES", c: "#f5a623" },
            { id: "medium", label: "EQUIVALENTES", c: "#f5d84b" },
            { id: "advanced", label: "DECIMALES", c: "#4fa0ff" },
          ].map((lv) => {
            const active = lv.id === levelOfCat;
            return (
              <button
                key={lv.id}
                onClick={() => { if (!active) setPendingLevel(lv.id); }}
                disabled={active}
                style={{
                  padding: "6px 12px", borderRadius: 999,
                  background: active ? lv.c : "rgba(255,255,255,0.15)",
                  color: active ? "#0b3a2d" : "rgba(255,255,255,0.85)",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 12,
                  border: active ? `2px solid ${lv.c}` : "2px solid transparent",
                  boxShadow: active ? `0 0 14px ${lv.c}88` : "none",
                  cursor: active ? "default" : "pointer",
                  transition: "background 0.15s ease, transform 0.1s ease",
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

      {/* Indicador de Ronda — centrado bajo el HUD, arriba del contenido. */}
      <div style={{
        position: "absolute", top: 64, left: "50%", transform: "translateX(-50%)",
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

      {/* ══════ ZONA CENTRAL — varía por mecánica ══════ */}
      {problem.type === "frac1" && (
        <div data-qa="zona-central" style={{
          position: "absolute", left: "50%", top: 100, transform: "translateX(-50%)",
          width: 540, bottom: 28,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "space-around",
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 700,
            fontSize: 26, lineHeight: 1.1,
            color: "#fff",
            textShadow: "0 2px 6px rgba(0,0,0,0.45)",
          }}>
            {instructionText}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32 }}>
            {/* Fracción objetivo apilada — referencia visual al lado de la pizza. */}
            <div style={{
              fontFamily: "var(--ed-font-display)", fontWeight: 700,
              color: "#fce9a8", lineHeight: 1,
              display: "inline-flex", flexDirection: "column", alignItems: "center",
              fontSize: 100,
              textShadow: "0 0 18px rgba(252,233,168,0.45), 0 3px 0 rgba(0,0,0,0.35)",
            }}>
              <span>{problem.num}</span>
              <span style={{ width: 86, height: 6, background: "#fce9a8", margin: "8px 0", borderRadius: 3 }} />
              <span>{problem.denom}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Pizza
                denom={problem.denom}
                painted={painted}
                onSlice={togglePaint}
                size={300}
              />
              <div style={{
                marginTop: 10,
                fontFamily: "var(--ed-font-mono)", fontSize: 14,
                color: "rgba(255,255,255,0.7)",
              }}>
                Pintadas: {painted.size} / {problem.denom}
              </div>
            </div>
          </div>
        </div>
      )}

      {problem.type === "frac2" && (
        <div data-qa="zona-central" style={{
          position: "absolute", left: "50%", top: 100, transform: "translateX(-50%)",
          width: 540, bottom: 92,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "space-around",
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 700,
            fontSize: 26, lineHeight: 1.1,
            color: "#fff",
            textShadow: "0 2px 6px rgba(0,0,0,0.45)",
          }}>
            {instructionText}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 22 }}>
            {/* Pizza A — fija */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <Pizza denom={problem.b} painted={problem.a} size={185} baseColor="#f2c260" />
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 36,
                color: "#fce9a8", lineHeight: 1,
              }}>
                <Fraction a={problem.a} b={problem.b} />
              </div>
            </div>

            <div style={{
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 42,
              color: "#fff",
            }}>=</div>

            {/* Pizza B — autopinta según el numerador escrito; slot apilado debajo */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <Pizza
                denom={problem.d}
                painted={numAnswer === "" ? 0 : Math.min(parseInt(numAnswer, 10) || 0, problem.d)}
                size={185}
                baseColor="rgba(252,233,168,0.55)"
              />
              {/* Slot apilado: numerador arriba (dashed), barra, denominador abajo */}
              <div style={{
                display: "inline-flex", flexDirection: "column", alignItems: "center",
                lineHeight: 1,
              }}>
                <span style={{
                  minWidth: 50, height: 44,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: `2px dashed ${numAnswer ? "#2ecc8f" : "#fce9a8"}`,
                  borderRadius: 8,
                  padding: "0 6px",
                  background: numAnswer ? "rgba(46,204,143,0.18)" : "rgba(252,233,168,0.08)",
                  color: numAnswer ? "#2ecc8f" : "#fce9a8",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 32,
                }}>
                  {numAnswer || "?"}
                </span>
                <span style={{ width: 54, height: 4, background: "#fce9a8", margin: "6px 0", borderRadius: 2 }} />
                <span style={{
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 32,
                  color: "#fce9a8",
                }}>
                  {problem.d}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {problem.type === "frac3" && (() => {
        const numLen = String(problem.num).length;
        const denomLen = String(problem.denom).length;
        const maxLen = Math.max(numLen, denomLen);
        const slotW = 64;
        const gap = 6;
        const barW = maxLen * slotW + Math.max(0, maxLen - 1) * gap + 8;
        const tipo = problem.idx === 0
          ? "DECIMAL EXACTO · UNA CIFRA"
          : problem.idx === 1
            ? "DECIMAL EXACTO · DOS CIFRAS"
            : "DECIMAL PERIÓDICO";
        return (
          <div data-qa="zona-central" style={{
            position: "absolute", left: "50%", top: 100, transform: "translateX(-50%)",
            width: 540, bottom: 92,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "space-around",
            textAlign: "center",
          }}>
            <div>
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 700,
                fontSize: 26, lineHeight: 1.1,
                color: "#fff", marginBottom: 8,
                textShadow: "0 2px 6px rgba(0,0,0,0.45)",
              }}>
                {instructionText}
              </div>
              <div style={{
                fontFamily: "var(--ed-font-mono)", fontSize: 12,
                color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}>
                {tipo}
              </div>
            </div>

            {/* Decimal gigante + igual + fracción objetivo, todo en una fila */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 28,
            }}>
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 700,
                fontSize: 110, lineHeight: 1, color: "#fce9a8",
                textShadow: "0 0 18px rgba(252,233,168,0.45), 0 3px 0 rgba(0,0,0,0.35)",
              }}>
                {problem.decStr}
              </div>

              <span style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 60,
                color: "#fff",
              }}>=</span>

              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ display: "flex", gap }}>
                  {topDigits.map((d, i) => <SlotBox key={`t${i}`} value={d} feedback={feedback} size={slotW} />)}
                </div>
                <div style={{
                  width: barW, height: 5, background: "#fff", borderRadius: 2,
                  margin: "8px 0", boxShadow: "0 0 8px rgba(255,255,255,0.4)",
                }} />
                <div style={{ display: "flex", gap }}>
                  {botDigits.map((d, i) => <SlotBox key={`b${i}`} value={d} feedback={feedback} size={slotW} />)}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Numpad — solo si la mecánica lo necesita */}
      {showNumpad && (
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
                  borderColor: color,
                  borderWidth: 2, borderStyle: "solid",
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

      {/* Botones de acción */}
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
          onClick={eraseLast}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          BORRAR
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
        const labels = { basic: "Fracciones", medium: "Equivalentes", advanced: "Decimales" };
        const colors = { basic: "#f5a623", medium: "#f5d84b", advanced: "#4fa0ff" };
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
                style={{
                  padding: 24, maxWidth: 440, textAlign: "center",
                  boxShadow: "var(--ed-shadow-card), 0 0 40px rgba(242,194,96,0.35)",
                }}
              >
                <div className="ed-label" style={{ color: "#fce9a8", marginBottom: 6 }}>
                  Cambiar nivel
                </div>
                <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
                  ¿Cambiar a <span style={{ color: colors[pendingLevel] }}>{labels[pendingLevel]}</span>?
                </h2>
                <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
                  Vas a reiniciar la ronda actual. Perderás el progreso de los
                  ejercicios resueltos hasta ahora en esta sesión.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    className="ed-btn ed-btn-ghost"
                    onClick={() => setPendingLevel(null)}
                    style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}
                  >
                    CANCELAR
                  </button>
                  <button
                    className="ed-btn ed-btn-primary"
                    onClick={() => { applyLevelChange(pendingLevel); setPendingLevel(null); }}
                    style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}
                  >
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
// PANTALLA DE RESULTADOS — sin cambios estructurales
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
              <th style={printStyles.th}>Ejercicio</th>
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
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{e.a} {e.op} {e.b}</td>
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
  const res = app.lastResult || { category: "Fracciones", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Ejercicio</th>
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
