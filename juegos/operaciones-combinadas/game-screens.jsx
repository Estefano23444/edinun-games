// game-screens.jsx — Juego de Operaciones combinadas con decimales
// (1 nivel, 3 rondas, mecánica de pasos guiados).
// Audiencia 10 años (excepción al default 6-8 del repo).

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

// Portal a <body> para sacar overlays/modales del scope del DeviceStage.
function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Aritmética en DÉCIMAS — todos los valores se almacenan ×10 para
// trabajar con enteros y evitar imprecisión de float (ej: en JS,
// 0.1 + 0.2 ≠ 0.3). Display convierte a "5,4", "7", etc. al final.
// ─────────────────────────────────────────────────────────────
function tenthsToStr(t) {
  // 54 → "5,4" · 60 → "6" · 200 → "20" · 5 → "0,5"
  if (t % 10 === 0) return String(t / 10);
  const intPart = Math.floor(t / 10);
  const decPart = t % 10;
  return `${intPart},${decPart}`;
}

// Layout esperado del slot según el valor de la respuesta (en décimas).
// Devuelve un array de "tokens": "_" para slot vacío, "," para coma fija.
function answerLayout(t) {
  const isInt = t % 10 === 0;
  if (isInt) {
    const len = String(t / 10).length;
    return Array(len).fill("_");
  }
  const intStr = String(Math.floor(t / 10));
  // Tokens: dígitos enteros + coma + dígito decimal
  return [...intStr.split("").map(() => "_"), ",", "_"];
}

