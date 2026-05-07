// game-screens.jsx — Juego de Conversión entre unidades de masa
// (1 nivel, 3 rondas con mecánicas distintas).
// Audiencia 10 años (excepción al default 6-8 del repo).

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

// Portal a <body> para sacar overlays/modales del scope del DeviceStage.
function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Conversiones — toda la aritmética se hace en GRAMOS.
//   1 kg = 1 000 g
//   1 t  = 1 000 000 g
//   1 lb ≈ 454 g (redondeado a entero, factor real 453,59)
//   1 mg = 0,001 g
// El factor lb se aproxima a 454 para mantener respuestas enteras.
// Para conversiones kg ↔ lb el libro usa 1 kg = 2,2 lb (pool entero).
// ─────────────────────────────────────────────────────────────
const G_PER_KG = 1000;
const G_PER_T = 1000000;
const G_PER_LB = 454;

function toGrams(value, unit) {
  if (unit === "g") return value;
  if (unit === "kg") return value * G_PER_KG;
  if (unit === "t") return value * G_PER_T;
  if (unit === "lb") return value * G_PER_LB;
  if (unit === "mg") return value / 1000;
  return value;
}

function fromGrams(grams, unit) {
  if (unit === "g") return grams;
  if (unit === "kg") return grams / G_PER_KG;
  if (unit === "t") return grams / G_PER_T;
  if (unit === "lb") return grams / G_PER_LB;
  if (unit === "mg") return grams * 1000;
  return grams;
}

// Helper para mostrar números con coma decimal (es-CO style).
function fmt(n) {
  if (Number.isInteger(n)) return String(n);
  const rounded = Math.round(n * 1000) / 1000;
  return String(rounded).replace(".", ",");
}

// ─────────────────────────────────────────────────────────────
// Pool de objetos para R1 (¿Cuál pesa más?)
// ─────────────────────────────────────────────────────────────
const OBJECTS = [
  { name: "Lápiz", massG: 8 },
  { name: "Hoja", massG: 5 },
  { name: "Manzana", massG: 180 },
  { name: "Pelota", massG: 600 },
  { name: "Libro", massG: 800 },
  { name: "Botella 1L", massG: 1000 },
  { name: "Papaya", massG: 1300 },
  { name: "Caja galletas", massG: 2000 },
  { name: "Mochila", massG: 3000 },
  { name: "Sandía", massG: 8000 },
  { name: "Bicicleta", massG: 12000 },
  { name: "Perro", massG: 26000 },
  { name: "Persona", massG: 70000 },
  { name: "Auto", massG: 1500000 },
  { name: "Camión", massG: 2800000 },
];

