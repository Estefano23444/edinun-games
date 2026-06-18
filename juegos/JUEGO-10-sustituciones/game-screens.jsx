// game-screens.jsx — Juego de Sustituciones y paréntesis (1 nivel,
// 3 rondas con mecánicas distintas: multiple choice + multiple choice
// + numpad guiado).
// Audiencia 10 años (excepción al default 6-8 del repo).

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

// Portal a <body> para sacar overlays/modales del scope del DeviceStage.
function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Aritmética en DÉCIMAS — todos los valores se almacenan ×10 para
// trabajar con enteros y evitar imprecisión de float.
// ─────────────────────────────────────────────────────────────
function tenthsToStr(t) {
  // Maneja signo negativo correctamente (ej -34 → "-3,4")
  if (t < 0) return "-" + tenthsToStr(-t);
  if (t % 10 === 0) return String(t / 10);
  const intPart = Math.floor(t / 10);
  const decPart = t % 10;
  return `${intPart},${decPart}`;
}

// Layout esperado del slot según el valor de la respuesta (en décimas).
function answerLayout(t) {
  const isInt = t % 10 === 0;
  if (isInt) {
    const len = String(t / 10).length;
    return Array(len).fill("_");
  }
  const intStr = String(Math.floor(t / 10));
  return [...intStr.split("").map(() => "_"), ",", "_"];
}