// ─────────────────────────────────────────────────────────────
// Generador de problemas — 1 categoría ("combinadas"), 3 rondas.
//   idx 0 → 2 operaciones, jerarquía simple sin paréntesis (× con + o −).
//   idx 1 → 2 operaciones con división (÷ con + o −).
//   idx 2 → 3 operaciones mezcladas.
//
// Todos los valores se manejan internamente en DÉCIMAS (×10).
// ─────────────────────────────────────────────────────────────
function makeProblem(cat, idx = 0) {
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  // Helper: pick a random 1-decimal value in [minTenths, maxTenths].
  function pickDecimal(minT, maxT) {
    return rand(minT, maxT);
  }

  if (idx === 0) {
    // 2 operaciones, una × y una +/-, sin paréntesis.
    // Patrón: a OP1 b × c, donde × tiene mayor prioridad → resolver primero.
    // Ó: a × b OP2 c.
    // Para uniformar: siempre el resultado es `pre OP post`, donde uno
    // contiene la multiplicación.
    //
    // Estructura del problema:
    //   - tokens: la expresión completa para mostrar
    //     (array de {kind: "num"|"op", value, tenths?})
    //   - steps: secuencia de operaciones a resolver
    //     (array de {a, op, b, result} en décimas)
    //   - finalResult: en décimas
    //
    // Para hacer el código limpio, generamos los valores y construimos
    // tokens y steps en paralelo.

    const opIsAdd = Math.random() < 0.5;
    const multFirst = Math.random() < 0.5; // ¿la × está al principio o al final?
    const c = rand(2, 4); // entero multiplicador
    // bTenths * c debe ser ≤ 200 (20.0) para que todo quede chico.
    const maxB = Math.min(50, Math.floor(200 / c));
    const bTenths = pickDecimal(11, maxB); // 1.1 .. maxB/10

    const productT = bTenths * c; // 22 .. 200
    let aTenths;
    if (opIsAdd) {
      aTenths = pickDecimal(11, Math.max(11, 99 - productT));
    } else {
      // resta: a debe ser ≥ producto + 1 décima
      aTenths = pickDecimal(productT + 1, productT + 50);
      aTenths = Math.min(aTenths, 999);
    }

    let tokens, steps, finalResult;
    if (multFirst) {
      // b × c OP a
      const finalT = opIsAdd ? productT + aTenths : productT - aTenths;
      // Si resta, asegurar ≥ 1
      if (!opIsAdd && finalT < 10) {
        // Recursivo: re-generar
        return makeProblem(cat, idx);
      }
      tokens = [
        { kind: "num", t: bTenths }, { kind: "op", v: "×" },
        { kind: "num", t: c * 10 }, { kind: "op", v: opIsAdd ? "+" : "−" },
        { kind: "num", t: aTenths },
      ];
      steps = [
        { a: bTenths, op: "×", b: c * 10, result: productT },
        { a: productT, op: opIsAdd ? "+" : "−", b: aTenths, result: finalT },
      ];
      finalResult = finalT;
    } else {
      // a OP b × c
      const finalT = opIsAdd ? aTenths + productT : aTenths - productT;
      tokens = [
        { kind: "num", t: aTenths }, { kind: "op", v: opIsAdd ? "+" : "−" },
        { kind: "num", t: bTenths }, { kind: "op", v: "×" },
        { kind: "num", t: c * 10 },
      ];
      steps = [
        { a: bTenths, op: "×", b: c * 10, result: productT },
        { a: aTenths, op: opIsAdd ? "+" : "−", b: productT, result: finalT },
      ];
      finalResult = finalT;
    }
    return { type: "combinadas", idx, tokens, steps, finalResult };
  }

  if (idx === 1) {
    // 2 operaciones con división (÷ con + o −).
    // Patrón: a OP b ÷ c o b ÷ c OP a.
    // Para garantizar división exacta: b = quotientT × c, donde quotientT
    // es 1-decimal (la respuesta del paso 1).
    const opIsAdd = Math.random() < 0.5;
    const divFirst = Math.random() < 0.5;
    const c = rand(2, 5); // divisor entero
    const quotientT = rand(11, 50); // 1.1 .. 5.0
    const bTenths = quotientT * c; // dividendo, en décimas

    let aTenths;
    if (opIsAdd) {
      aTenths = pickDecimal(11, Math.max(11, 99 - quotientT));
    } else {
      aTenths = pickDecimal(quotientT + 1, quotientT + 50);
      aTenths = Math.min(aTenths, 999);
    }

    let tokens, steps, finalResult;
    if (divFirst) {
      // b ÷ c OP a
      const finalT = opIsAdd ? quotientT + aTenths : quotientT - aTenths;
      if (!opIsAdd && finalT < 10) {
        return makeProblem(cat, idx);
      }
      tokens = [
        { kind: "num", t: bTenths }, { kind: "op", v: "÷" },
        { kind: "num", t: c * 10 }, { kind: "op", v: opIsAdd ? "+" : "−" },
        { kind: "num", t: aTenths },
      ];
      steps = [
        { a: bTenths, op: "÷", b: c * 10, result: quotientT },
        { a: quotientT, op: opIsAdd ? "+" : "−", b: aTenths, result: finalT },
      ];
      finalResult = finalT;
    } else {
      // a OP b ÷ c
      const finalT = opIsAdd ? aTenths + quotientT : aTenths - quotientT;
      tokens = [
        { kind: "num", t: aTenths }, { kind: "op", v: opIsAdd ? "+" : "−" },
        { kind: "num", t: bTenths }, { kind: "op", v: "÷" },
        { kind: "num", t: c * 10 },
      ];
      steps = [
        { a: bTenths, op: "÷", b: c * 10, result: quotientT },
        { a: aTenths, op: opIsAdd ? "+" : "−", b: quotientT, result: finalT },
      ];
      finalResult = finalT;
    }
    return { type: "combinadas", idx, tokens, steps, finalResult };
  }

  // idx === 2 — 3 operaciones, mezcla.
  // Patrón: a OP1 b × c OP2 d, sin paréntesis.
  // Resolver: paso 1 = b × c. paso 2 = a OP1 (bc). paso 3 = (paso2) OP2 d.
  const op1IsAdd = Math.random() < 0.5;
  const op2IsAdd = Math.random() < 0.5;
  const c = rand(2, 4);
  const maxB = Math.min(40, Math.floor(150 / c));
  const bTenths = pickDecimal(11, maxB);
  const productT = bTenths * c;

  let aTenths, dTenths;
  // a OP1 (bc) — calcular intermedio, luego ± d.
  if (op1IsAdd) {
    aTenths = pickDecimal(11, Math.max(11, 80 - productT));
  } else {
    aTenths = pickDecimal(productT + 5, productT + 50);
    aTenths = Math.min(aTenths, 99);
  }
  const intermediateT = op1IsAdd ? aTenths + productT : aTenths - productT;

  if (op2IsAdd) {
    dTenths = pickDecimal(5, Math.max(5, 99 - intermediateT));
  } else {
    dTenths = pickDecimal(1, Math.max(1, intermediateT - 10));
    dTenths = Math.min(dTenths, 50);
  }
  const finalT = op2IsAdd ? intermediateT + dTenths : intermediateT - dTenths;

  if (intermediateT < 10 || finalT < 10) {
    // Re-generar si algún resultado intermedio o final es negativo o muy chico.
    return makeProblem(cat, idx);
  }

  const tokens = [
    { kind: "num", t: aTenths }, { kind: "op", v: op1IsAdd ? "+" : "−" },
    { kind: "num", t: bTenths }, { kind: "op", v: "×" },
    { kind: "num", t: c * 10 }, { kind: "op", v: op2IsAdd ? "+" : "−" },
    { kind: "num", t: dTenths },
  ];
  const steps = [
    { a: bTenths, op: "×", b: c * 10, result: productT },
    { a: aTenths, op: op1IsAdd ? "+" : "−", b: productT, result: intermediateT },
    { a: intermediateT, op: op2IsAdd ? "+" : "−", b: dTenths, result: finalT },
  ];
  return { type: "combinadas", idx, tokens, steps, finalResult: finalT };
}