// Devuelve una unidad de display razonable para una masa en gramos.
// Sortea entre opciones válidas para esa magnitud.
function pickDisplayUnit(massG) {
  const candidates = [];
  if (massG < 1000) candidates.push("g");
  if (massG >= 500 && massG < 100000) candidates.push("kg");
  if (massG >= 1000 && massG < 1000000 && massG % G_PER_LB < 10) candidates.push("lb");
  if (massG >= 100000) candidates.push("kg");
  if (massG >= 1000000) candidates.push("t");
  if (candidates.length === 0) candidates.push("g");
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ─────────────────────────────────────────────────────────────
// Generador de problemas — 1 categoría ("masa"), 3 rondas con
// mecánicas distintas.
//   idx 0 → ¿Cuál pesa más? (3 productos en unidades distintas)
//   idx 1 → ¿Cuál NO equivale? (1 origen + 4 opciones, 1 falsa)
//   idx 2 → Conversión paso a paso (numpad 2 pasos)
// ─────────────────────────────────────────────────────────────
function makeProblem(cat, idx = 0) {
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const pickN = (arr, n) => {
    const copy = [...arr];
    const out = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      out.push(copy.splice(rand(0, copy.length - 1), 1)[0]);
    }
    return out;
  };

  if (idx === 0) {
    // R1 — Balanza binaria. 2 masas en unidades distintas, decidir si
    // pesa más la izquierda, son iguales, o pesa más la derecha.
    //
    // Outcome se decide primero (40% left, 20% equal, 40% right) y luego
    // se elige el par desde un pool curado.
    const outcomeRoll = rand(0, 9);
    let outcome;
    if (outcomeRoll < 4) outcome = "left";
    else if (outcomeRoll < 6) outcome = "equal";
    else outcome = "right";

    // Pares EQUIVALENTES (mismo peso real, distintas unidades).
    const equalPairs = [
      [5, "kg", 11, "lb"],
      [10, "kg", 22, "lb"],
      [25, "kg", 55, "lb"],
      [1, "t", 1000, "kg"],
      [2, "t", 2000, "kg"],
      [1, "kg", 1000, "g"],
      [3, "kg", 3000, "g"],
      [5000, "g", 5, "kg"],
      [11, "lb", 5, "kg"],
      [22, "lb", 10, "kg"],
    ];

    // Pares DESIGUALES con izquierda más pesada.
    const leftHeavier = [
      [3, "kg", 2500, "g"],     // 3000 vs 2500
      [1, "kg", 800, "g"],       // 1000 vs 800
      [5, "kg", 5, "lb"],        // 5000 vs 2270
      [22, "lb", 5, "kg"],       // 10000 vs 5000
      [1, "t", 900, "kg"],       // 1000000 vs 900000
      [10, "kg", 10, "lb"],      // 10000 vs 4540
      [2, "kg", 1500, "g"],      // 2000 vs 1500
      [55, "lb", 20, "kg"],      // ~25000 vs 20000
      [3, "t", 2500, "kg"],      // 3000000 vs 2500000
      [50, "kg", 100, "lb"],     // 50000 vs 45400
    ];

    let pair;
    if (outcome === "equal") {
      pair = equalPairs[rand(0, equalPairs.length - 1)];
    } else if (outcome === "left") {
      pair = leftHeavier[rand(0, leftHeavier.length - 1)];
    } else {
      // right: tomar uno de leftHeavier y voltear lados
      const p = leftHeavier[rand(0, leftHeavier.length - 1)];
      pair = [p[2], p[3], p[0], p[1]];
    }

    return {
      type: "masa", idx,
      left: { value: pair[0], unit: pair[1] },
      right: { value: pair[2], unit: pair[3] },
      outcome,
    };
  }

  if (idx === 1) {
    // R2 — ¿Cuál NO equivale? Pool curado con valores SENCILLOS para
    // 10 años: solo equivalencias ENTERAS (sin decimales raros, sin
    // mg con millones de ceros). 2 correctas + 1 falsa = 3 opciones.
    const sources = [
      { unit: "kg", value: 5, equivalences: [
        { unit: "g", value: 5000 },
        { unit: "lb", value: 11 },
      ]},
      { unit: "kg", value: 10, equivalences: [
        { unit: "g", value: 10000 },
        { unit: "lb", value: 22 },
      ]},
      { unit: "kg", value: 25, equivalences: [
        { unit: "g", value: 25000 },
        { unit: "lb", value: 55 },
      ]},
      { unit: "kg", value: 50, equivalences: [
        { unit: "g", value: 50000 },
        { unit: "lb", value: 110 },
      ]},
      { unit: "kg", value: 100, equivalences: [
        { unit: "g", value: 100000 },
        { unit: "lb", value: 220 },
      ]},
      { unit: "kg", value: 1000, equivalences: [
        { unit: "t", value: 1 },
        { unit: "g", value: 1000000 },
        { unit: "lb", value: 2200 },
      ]},
      { unit: "t", value: 1, equivalences: [
        { unit: "kg", value: 1000 },
        { unit: "lb", value: 2200 },
      ]},
      { unit: "t", value: 2, equivalences: [
        { unit: "kg", value: 2000 },
        { unit: "lb", value: 4400 },
      ]},
      { unit: "t", value: 5, equivalences: [
        { unit: "kg", value: 5000 },
        { unit: "lb", value: 11000 },
      ]},
      { unit: "lb", value: 11, equivalences: [
        { unit: "kg", value: 5 },
        { unit: "g", value: 5000 },
      ]},
      { unit: "lb", value: 22, equivalences: [
        { unit: "kg", value: 10 },
        { unit: "g", value: 10000 },
      ]},
      { unit: "lb", value: 55, equivalences: [
        { unit: "kg", value: 25 },
        { unit: "g", value: 25000 },
      ]},
      { unit: "g", value: 5000, equivalences: [
        { unit: "kg", value: 5 },
        { unit: "lb", value: 11 },
      ]},
      { unit: "g", value: 10000, equivalences: [
        { unit: "kg", value: 10 },
        { unit: "lb", value: 22 },
      ]},
      { unit: "g", value: 25000, equivalences: [
        { unit: "kg", value: 25 },
        { unit: "lb", value: 55 },
      ]},
    ];

    const src = sources[rand(0, sources.length - 1)];

    // Tomar 2 correctas (sortear el orden si hay 3, tomar las 2 primeras).
    const shuffled = pickN(src.equivalences, src.equivalences.length);
    const corrects = shuffled.slice(0, 2);

    // Falsa: tomar una de las equivalencias correctas y moverle los ceros.
    // Validar que el resultado NO coincida con ninguna correcta.
    const baseFalse = corrects[rand(0, corrects.length - 1)];
    const corruptOps = [10, 100, 0.1];
    let falseValue;
    let attempts = 0;
    do {
      const op = corruptOps[rand(0, corruptOps.length - 1)];
      falseValue = baseFalse.value * op;
      attempts++;
    } while (
      attempts < 8 &&
      corrects.some((c) => c.unit === baseFalse.unit && Math.abs(c.value - falseValue) < 1e-9)
    );
    const falseOption = { unit: baseFalse.unit, value: falseValue, isFalse: true };

    const allOptions = [...corrects.map((c) => ({ ...c, isFalse: false })), falseOption];
    // Shuffle
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = rand(0, i);
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }

    return {
      type: "masa", idx,
      source: { unit: src.unit, value: src.value },
      options: allOptions,
    };
  }

  // R3 — Conversión paso a paso. 2 saltos.
  const chains = [
    {
      sourceUnit: "t", midUnit: "kg", finalUnit: "g",
      values: [1, 2, 3, 5, 7, 10],
      midFactor: 1000, finalFactor: 1000,
    },
    {
      sourceUnit: "g", midUnit: "kg", finalUnit: "t",
      values: [1000000, 2000000, 5000000, 7000000, 10000000],
      midFactor: 1 / 1000, finalFactor: 1 / 1000,
    },
    {
      sourceUnit: "lb", midUnit: "kg", finalUnit: "g",
      values: [11, 22, 33, 44, 55, 110, 220],
      midFactor: 1 / 2.2, finalFactor: 1000,
    },
    {
      sourceUnit: "kg", midUnit: "g", finalUnit: "mg",
      values: [1, 2, 3, 5, 10],
      midFactor: 1000, finalFactor: 1000,
    },
  ];

  const chain = chains[rand(0, chains.length - 1)];
  const sourceValue = chain.values[rand(0, chain.values.length - 1)];
  const midValue = sourceValue * chain.midFactor;
  const finalValue = midValue * chain.finalFactor;

  return {
    type: "masa", idx,
    sourceUnit: chain.sourceUnit, sourceValue,
    midUnit: chain.midUnit, midValue,
    finalUnit: chain.finalUnit, finalValue,
  };
}