// ─────────────────────────────────────────────────────────────
// Generador de problemas — 3 rondas con mecánicas distintas.
//   idx 0 → Sustituciones (multiple choice, 3 opciones).
//   idx 1 → Paréntesis (multiple choice, 3 opciones).
//   idx 2 → Sustitución + paréntesis (numpad guiado, pasos).
//
// Todos los valores en décimas internamente.
// ─────────────────────────────────────────────────────────────
function makeProblem(cat, idx = 0) {
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  if (idx === 0) {
    // Ronda 1 — Sustituciones (multiple choice).
    // 4 letras con valores. Expresión con 2-3 letras y jerarquía simple.
    // Patrón: A + B × D (jerarquía: × primero, después +).
    //
    // Valores: A,C en [11..49] décimas (1,1..4,9). B en [2..9] décimas (0,2..0,9).
    //          D en [11..29] décimas (1,1..2,9). Esto mantiene B×D entero o
    //          décima limpia y A+B×D ≤ 99 décimas (9,9).
    const A = rand(11, 49);
    const B = rand(2, 9);
    const C = rand(31, 79); // sin uso directo en R1 pero se muestra en la tabla
    const D = rand(11, 29);
    // Verificar que B × D sea entero exacto cuando es producto: B y D
    // son décimas, B×D produce centésimas (ej: 4 × 15 = 60 que en
    // centésimas son 0.60 = 6 décimas). Para mantener todo en décimas,
    // calculamos B*D / 10 y verificamos que sea entero.
    const productCent = B * D; // en centésimas
    if (productCent % 10 !== 0) {
      // No es décima limpia — re-generar.
      return makeProblem(cat, idx);
    }
    const productT = productCent / 10; // en décimas
    const correctT = A + productT;
    if (correctT > 99) return makeProblem(cat, idx);

    // Distractores: sin jerarquía, y olvidó B × D.
    // Sin jerarquía: (A + B) × D, calculado en centésimas para precisión.
    const sumABCent = (A + B) * 10; // (A+B en décimas) → en centésimas si multiplicamos por 10
    const wrongNoOrderCent = (A + B) * D; // en centésimas
    let wrong1T;
    if (wrongNoOrderCent % 10 === 0) {
      wrong1T = wrongNoOrderCent / 10;
    } else {
      // Si no es décima limpia, fallback a A+B+D.
      wrong1T = A + B + D;
    }

    // Wrong 2: A + D (olvidó B × D)
    const wrong2T = A + D;

    // Garantizar que los 3 valores sean distintos
    const valuesSet = new Set([correctT, wrong1T, wrong2T]);
    if (valuesSet.size < 3) return makeProblem(cat, idx);
    if (wrong1T < 0 || wrong2T < 0 || wrong1T > 999 || wrong2T > 999) {
      return makeProblem(cat, idx);
    }

    // Mezclar las 3 opciones
    const options = [correctT, wrong1T, wrong2T];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      type: "sustituciones", idx,
      vars: { A, B, C, D },
      // Tokens de la expresión: usa kind:"var" para letras, kind:"op" para operadores.
      exprTokens: [
        { kind: "var", v: "A" }, { kind: "op", v: "+" },
        { kind: "var", v: "B" }, { kind: "op", v: "×" },
        { kind: "var", v: "D" },
      ],
      correctT,
      options,
    };
  }

  if (idx === 1) {
    // Ronda 2 — Paréntesis (multiple choice).
    // Patrón: a + (b × c) − (d ÷ e), todos enteros excepto a.
    // a: decimal "grande" (10..40 con 1 decimal). b: 1..9 entero.
    // c: 1..29 décimas (1 decimal). d: múltiplo de e. e: entero 2-5.
    //
    // bc: producto en centésimas, debe ser décima limpia.
    // de: cociente entero o décima limpia.
    const a = rand(100, 400) + rand(0, 9) - rand(0, 9); // approx
    // Más simple: a en décimas en [100..400] (10,0..40,0)
    const aT = rand(100, 400);
    // b entero 2..9, c en décimas 11..29 (1,1..2,9)
    const b = rand(2, 9);
    const c = rand(11, 29);
    const productCent = b * c; // centésimas
    if (productCent % 10 !== 0) return makeProblem(cat, idx);
    const productT = productCent / 10; // décimas

    // d ÷ e: e entero 2..5, d múltiplo de e con 0..50 décimas.
    const e = rand(2, 5);
    const quotientT = rand(11, 39); // décimas
    const dT = quotientT * e; // dT en décimas, exacto

    const correctT = aT + productT - quotientT;
    if (correctT < 10) return makeProblem(cat, idx);

    // Distractores
    // Wrong 1: signo cambiado (suma en vez de resta)
    const wrong1T = aT + productT + quotientT;
    // Wrong 2: olvidó dividir, restó d directo
    const wrong2T = aT + productT - dT;

    const valuesSet = new Set([correctT, wrong1T, wrong2T]);
    if (valuesSet.size < 3) return makeProblem(cat, idx);
    if (wrong2T < 0) return makeProblem(cat, idx);

    const options = [correctT, wrong1T, wrong2T];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      type: "sustituciones", idx,
      // Tokens: a + ( b × c ) − ( d ÷ e )
      exprTokens: [
        { kind: "num", t: aT }, { kind: "op", v: "+" },
        { kind: "op", v: "(" }, { kind: "num", t: b * 10 }, { kind: "op", v: "×" }, { kind: "num", t: c }, { kind: "op", v: ")" },
        { kind: "op", v: "−" },
        { kind: "op", v: "(" }, { kind: "num", t: dT }, { kind: "op", v: "÷" }, { kind: "num", t: e * 10 }, { kind: "op", v: ")" },
      ],
      correctT,
      options,
    };
  }

  // Ronda 3 — Sustitución + paréntesis (numpad guiado).
  // Patrón: (A + B) × C − D, donde:
  //   - A, B en décimas [11..29] (1,1..2,9)
  //   - C entero 2..4
  //   - D en décimas [2..9] (0,2..0,9)
  // Steps:
  //   - Step 1: (A + B) → resultado1
  //   - Step 2: resultado1 × C → resultado2
  //   - Step 3: resultado2 − D → resultadoFinal
  const A = rand(11, 29);
  const B = rand(11, 29);
  const C = rand(2, 4);
  const D = rand(2, 9);
  const sumT = A + B; // en décimas
  // sumT × C en centésimas
  const productCent = sumT * C * 1; // sumT * C ya es en décimas (no centésimas)
  // Wait: sumT está en décimas. C es entero. sumT * C = en décimas también.
  const productT = sumT * C;
  if (productT > 200) return makeProblem(cat, idx); // cap
  const finalT = productT - D;
  if (finalT < 10) return makeProblem(cat, idx);

  return {
    type: "sustituciones", idx,
    vars: { A, B, C, D },
    // Expresión: (A + B) × C − D (mostrando D como valor literal en décimas para variar)
    exprTokens: [
      { kind: "op", v: "(" }, { kind: "var", v: "A" }, { kind: "op", v: "+" }, { kind: "var", v: "B" }, { kind: "op", v: ")" },
      { kind: "op", v: "×" }, { kind: "var", v: "C" },
      { kind: "op", v: "−" }, { kind: "var", v: "D" },
    ],
    // Steps en décimas, valores ya sustituidos
    steps: [
      { a: A, op: "+", b: B, result: sumT, hasParens: true },
      { a: sumT, op: "×", b: C * 10, result: productT, hasParens: false },
      { a: productT, op: "−", b: D, result: finalT, hasParens: false },
    ],
    finalResult: finalT,
  };
}