// ─────────────────────────────────────────────────────────────
// SlotBox — un dígito o un separador de coma.
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
// Mensajes motivadores cuando se falla un paso
// ─────────────────────────────────────────────────────────────
const ENCOURAGEMENTS = [
  "¡Casi! Revisa el cálculo.",
  "Recuerda: × y ÷ se hacen primero.",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Mira de nuevo los números.",
  "¡Vamos al siguiente reto!",
];

// ─────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO — 3 rondas con pasos guiados
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "combinadas";
  const catLabel = app.currentCatLabel || "Operaciones combinadas";

  const [problem, setProblem] = useStateG(() => makeProblem(cat, 0));

  // Estado de la ronda activa.
  // - currentStepIdx: índice del paso que está resolviendo el chico.
  // - completedSteps: pasos ya resueltos (mostrados tenues encima).
  // - slots: array de strings, según answerLayout del paso activo.
  //   Los caracteres "," son fijos (no editables); los "_" son slots
  //   editables que se llenan con dígitos.
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
  // En este juego (numpad multi-casilla) se CONSERVA lo que escribió el niño
  // (en rojo) y aparece un cartel verde "Correcta: ✓ X" con el valor completo.
  // { correctSlot: "<valor correcto en string con coma>" }
  const [reveal, setReveal] = useStateG(null);
  // El revelado (respuesta correcta marcada) es el momento educativo → dura más.
  // El feedback "¡UPS!" es solo refuerzo emocional → corto.
  const REVEAL_MS = 2800;
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [log, setLog] = useStateG([]);

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // Inicializar slots cuando cambia el problema o el paso activo.
  useEffectG(() => {
    if (!problem || !problem.steps) return;
    const step = problem.steps[currentStepIdx];
    if (!step) return;
    setSlots(answerLayout(step.result));
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

  // Numpad: rellena el primer slot vacío de izquierda a derecha,
  // saltando el separador de coma (que es fijo).
  function pressDigit(d) {
    if (reveal) return;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === "_") {
        // Sin leading zero salvo cuando la respuesta esperada empieza con 0
        // (ej: 0,5 — el primer slot ES 0). Para detectarlo: si el slot es
        // el primer slot Y el siguiente token es ",", aceptamos el 0.
        if (i === 0 && d === "0") {
          // Permitir 0 inicial solo si el siguiente char es la coma
          // (significa que la respuesta empieza con "0,").
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
    if (reveal) return;
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots[i] !== "_" && slots[i] !== ",") {
        const next = [...slots];
        next[i] = "_";
        setSlots(next);
        return;
      }
    }
  }

  // Verificar el paso activo. Si correcto, avanzar; si último, finalizar.
  function verify() {
    if (reveal) return;
    const step = problem.steps[currentStepIdx];
    if (!step) return;

    // ¿Todos los slots editables están llenos?
    const allFilled = slots.every((s) => s !== "_");
    if (!allFilled) {
      setFeedback("err");
      setFeedbackMsg("Completa la respuesta");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }

    // Reconstruir el valor en décimas a partir de los slots.
    // Slots tipo: ["5", "4"]                → "54"     → 54 décimas → 5,4
    // Slots tipo: ["5", ",", "4"]           → "5" + "4" → 54 décimas → 5,4
    // Slots tipo: ["1", "2"]                → "12"     → 12 (entero) → 1,2
    //   wait — si la respuesta es entera (ej 12), tenths = 120.
    // Recordar: answerLayout(120) = ["_", "_"] (sin coma) → "12" en slots,
    //   que parseamos como int = 12, luego × 10 = 120. ✓
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
      // Antes del "¡UPS!": revelar el resultado correcto SIN tapar la pantalla
      // con el overlay. Se CONSERVA lo que escribió el niño (los slots se
      // pintan en rojo vía la prop de SlotBox) y al lado aparece un cartel
      // verde "Correcta: ✓ X" con el valor completo. No se setea `feedback`
      // aquí para que el overlay "¡UPS!" no aparezca hasta después del reveal.
      setReveal({ correctSlot: tenthsToStr(step.result) });
      setTimeout(() => {
        setReveal(null);
        // Tras el revelado: feedback emocional "¡UPS!" breve, luego limpiar
        // slots editables para reintentar (retry sin penalizar, como antes).
        setFeedback("err");
        setFeedbackMsg(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
        setTimeout(() => {
          setFeedback(null);
          setFeedbackMsg("");
          setSlots(answerLayout(step.result));
        }, 1100);
      }, REVEAL_MS);
      return;
    }

    // Paso correcto.
    const newCompletedSteps = [...completedSteps, step];
    setCompletedSteps(newCompletedSteps);

    if (currentStepIdx === problem.steps.length - 1) {
      // Último paso — ejercicio completo.
      if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

      const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
      const earned = Math.max(1, 10 - Math.floor(exerciseSec / 3));

      const newAttempted = attempted + 1;
      const newSolved = solved + 1;
      const newStarsSession = starsSession + earned;
      const newStarsTotal = stars + earned;

      const exprStr = problem.tokens.map((tk) =>
        tk.kind === "num" ? tenthsToStr(tk.t) : tk.v
      ).join(" ");

      const entry = {
        idx: newAttempted,
        a: exprStr,
        b: tenthsToStr(problem.finalResult),
        op: "=",
        correctAnswer: tenthsToStr(problem.finalResult),
        userAnswer: tenthsToStr(userT),
        isCorrect: true,
        time: exerciseSec,
        earned,
      };
      const newLog = [...log, entry];

      setFeedback("ok");
      setFeedbackMsg(`+${earned} ⭐`);
      setAttempted(newAttempted);
      setSolved(newSolved);
      setStars(newStarsTotal);
      setStarsSession(newStarsSession);
      setLog(newLog);

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
      }, 950);
    } else {
      // Avanzar al siguiente paso.
      setFeedback("ok");
      setFeedbackMsg(`${tenthsToStr(step.result)} ✓`);
      setTimeout(() => {
        setFeedback(null);
        setFeedbackMsg("");
        setCurrentStepIdx(currentStepIdx + 1);
      }, 600);
    }
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  // Reiniciar el juego desde cero.
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

  const bocadilloText = "Primero × y ÷, después + y −.";
  const instructionText = "🧮 ¡Orden de operaciones!";

  // Slot size dinámico según largo de la respuesta esperada.
  const expectedLen = slots.filter((s) => s === "_").length;
  function slotSize() {
    if (expectedLen <= 1) return 52;
    if (expectedLen === 2) return 46;
    return 40;
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
          contenido interactivo (expresión + pasos) centrado en el espacio
          restante. Antes el enunciado iba dentro de un space-evenly y quedaba
          flotando con un hueco arriba (donde antes vivía el indicador de
          RONDA, hoy pegado al logo). ══════ */}
      <div data-qa="zona-central" style={{
        position: "absolute", left: "50%", top: 80, transform: "translateX(-50%)",
        width: 580, bottom: 92,
        display: "flex", flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}>
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 700,
          fontSize: 22, lineHeight: 1.1,
          color: "#fff",
          textShadow: "0 2px 6px rgba(0,0,0,0.45)",
        }}>
          {instructionText}
        </div>

        {/* Contenido interactivo, centrado verticalmente en el espacio restante. */}
        <div data-qa="zona-contenido" style={{
          flex: 1, width: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "space-evenly",
        }}>

        {/* Expresión completa al tope. */}
        <div style={{
          fontFamily: "var(--ed-font-display)", fontWeight: 700,
          fontSize: 36, color: "#fce9a8",
          textShadow: "0 0 14px rgba(252,233,168,0.4), 0 2px 6px rgba(0,0,0,0.45)",
          letterSpacing: "0.02em",
          padding: "6px 16px",
          borderRadius: 12,
          background: "rgba(10,6,35,0.45)",
          border: "1.5px solid rgba(252,233,168,0.35)",
        }}>
          {problem.tokens.map((tk, i) => (
            <span key={i} style={{
              padding: tk.kind === "op" ? "0 6px" : "0 2px",
              opacity: tk.kind === "op" ? 0.85 : 1,
            }}>
              {tk.kind === "num" ? tenthsToStr(tk.t) : tk.v}
            </span>
          ))}
        </div>

        {/* Pasos: completados (tenues) + paso activo (dorado brillante). */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          fontFamily: "var(--ed-font-display)", fontWeight: 700,
        }}>
          {completedSteps.map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              fontSize: 22, color: "rgba(252,233,168,0.55)",
              lineHeight: 1.15,
            }}>
              <span>{tenthsToStr(s.a)}</span>
              <span>{s.op}</span>
              <span>{tenthsToStr(s.b)}</span>
              <span>=</span>
              <span style={{ color: "#fce9a8" }}>{tenthsToStr(s.result)}</span>
            </div>
          ))}
          {currentStepIdx < problem.steps.length && (() => {
            const step = problem.steps[currentStepIdx];
            return (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                fontSize: 32, color: "#fce9a8",
                textShadow: "0 0 12px rgba(252,233,168,0.4), 0 2px 6px rgba(0,0,0,0.45)",
                marginTop: completedSteps.length > 0 ? 4 : 0,
              }}>
                <span>{tenthsToStr(step.a)}</span>
                <span>{step.op}</span>
                <span>{tenthsToStr(step.b)}</span>
                <span>=</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {slots.map((tok, i) => {
                    if (tok === ",") {
                      return (
                        <span key={i} style={{
                          fontSize: 32, color: "#fce9a8",
                          padding: "0 1px",
                        }}>,</span>
                      );
                    }
                    // Durante el reveal: pintar lo que escribió el niño en rojo.
                    return <SlotBox key={i} value={tok === "_" ? "" : tok} feedback={reveal && reveal.correctSlot != null ? "err" : feedback} size={slotSize()} />;
                  })}
                </div>
                {reveal && reveal.correctSlot != null && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    marginLeft: 8,
                    padding: "8px 16px", borderRadius: 999,
                    background: "rgba(46,204,143,0.22)", border: "2px solid #2ecc8f",
                    color: "#eafff4", fontSize: 22, fontWeight: 800,
                    boxShadow: "0 0 16px rgba(46,204,143,0.5)",
                    whiteSpace: "nowrap",
                  }}>
                    <span style={{ fontSize: 14, color: "#bff5df", letterSpacing: "0.03em" }}>Correcta:</span>
                    ✓ {reveal.correctSlot}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
        </div>
      </div>

      {/* Numpad — bandeja inferior */}
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

      {/* Botones de acción — laterales derechos. */}
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
              <th style={{ ...printStyles.th, ...printStyles.thC }}>=</th>
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
                <td style={{ ...printStyles.td, ...printStyles.tdC }}>{e.op}</td>
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
  const res = app.lastResult || { category: "Operaciones combinadas", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
                  <th style={{ textAlign: "center", padding: "6px 8px" }}>=</th>
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