// ─────────────────────────────────────────────────────────────
// Slot de un solo dígito.
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

// answerLayout: dado un valor (puede ser decimal), devuelve los slots
// con la coma fija si corresponde.
function answerLayout(value) {
  const str = fmt(value);
  return str.split("").map((c) => (c === "," ? "," : "_"));
}

// ─────────────────────────────────────────────────────────────
// Mensajes motivadores
// ─────────────────────────────────────────────────────────────
const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "Recuerda los factores de conversión.",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Mira de nuevo cuántos ceros se mueven.",
  "¡Vamos al siguiente reto!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "masa";
  const catLabel = app.currentCatLabel || "Conversión entre unidades de masa";

  const [problem, setProblem] = useStateG(() => makeProblem(cat, 0));

  const [currentStepIdx, setCurrentStepIdx] = useStateG(0);
  const [completedSteps, setCompletedSteps] = useStateG([]);
  const [slots, setSlots] = useStateG([]);

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [log, setLog] = useStateG([]);

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // Reset slots cuando cambia el problema o el paso (solo R3).
  useEffectG(() => {
    if (problem && problem.idx === 2) {
      const target = currentStepIdx === 0 ? problem.midValue : problem.finalValue;
      setSlots(answerLayout(target));
    } else {
      setSlots([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem, currentStepIdx]);

  // Reset al cambiar de problema.
  useEffectG(() => {
    setCurrentStepIdx(0);
    setCompletedSteps([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem]);

  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  // ────── R1: balanza binaria ──────
  // chosen ∈ {"left","equal","right"}. Correcto si === problem.outcome.
  const outcomeLabel = (o) =>
    o === "left" ? "Izquierda pesa más" :
    o === "right" ? "Derecha pesa más" :
    "Son iguales";

  function answerTapR1(chosen) {
    if (problem.idx !== 0 || feedback !== null) return;
    const isCorrect = chosen === problem.outcome;

    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    const entry = {
      a: `${fmt(problem.left.value)} ${problem.left.unit} vs ${fmt(problem.right.value)} ${problem.right.unit}`,
      b: "¿cuál pesa más?",
      op: "→",
      correctAnswer: outcomeLabel(problem.outcome),
      userAnswer: outcomeLabel(chosen),
    };
    finalize(isCorrect, entry);
  }

  // ────── R2: tap directo sobre la opción NO equivalente ──────
  function answerTapR2(chosenIdx) {
    if (problem.idx !== 1 || feedback !== null) return;
    const chosen = problem.options[chosenIdx];
    const isCorrect = chosen.isFalse === true;

    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    const falseOption = problem.options.find((o) => o.isFalse);

    const entry = {
      a: `${fmt(problem.source.value)} ${problem.source.unit}`,
      b: "no equivale a",
      op: "≠",
      correctAnswer: `${fmt(falseOption.value)} ${falseOption.unit}`,
      userAnswer: `${fmt(chosen.value)} ${chosen.unit}`,
    };
    finalize(isCorrect, entry);
  }

  // ────── R3: numpad paso a paso ──────
  function pressDigit(d) {
    if (problem.idx !== 2) return;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === "_") {
        if (i === 0 && d === "0") {
          const nextIsComma = slots[1] === ",";
          if (!nextIsComma) return;
        }
        const next = [...slots];
        next[i] = d;
        setSlots(next);
        return;
      }
    }
  }

  function eraseLast() {
    if (problem.idx !== 2) return;
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots[i] !== "_" && slots[i] !== ",") {
        const next = [...slots];
        next[i] = "_";
        setSlots(next);
        return;
      }
    }
  }

  function verify() {
    if (problem.idx !== 2) return;
    const target = currentStepIdx === 0 ? problem.midValue : problem.finalValue;

    const allFilled = slots.every((s) => s !== "_");
    if (!allFilled) {
      setFeedback("err");
      setFeedbackMsg("Completa la respuesta");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }

    const userStr = slots.join("").replace(",", ".");
    const userVal = parseFloat(userStr);

    if (Math.abs(userVal - target) > 0.0001) {
      // R3: una respuesta incorrecta termina el ejercicio.
      if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

      const entry = {
        a: `${fmt(problem.sourceValue)} ${problem.sourceUnit}`,
        b: problem.finalUnit,
        op: "=",
        correctAnswer: fmt(problem.finalValue),
        userAnswer: fmt(userVal),
      };
      finalize(false, entry);
      return;
    }

    // Paso correcto.
    const stepResult = { stepIdx: currentStepIdx, value: target };
    const newCompletedSteps = [...completedSteps, stepResult];
    setCompletedSteps(newCompletedSteps);

    if (currentStepIdx === 1) {
      // Último paso — ejercicio completo.
      if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

      const entry = {
        a: `${fmt(problem.sourceValue)} ${problem.sourceUnit}`,
        b: problem.finalUnit,
        op: "=",
        correctAnswer: fmt(problem.finalValue),
        userAnswer: fmt(userVal),
      };
      finalize(true, entry);
    } else {
      setFeedback("ok");
      setFeedbackMsg(`${fmt(target)} ${problem.midUnit} ✓`);
      setTimeout(() => {
        setFeedback(null);
        setFeedbackMsg("");
        setCurrentStepIdx(1);
      }, 600);
    }
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

    const wait = isCorrect ? 950 : 1200;
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

  function restartGame() {
    setProblem(makeProblem(cat, 0));
    setSlots([]);
    setCurrentStepIdx(0);
    setCompletedSteps([]);
    setStars(0);
    setSolved(0);
    setAttempted(0);
    setStarsSession(0);
    setLog([]);
    setFeedback(null);
    setFeedbackMsg("");
    started.current = Date.now();
    exerciseStart.current = Date.now();
  }

  const bocadilloText = problem.idx === 0
    ? "Selecciona la respuesta correcta."
    : "Ingresa los números correctos.";
  const instructionText =
    problem.idx === 0 ? "¿Cuál pesa más?" :
    problem.idx === 1 ? "¿Cuál NO equivale?" :
    "Convierte paso a paso";

  function slotSize() {
    const expectedLen = slots.filter((s) => s === "_").length;
    if (expectedLen <= 1) return 52;
    if (expectedLen === 2) return 46;
    if (expectedLen === 3) return 40;
    if (expectedLen === 4) return 36;
    if (expectedLen === 5) return 32;
    if (expectedLen === 6) return 30;
    return 28;
  }

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

      {/* Indicador de Ronda */}
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

      {/* Bocadillo de pista */}
      <div data-qa="bocadillo" style={{
        position: "absolute", left: 14, top: 130, width: 215,
        pointerEvents: "none",
      }}>
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

      {/* Personaje */}
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
          <char.Component size={200} floating />
        </div>
        <div style={{
          marginTop: -4,
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 14,
          color: "#fce9a8", letterSpacing: "0.04em",
          textShadow: "0 2px 6px rgba(0,0,0,0.6)",
        }}>{char.name}</div>
      </div>

      {/* ══════ ZONA CENTRAL ══════ */}
      <div data-qa="zona-central" style={{
        position: "absolute", left: "50%",
        top: 88,
        bottom: problem.idx === 2 ? 100 : 18,
        transform: "translateX(-50%)",
        width: 600,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "space-evenly",
        textAlign: "center",
      }}>
        {/* Instrucción */}
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 700,
          fontSize: 26, lineHeight: 1.1,
          color: "#fff",
          textShadow: "0 2px 6px rgba(0,0,0,0.45)",
        }}>
          {instructionText}
        </div>

        {/* ────── R1: Balanza binaria ────── */}
        {problem.idx === 0 && (() => {
          // Tilt visual: el lado más PESADO baja.
          // CSS rotate(+N): el extremo DERECHO baja (clockwise).
          // CSS rotate(-N): el extremo IZQUIERDO baja (counter-clockwise).
          const tilt = feedback !== null
            ? (problem.outcome === "left" ? -7 : problem.outcome === "right" ? 7 : 0)
            : 0;

          // Platillo (cup-shape con valor adentro). Reusable para left/right.
          const Pan = ({ value, unit }) => (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 0,
            }}>
              {/* Cuerda */}
              <div style={{
                width: 2, height: 30,
                background: "linear-gradient(180deg, #fce9a8, #b8841d)",
                boxShadow: "1px 0 0 rgba(0,0,0,0.3)",
              }} />
              {/* Cup superior (label valor) */}
              <div style={{
                position: "relative",
                padding: "12px 20px",
                minWidth: 130,
                background: "linear-gradient(180deg, #fce9a8 0%, #d9a441 60%, #8a5a20 100%)",
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
                borderBottomLeftRadius: 30,
                borderBottomRightRadius: 30,
                border: "2px solid #6b3d0c",
                boxShadow: "0 6px 14px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -3px 0 rgba(0,0,0,0.25)",
                display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4,
                fontFamily: "var(--ed-font-display)", fontWeight: 800,
                color: "#3a1f00",
                textShadow: "0 1px 0 rgba(255,255,255,0.45)",
              }}>
                <span style={{ fontSize: 30 }}>{fmt(value)}</span>
                <span style={{ fontSize: 17, opacity: 0.85 }}>{unit}</span>
              </div>
            </div>
          );

          return (
            <>
              {/* Contenedor de balanza con altura fija para evitar overlap */}
              <div style={{
                position: "relative",
                width: 480, height: 200,
                display: "flex", alignItems: "flex-start", justifyContent: "center",
              }}>
                {/* Beam giratorio + platillos (rotan juntos desde el centro) */}
                <div style={{
                  position: "absolute", top: 20, left: "50%",
                  transform: `translateX(-50%) rotate(${tilt}deg)`,
                  transformOrigin: "center center",
                  transition: "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  width: 320, height: 10,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  {/* Beam horizontal con gradiente metálico */}
                  <div style={{
                    position: "absolute", top: "50%", left: 0, right: 0,
                    transform: "translateY(-50%)",
                    height: 10, borderRadius: 5,
                    background: "linear-gradient(180deg, #fce9a8 0%, #d9a441 50%, #8a5a20 100%)",
                    border: "1.5px solid #6b3d0c",
                    boxShadow: "0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.35)",
                  }} />
                  {/* Bola izquierda (extremo) */}
                  <div style={{
                    position: "relative", zIndex: 2,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 30%, #fce9a8, #d9a441 60%, #6b3d0c)",
                    border: "1.5px solid #4d2900",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                    marginLeft: -4,
                  }} />
                  {/* Platillo izquierdo (clickable — equivalente a botón ← IZQUIERDA) */}
                  <div
                    onClick={() => answerTapR1("left")}
                    style={{
                      position: "absolute", top: 8, left: 6,
                      transform: "translateX(-50%)",
                      cursor: feedback !== null ? "not-allowed" : "pointer",
                      transition: "transform 0.18s ease, filter 0.18s ease",
                      filter: feedback !== null ? "none" : "drop-shadow(0 0 0 rgba(79,216,255,0))",
                    }}
                    onMouseEnter={(e) => {
                      if (feedback === null) {
                        e.currentTarget.style.transform = "translateX(-50%) scale(1.08)";
                        e.currentTarget.style.filter = "drop-shadow(0 0 14px rgba(79,216,255,0.7))";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateX(-50%)";
                      e.currentTarget.style.filter = "drop-shadow(0 0 0 rgba(79,216,255,0))";
                    }}
                  >
                    <Pan value={problem.left.value} unit={problem.left.unit} />
                  </div>
                  {/* Bola derecha */}
                  <div style={{
                    position: "relative", zIndex: 2,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 30%, #fce9a8, #d9a441 60%, #6b3d0c)",
                    border: "1.5px solid #4d2900",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                    marginRight: -4,
                  }} />
                  {/* Platillo derecho (clickable — equivalente a botón DERECHA →) */}
                  <div
                    onClick={() => answerTapR1("right")}
                    style={{
                      position: "absolute", top: 8, right: 6,
                      transform: "translateX(50%)",
                      cursor: feedback !== null ? "not-allowed" : "pointer",
                      transition: "transform 0.18s ease, filter 0.18s ease",
                      filter: feedback !== null ? "none" : "drop-shadow(0 0 0 rgba(79,216,255,0))",
                    }}
                    onMouseEnter={(e) => {
                      if (feedback === null) {
                        e.currentTarget.style.transform = "translateX(50%) scale(1.08)";
                        e.currentTarget.style.filter = "drop-shadow(0 0 14px rgba(79,216,255,0.7))";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateX(50%)";
                      e.currentTarget.style.filter = "drop-shadow(0 0 0 rgba(79,216,255,0))";
                    }}
                  >
                    <Pan value={problem.right.value} unit={problem.right.unit} />
                  </div>
                </div>

                {/* Pivote (NO rota) — triángulo apuntando ARRIBA, apex justo debajo del beam */}
                <div style={{
                  position: "absolute", top: 30, left: "50%",
                  transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "22px solid transparent",
                  borderRight: "22px solid transparent",
                  borderBottom: "38px solid #d9a441",
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.55))",
                }} />
                {/* Brillo dentro del pivote */}
                <div style={{
                  position: "absolute", top: 40, left: "50%",
                  transform: "translateX(-50%)",
                  width: 0, height: 0,
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderBottom: "18px solid rgba(252,233,168,0.55)",
                }} />
                {/* Base inferior */}
                <div style={{
                  position: "absolute", top: 72, left: "50%",
                  transform: "translateX(-50%)",
                  width: 130, height: 8, borderRadius: 4,
                  background: "linear-gradient(180deg, #d9a441 0%, #8a5a20 70%, #4d2900 100%)",
                  border: "1.5px solid #4d2900",
                  boxShadow: "0 6px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)",
                }} />
              </div>

              {/* 3 botones de respuesta */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: 540 }}>
                {[
                  { key: "left", label: "← IZQUIERDA" },
                  { key: "equal", label: "SON IGUALES" },
                  { key: "right", label: "DERECHA →" },
                ].map((btn) => (
                  <button
                    key={btn.key}
                    onClick={() => answerTapR1(btn.key)}
                    disabled={feedback !== null}
                    className={feedback === null ? "ed-pulse-glow" : ""}
                    style={{
                      fontFamily: "var(--ed-font-display)", fontWeight: 800,
                      fontSize: 16, lineHeight: 1.1,
                      letterSpacing: "0.04em",
                      padding: "16px 0",
                      borderRadius: 14,
                      border: "3px solid rgba(79,216,255,0.6)",
                      background: "linear-gradient(180deg, rgba(20,12,55,0.7), rgba(10,6,35,0.88))",
                      color: "#fce9a8",
                      cursor: feedback !== null ? "not-allowed" : "pointer",
                      textShadow: "0 0 14px rgba(252,233,168,0.4), 0 2px 6px rgba(0,0,0,0.4)",
                      transition: "transform 0.18s ease, border-color 0.18s ease",
                      opacity: feedback !== null ? 0.55 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (feedback === null) {
                        e.currentTarget.style.transform = "translateY(-3px) scale(1.04)";
                        e.currentTarget.style.borderColor = "#fce9a8";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor = "rgba(79,216,255,0.6)";
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </>
          );
        })()}

        {/* ────── R2: origen + 4 opciones ────── */}
        {problem.idx === 1 && (
          <>
            <div style={{
              display: "inline-flex", alignItems: "baseline", gap: 8,
              padding: "12px 24px",
              borderRadius: 14,
              background: "rgba(10,6,35,0.55)",
              border: "2px solid rgba(252,233,168,0.45)",
              fontFamily: "var(--ed-font-display)", fontWeight: 700,
              color: "#fce9a8",
              textShadow: "0 0 14px rgba(252,233,168,0.4)",
            }}>
              <span style={{ fontSize: 42 }}>{fmt(problem.source.value)}</span>
              <span style={{ fontSize: 26, opacity: 0.85 }}>{problem.source.unit}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: 540 }}>
              {problem.options.map((op, i) => (
                <button
                  key={i}
                  onClick={() => answerTapR2(i)}
                  disabled={feedback !== null}
                  className={feedback === null ? "ed-pulse-glow" : ""}
                  style={{
                    display: "flex", alignItems: "baseline", justifyContent: "center", gap: 6,
                    padding: "18px 0",
                    borderRadius: 16,
                    border: "3px solid rgba(79,216,255,0.6)",
                    background: "linear-gradient(180deg, rgba(20,12,55,0.7), rgba(10,6,35,0.88))",
                    color: "#fce9a8",
                    cursor: feedback !== null ? "not-allowed" : "pointer",
                    fontFamily: "var(--ed-font-display)", fontWeight: 700,
                    textShadow: "0 0 14px rgba(252,233,168,0.5)",
                    transition: "transform 0.18s ease, border-color 0.18s ease",
                    opacity: feedback !== null ? 0.55 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (feedback === null) {
                      e.currentTarget.style.transform = "translateY(-4px) scale(1.04)";
                      e.currentTarget.style.borderColor = "#fce9a8";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.borderColor = "rgba(79,216,255,0.6)";
                  }}
                >
                  <span style={{ fontSize: 32 }}>{fmt(op.value)}</span>
                  <span style={{ fontSize: 20, opacity: 0.85 }}>{op.unit}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ────── R3: paso a paso ────── */}
        {problem.idx === 2 && (
          <>
            {/* Cadena */}
            <div style={{
              display: "flex", alignItems: "baseline", gap: 12,
              padding: "10px 20px",
              borderRadius: 14,
              background: "rgba(10,6,35,0.55)",
              border: "2px solid rgba(252,233,168,0.45)",
              fontFamily: "var(--ed-font-display)", fontWeight: 700,
              color: "#fce9a8",
              textShadow: "0 0 14px rgba(252,233,168,0.4)",
              fontSize: 28,
            }}>
              <span>{fmt(problem.sourceValue)} {problem.sourceUnit}</span>
              <span style={{ opacity: 0.6 }}>→</span>
              <span style={{ opacity: 0.6, fontSize: 22 }}>?</span>
              <span style={{ fontSize: 22, opacity: 0.85 }}>{problem.midUnit}</span>
              <span style={{ opacity: 0.6 }}>→</span>
              <span style={{ opacity: 0.6, fontSize: 22 }}>?</span>
              <span style={{ fontSize: 22, opacity: 0.85 }}>{problem.finalUnit}</span>
            </div>

            {/* Paso completado (si hay) */}
            {completedSteps.length > 0 && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                fontFamily: "var(--ed-font-display)", fontWeight: 700,
              }}>
                {completedSteps.map((s, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "baseline", gap: 8,
                    fontSize: 20, color: "rgba(252,233,168,0.55)",
                    lineHeight: 1.15,
                  }}>
                    <span>Paso {i + 1}:</span>
                    <span style={{ color: "#fce9a8", fontSize: 22 }}>{fmt(s.value)}</span>
                    <span style={{ opacity: 0.7 }}>
                      {i === 0 ? problem.midUnit : problem.finalUnit}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Slots del paso activo */}
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            }}>
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 700,
                fontSize: 18, color: "#4fd8ff",
                letterSpacing: "0.06em", textTransform: "uppercase",
                textShadow: "0 0 10px rgba(79,216,255,0.4)",
              }}>
                Paso {currentStepIdx + 1} de 2 — convierte a {currentStepIdx === 0 ? problem.midUnit : problem.finalUnit}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {slots.map((tok, i) => {
                  if (tok === ",") {
                    return (
                      <span key={i} style={{
                        fontSize: 30, color: "#fce9a8",
                        padding: "0 1px",
                        fontFamily: "var(--ed-font-display)", fontWeight: 700,
                      }}>,</span>
                    );
                  }
                  return <SlotBox key={i} value={tok === "_" ? "" : tok} feedback={feedback} size={slotSize()} />;
                })}
              </div>
            </div>
          </>
        )}
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
        <button
          className="ed-btn ed-btn-erase"
          onClick={() => setConfirmingRestart(true)}
          title="Reiniciar el juego"
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
                Reiniciar juego
              </div>
              <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
                ¿Empezar de cero?
              </h2>
              <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
                Vas a perder el progreso de esta ronda ({attempted}/3 ejercicios) y volver al primer ejercicio.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingRestart(false)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SEGUIR JUGANDO
                </button>
                <button className="ed-btn ed-btn-primary" onClick={() => { setConfirmingRestart(false); restartGame(); }} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SÍ, REINICIAR
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
              <th style={printStyles.th}>Problema</th>
              <th style={{ ...printStyles.th, ...printStyles.thC }}>Op</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Detalle</th>
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
                <td style={{ ...printStyles.td, ...printStyles.tdOp }}>{e.a}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdC }}>{e.op}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{e.b}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{e.userAnswer}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{e.correctAnswer}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdC, ...(e.isCorrect ? printStyles.tdOk : printStyles.tdErr) }}>
                  {e.isCorrect ? "Correcto" : "Incorrecto"}
                </td>
                <td style={{ ...printStyles.td, ...printStyles.tdR, ...printStyles.tdDim }}>{e.time}s</td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr><td colSpan={8} style={printStyles.tdEmpty}>No se registraron ejercicios en esta sesión.</td></tr>
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
  const res = app.lastResult || { category: "Conversión entre unidades de masa", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Problema</th>
                  <th style={{ textAlign: "center", padding: "6px 8px" }}>Op</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Detalle</th>
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
                    <td style={{ padding: "8px 8px", textAlign: "center" }}>{e.op}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{e.b}</td>
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
                    <td colSpan={8} style={{ padding: "16px 8px", textAlign: "center", color: "var(--ed-ink-soft)", fontStyle: "italic" }}>
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