// ─────────────────────────────────────────────────────────────
// SlotBox — un dígito.
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
// Renderizador de tokens de expresión (común a R1, R2, R3).
// Para R1 y R3, las letras se sustituyen por valores en R3 NO,
// se mantienen como letras; en R1 también letras. R2 solo números.
// ─────────────────────────────────────────────────────────────
function renderExprToken(tk, i) {
  if (tk.kind === "num") {
    return (
      <span key={i} style={{ padding: "0 2px" }}>{tenthsToStr(tk.t)}</span>
    );
  }
  if (tk.kind === "var") {
    return (
      <span key={i} style={{ padding: "0 2px", color: "#4fd8ff" }}>{tk.v}</span>
    );
  }
  // op
  const isParen = tk.v === "(" || tk.v === ")";
  return (
    <span key={i} style={{
      padding: isParen ? "0 1px" : "0 6px",
      opacity: 0.85,
    }}>{tk.v}</span>
  );
}

// ─────────────────────────────────────────────────────────────
// Mensajes motivadores cuando se falla
// ─────────────────────────────────────────────────────────────
const ENCOURAGEMENTS = [
  "¡Casi! Revisa el cálculo.",
  "Recuerda: × y ÷ se hacen primero.",
  "¡La próxima es tuya!",
  "Sustituye con cuidado.",
  "Mira de nuevo los valores.",
  "¡Vamos al siguiente reto!",
];

// ─────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO — 3 rondas con mecánicas distintas
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "sustituciones";
  const catLabel = app.currentCatLabel || "Operaciones combinadas con números decimales";

  const [problem, setProblem] = useStateG(() => makeProblem(cat, 0));

  // Estado para R3 (numpad guiado).
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
  // Fase "reveal": antes del overlay "¡UPS!" se marca la respuesta correcta.
  // R1/R2 (opción múltiple): { correct, wrong } → botón correcto en verde con ✓,
  //   el elegido en rojo, todos bloqueados.
  // R3 (numpad): { correctSlot: "<valor correcto>" } → los slots conservan lo que
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

  // Inicializar slots cuando cambia el problema o el paso activo (solo R3).
  useEffectG(() => {
    if (problem && problem.idx === 2 && problem.steps) {
      const step = problem.steps[currentStepIdx];
      if (step) setSlots(answerLayout(step.result));
    } else {
      setSlots([]);
    }
  }, [problem, currentStepIdx]);

  // Reset al cambiar de problema.
  useEffectG(() => {
    setCurrentStepIdx(0);
    setCompletedSteps([]);
  }, [problem]);

  // Cronómetro total
  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Resolver R1/R2 (multiple choice) con tap directo.
  function answerTap(chosenT) {
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
    const isCorrect = chosenT === problem.correctT;

    const exprStr = problem.exprTokens.map((tk) => {
      if (tk.kind === "num") return tenthsToStr(tk.t);
      return tk.v; // var o op
    }).join(" ");

    let varsStr = "";
    if (problem.vars) {
      varsStr = Object.entries(problem.vars).map(([k, v]) => `${k}=${tenthsToStr(v)}`).join(" · ");
    }

    const entry = {
      a: exprStr,
      b: varsStr,
      op: "=",
      correctAnswer: tenthsToStr(problem.correctT),
      userAnswer: tenthsToStr(chosenT),
    };
    if (!isCorrect) {
      // Mostrar la opción correcta (verde ✓) y la elegida (roja) antes del "¡UPS!".
      setReveal({ correct: problem.correctT, wrong: chosenT });
      setTimeout(() => { setReveal(null); finalize(false, entry); }, REVEAL_MS);
      return;
    }
    finalize(true, entry);
  }

  // Resolver R3 (numpad guiado, paso a paso).
  function verify() {
    if (problem.idx !== 2 || reveal) return;
    const step = problem.steps[currentStepIdx];
    if (!step) return;

    const allFilled = slots.every((s) => s !== "_");
    if (!allFilled) {
      setFeedback("err");
      setFeedbackMsg("Completa la respuesta");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }

    let intDigits = "";
    let decDigits = "";
    let pastComma = false;
    for (const s of slots) {
      if (s === ",") { pastComma = true; continue; }
      if (pastComma) decDigits += s;
      else intDigits += s;
    }
    let userT;
    if (decDigits.length > 0) {
      userT = parseInt(intDigits, 10) * 10 + parseInt(decDigits, 10);
    } else {
      userT = parseInt(intDigits, 10) * 10;
    }

    if (userT !== step.result) {
      // R3: una respuesta incorrecta termina el ejercicio (igual que R1/R2).
      if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

      const exprStr = problem.exprTokens.map((tk) => {
        if (tk.kind === "num") return tenthsToStr(tk.t);
        return tk.v;
      }).join(" ");

      let varsStr = "";
      if (problem.vars) {
        varsStr = Object.entries(problem.vars).map(([k, v]) => {
          if (k === "C") return `${k}=${v}`;
          return `${k}=${tenthsToStr(v)}`;
        }).join(" · ");
      }

      const entry = {
        a: exprStr,
        b: varsStr,
        op: "=",
        correctAnswer: tenthsToStr(problem.finalResult),
        userAnswer: tenthsToStr(userT),
      };
      // Mantener lo que escribió el niño (en rojo) y mostrar el resultado
      // correcto del paso en un cartel verde aparte, antes del "¡UPS!".
      setReveal({ correctSlot: tenthsToStr(step.result) });
      setTimeout(() => {
        setReveal(null);
        finalize(false, entry);
      }, REVEAL_MS);
      return;
    }

    // Paso correcto.
    const newCompletedSteps = [...completedSteps, step];
    setCompletedSteps(newCompletedSteps);

    if (currentStepIdx === problem.steps.length - 1) {
      // Último paso — ejercicio completo.
      if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

      const exprStr = problem.exprTokens.map((tk) => {
        if (tk.kind === "num") return tenthsToStr(tk.t);
        return tk.v;
      }).join(" ");

      let varsStr = "";
      if (problem.vars) {
        varsStr = Object.entries(problem.vars).map(([k, v]) => {
          // C es entero (no en décimas)
          if (k === "C") return `${k}=${v}`;
          return `${k}=${tenthsToStr(v)}`;
        }).join(" · ");
      }

      const entry = {
        a: exprStr,
        b: varsStr,
        op: "=",
        correctAnswer: tenthsToStr(problem.finalResult),
        userAnswer: tenthsToStr(userT),
      };
      finalize(true, entry);
    } else {
      setFeedback("ok");
      setFeedbackMsg(`${tenthsToStr(step.result)} ✓`);
      setTimeout(() => {
        setFeedback(null);
        setFeedbackMsg("");
        setCurrentStepIdx(currentStepIdx + 1);
      }, 600);
    }
  }

  // Finalize común (avanza al siguiente ejercicio o a Results).
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

  // Numpad para R3.
  function pressDigit(d) {
    if (problem.idx !== 2 || reveal) return;
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
    if (problem.idx !== 2 || reveal) return;
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots[i] !== "_" && slots[i] !== ",") {
        const next = [...slots];
        next[i] = "_";
        setSlots(next);
        return;
      }
    }
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  function restartGame() {
    setConfirmingRestart(false);
    setAttempted(0);
    setSolved(0);
    setStars(0);
    setStarsSession(0);
    setFeedback(null);
    setFeedbackMsg("");
    setReveal(null);
    setLog([]);
    setCurrentStepIdx(0);
    setCompletedSteps([]);
    setProblem(makeProblem(cat, 0));
    started.current = Date.now();
    exerciseStart.current = Date.now();
  }

  const bocadilloText = "Sustituye cada letra y resuelve.";
  const instructionByIdx = [
    "🔤 ¡Cambia letras por números!",
    "🔤 ¡Resuelve los paréntesis!",
    "🔤 ¡Letras y paréntesis!",
  ];
  const instructionText = instructionByIdx[problem.idx] || "";

  // Slot size dinámico para R3.
  const expectedLen = slots.filter((s) => s === "_").length;
  function slotSize() {
    if (expectedLen <= 1) return 52;
    if (expectedLen === 2) return 46;
    return 40;
  }

  // Helper para renderizar tabla de variables (R1, R3).
  function renderVarsTable(vars) {
    return (
      <div style={{
        display: "flex", gap: 14, justifyContent: "center", flexWrap: "nowrap",
        padding: "8px 16px",
        borderRadius: 12,
        background: "rgba(10,6,35,0.55)",
        border: "1.5px solid rgba(79,216,255,0.45)",
      }}>
        {Object.entries(vars).map(([k, v]) => (
          <div key={k} style={{
            display: "flex", alignItems: "baseline", gap: 4,
            fontFamily: "var(--ed-font-display)", fontWeight: 700,
          }}>
            <span style={{ color: "#4fd8ff", fontSize: 22 }}>{k}</span>
            <span style={{ color: "rgba(252,233,168,0.85)", fontSize: 16 }}>=</span>
            <span style={{ color: "#fce9a8", fontSize: 22 }}>
              {k === "C" && problem.idx === 2 ? String(v) : tenthsToStr(v)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* HUD superior */}
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

      {/* ══════ ZONA CENTRAL — enunciado fijo arriba (debajo del HUD) y el
          contenido interactivo centrado en el espacio restante. Antes el
          enunciado iba dentro de un space-evenly y quedaba flotando con un
          hueco arriba (donde antes vivía el indicador de RONDA, ahora pegado
          al logo). El contenido interactivo se envuelve en un wrapper con
          flex:1 + space-evenly para repartir el alto restante.
          R1/R2: bottom 18 (sin numpad). R3: bottom 100 (numpad a bottom:14). */}
      <div data-qa="zona-central" style={{
        position: "absolute", left: "50%",
        top: 80,
        bottom: problem.idx === 2 ? 100 : 18,
        transform: "translateX(-50%)",
        width: 600,
        display: "flex", flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}>
        {/* 1. Instrucción — fija arriba */}
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

        {/* 2. Tabla de variables (R1 y R3) */}
        {(problem.idx === 0 || problem.idx === 2) && problem.vars && renderVarsTable(problem.vars)}

        {/* 3. Expresión (común a las 3 rondas) */}
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 700,
          fontSize: problem.idx === 1 ? 30 : 36, color: "#fce9a8",
          textShadow: "0 0 14px rgba(252,233,168,0.4), 0 2px 6px rgba(0,0,0,0.45)",
          letterSpacing: "0.02em",
          padding: "6px 16px",
          borderRadius: 12,
          background: "rgba(10,6,35,0.45)",
          border: "1.5px solid rgba(252,233,168,0.35)",
        }}>
          {problem.exprTokens.map((tk, i) => renderExprToken(tk, i))}
          <span style={{ padding: "0 6px", color: "#fce9a8" }}>=</span>
        </div>

        {/* 4. Pasos completados (R3) — solo se renderiza si hay pasos hechos */}
        {problem.idx === 2 && completedSteps.length > 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            fontFamily: "var(--ed-font-display)", fontWeight: 700,
          }}>
            {completedSteps.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                fontSize: 20, color: "rgba(252,233,168,0.55)",
                lineHeight: 1.15,
              }}>
                {s.hasParens && <span>(</span>}
                <span>{tenthsToStr(s.a)}</span>
                <span>{s.op}</span>
                <span>{tenthsToStr(s.b)}</span>
                {s.hasParens && <span>)</span>}
                <span>=</span>
                <span style={{ color: "#fce9a8" }}>{tenthsToStr(s.result)}</span>
              </div>
            ))}
          </div>
        )}

        {/* 5a. Multiple choice (R1, R2): pill + 3 botones — último hijo, queda abajo del todo */}
        {(problem.idx === 0 || problem.idx === 1) && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              fontFamily: "var(--ed-font-display)", fontWeight: 700,
              fontSize: 17, color: "#4fd8ff",
              letterSpacing: "0.1em", textTransform: "uppercase",
              textShadow: "0 0 10px rgba(79,216,255,0.5)",
              padding: "6px 18px",
              borderRadius: 999,
              background: "rgba(79,216,255,0.08)",
              border: "1.5px solid rgba(79,216,255,0.35)",
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>▶</span>
              <span>Toca tu respuesta</span>
              <span style={{ fontSize: 18, lineHeight: 1 }}>◀</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, width: 440 }}>
              {problem.options.map((optT, i) => {
                const isCorrectOpt = reveal && reveal.correct != null && optT === reveal.correct;
                const isWrongOpt = reveal && reveal.wrong != null && optT === reveal.wrong;
                const locked = feedback !== null || reveal !== null;
                return (
                <button
                  key={i}
                  onClick={() => answerTap(optT)}
                  disabled={locked}
                  className={!locked ? "ed-pulse-glow" : ""}
                  style={{
                    position: "relative",
                    fontFamily: "var(--ed-font-display)", fontWeight: 700,
                    fontSize: 38, lineHeight: 1,
                    padding: "18px 0",
                    borderRadius: 16,
                    border: `3px solid ${
                      isCorrectOpt ? "#2ecc8f" :
                      isWrongOpt ? "#ff6b6b" :
                      "rgba(79,216,255,0.6)"
                    }`,
                    background: isCorrectOpt ? "rgba(46,204,143,0.25)"
                            : isWrongOpt ? "rgba(255,107,107,0.22)"
                            : "linear-gradient(180deg, rgba(20,12,55,0.7), rgba(10,6,35,0.88))",
                    color: isCorrectOpt ? "#eafff4" : isWrongOpt ? "#ffe3e3" : "#fce9a8",
                    cursor: locked ? "not-allowed" : "pointer",
                    textShadow: "0 0 16px rgba(252,233,168,0.55), 0 2px 6px rgba(0,0,0,0.5)",
                    boxShadow: isCorrectOpt ? "0 0 18px rgba(46,204,143,0.6)"
                            : isWrongOpt ? "0 0 18px rgba(255,107,107,0.5)"
                            : "none",
                    transition: "transform 0.18s ease, border-color 0.18s ease",
                    opacity: locked && !isCorrectOpt && !isWrongOpt ? 0.45 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!locked) {
                      e.currentTarget.style.transform = "translateY(-4px) scale(1.04)";
                      e.currentTarget.style.borderColor = "#fce9a8";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!locked) {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.borderColor = "rgba(79,216,255,0.6)";
                    }
                  }}
                >
                  {tenthsToStr(optT)}
                  {isCorrectOpt && (
                    <span style={{
                      position: "absolute", top: -8, right: -8,
                      width: 26, height: 26, borderRadius: "50%",
                      background: "#2ecc8f", color: "#06281c",
                      fontSize: 16, fontWeight: 900,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                    }}>✓</span>
                  )}
                </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5b. Slots del paso activo (R3) — último hijo, queda justo arriba del numpad.
            Al fallar: los slots conservan lo que el niño escribió (en rojo) y al
            lado aparece un cartel verde con el resultado correcto del paso. */}
        {problem.idx === 2 && currentStepIdx < problem.steps.length && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
          }}>
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
                return <SlotBox key={i} value={tok === "_" ? "" : tok}
                  feedback={reveal && reveal.correctSlot != null ? "err" : feedback}
                  size={slotSize()} />;
              })}
            </div>
            {reveal && reveal.correctSlot != null && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 999,
                background: "rgba(46,204,143,0.22)", border: "2px solid #2ecc8f",
                color: "#eafff4", fontSize: 20, fontWeight: 800,
                boxShadow: "0 0 16px rgba(46,204,143,0.5)",
                whiteSpace: "nowrap",
              }}>
                <span style={{ fontSize: 14, color: "#bff5df", letterSpacing: "0.03em" }}>Correcta:</span>
                ✓ {reveal.correctSlot}
              </span>
            )}
          </div>
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

      {/* Botones de acción.
          Ronda 1, 2: REINICIAR + SALIR.
          Ronda 3: VERIFICAR + BORRAR + REINICIAR + SALIR. */}
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
              <th style={printStyles.th}>Expresión</th>
              <th style={printStyles.th}>Variables</th>
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
                <td style={{ ...printStyles.td, ...printStyles.tdDim }}>{e.b || "—"}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{e.userAnswer}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{e.correctAnswer}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdC, ...(e.isCorrect ? printStyles.tdOk : printStyles.tdErr) }}>
                  {e.isCorrect ? "Correcto" : "Incorrecto"}
                </td>
                <td style={{ ...printStyles.td, ...printStyles.tdR, ...printStyles.tdDim }}>{e.time}s</td>
              </tr>
            ))}
            {log.length === 0 && (
              <tr><td colSpan={7} style={printStyles.tdEmpty}>No se registraron ejercicios en esta sesión.</td></tr>
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
  const res = app.lastResult || { category: "Operaciones combinadas con números decimales", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Expresión</th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Variables</th>
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
                    <td style={{ padding: "8px 8px", color: "var(--ed-ink-dim)" }}>{e.b || "—"}</td>
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
                    <td colSpan={7} style={{ padding: "16px 8px", textAlign: "center", color: "var(--ed-ink-soft)", fontStyle: "italic" }}>
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
