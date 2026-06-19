// game-screens.jsx — Juego de Números primos (1 nivel, 3 rondas con
// mecánicas distintas).
// Audiencia 10 años (excepción al default 6-8 del repo).

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

// Portal a <body> para sacar overlays/modales del scope del DeviceStage.
function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Helpers de primalidad y factorización.
// ─────────────────────────────────────────────────────────────
function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

function primeFactors(n) {
  const factors = [];
  let m = n;
  let p = 2;
  while (m > 1) {
    while (m % p === 0) {
      factors.push(p);
      m /= p;
    }
    p++;
  }
  return factors;
}

// Pools precomputados.
const PRIMES_2_80 = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79];
const COMPOSITES_2_80 = [];
for (let i = 4; i <= 80; i++) {
  if (!isPrime(i)) COMPOSITES_2_80.push(i);
}
// Compuestos no triviales (excluir múltiplos de 10) para ronda 2.
const NON_TRIVIAL_COMPOSITES = COMPOSITES_2_80.filter((n) => n >= 10 && n % 10 !== 0);
// Pool de números para factorizar (cap 4 factores).
const FACTOR_POOL = [
  12, 14, 15, 18, 20, 21, 24, 28, 30, 35, 36, 42, 45,
  50, 54, 56, 60, 63, 70, 75, 84, 90, 100,
];

// ─────────────────────────────────────────────────────────────
// Generador de problemas — 1 categoría ("primos"), 3 rondas.
//   idx 0 → ¿primo o compuesto? (binary tap)
//   idx 1 → ¿cuál es el primo? (4 opciones)
//   idx 2 → descomposición en factores primos (numpad + ×)
// ─────────────────────────────────────────────────────────────
function makeProblem(cat, idx = 0) {
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  if (idx === 0) {
    // Mezcla 50/50 primos vs compuestos en rango 2..80.
    const isP = Math.random() < 0.5;
    const pool = isP ? PRIMES_2_80 : COMPOSITES_2_80;
    const n = pool[rand(0, pool.length - 1)];
    return {
      type: "primos", idx,
      number: n,
      isPrime: isP,
    };
  }

  if (idx === 1) {
    // 4 números, uno solo es primo. Compuestos no triviales.
    const primesInRange = PRIMES_2_80.filter((p) => p >= 10);
    const correct = primesInRange[rand(0, primesInRange.length - 1)];
    // Elegir 3 compuestos distintos.
    const distractorsPool = NON_TRIVIAL_COMPOSITES.slice();
    // Shuffle Fisher-Yates parcial.
    for (let i = distractorsPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [distractorsPool[i], distractorsPool[j]] = [distractorsPool[j], distractorsPool[i]];
    }
    const distractors = distractorsPool.slice(0, 3);
    const options = [correct, ...distractors];
    // Shuffle posiciones.
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return {
      type: "primos", idx,
      options,
      correct,
    };
  }

  // idx === 2 — Descomposición en factores primos.
  const n = FACTOR_POOL[rand(0, FACTOR_POOL.length - 1)];
  const factors = primeFactors(n);
  return {
    type: "primos", idx,
    number: n,
    factors, // ej: [2, 3, 7] para 42
  };
}

// ─────────────────────────────────────────────────────────────
// Slot de un dígito (ronda 3).
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
// Mensajes motivadores cuando se falla un ejercicio
// ─────────────────────────────────────────────────────────────
const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "Recuerda: un primo solo se divide por 1 y por sí mismo.",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Mira de nuevo los divisores.",
  "¡Vamos al siguiente reto!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO — 3 rondas con mecánicas distintas
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "primos";
  const catLabel = app.currentCatLabel || "Números primos";

  const [problem, setProblem] = useStateG(() => makeProblem(cat, 0));

  // Estado de ronda 3 (descomposición guiada paso a paso):
  // - currentN: el número que toca dividir AHORA. Empieza en problem.number
  //   y se va dividiendo con cada factor primo correcto.
  // - steps: lista de pasos completados {dividend, divisor, quotient}.
  //   Se renderizan como escalera de divisiones (más tenue) sobre la fila
  //   activa.
  // - slot: input actual del chico (1 dígito — todos los factores del pool
  //   son 2/3/5/7).
  const [currentN, setCurrentN] = useStateG(0);
  const [steps, setSteps] = useStateG([]);
  const [slot, setSlot] = useStateG("");

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  // Fase "reveal": antes del overlay "¡UPS!" se marca la respuesta correcta.
  // R1 (PRIMO/COMPUESTO) y R2 (4 opciones): { correct, wrong } → opción
  //   correcta en verde con ✓, la elegida en rojo.
  // R3 (numpad, descomposición): { correctSlot: "<factor correcto>" } → el slot
  //   conserva lo que escribió el niño (en rojo) y aparece un cartel verde con
  //   el factor primo correcto del paso. NO sobrescribe su input.
  const [reveal, setReveal] = useStateG(null);
  // El revelado (respuesta correcta marcada) es el momento educativo → dura más.
  // El overlay "¡UPS!" es solo refuerzo emocional → corto (ver `wait` en finalize).
  const REVEAL_MS = 2800;
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [confirmingRestart, setConfirmingRestart] = useStateG(false);
  const [log, setLog] = useStateG([]);

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // Reset al cambiar de problema. Solo aplica a ronda 3.
  useEffectG(() => {
    if (problem.idx === 2) {
      setCurrentN(problem.number);
      setSteps([]);
      setSlot("");
    } else {
      setCurrentN(0);
      setSteps([]);
      setSlot("");
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

  // Resolver una ronda (ronda 1 y 2 — tap directo).
  function answerTap(userValue) {
    if (reveal) return;
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    let isCorrect = false;
    let entry = {};
    let correctValue = null; // valor crudo de la opción correcta (para el reveal)

    if (problem.idx === 0) {
      // Ronda 1: userValue = "PRIMO" o "COMPUESTO"
      const correctLabel = problem.isPrime ? "PRIMO" : "COMPUESTO";
      isCorrect = userValue === correctLabel;
      correctValue = correctLabel;
      entry = {
        a: String(problem.number),
        b: correctLabel,
        op: "=",
        correctAnswer: correctLabel,
        userAnswer: userValue,
      };
    } else if (problem.idx === 1) {
      // Ronda 2: userValue = número elegido
      isCorrect = userValue === problem.correct;
      correctValue = problem.correct;
      entry = {
        a: problem.options.join(", "),
        b: "primo",
        op: "→",
        correctAnswer: String(problem.correct),
        userAnswer: String(userValue),
      };
    }

    if (!isCorrect) {
      // Mostrar la opción correcta (verde ✓) y la elegida (roja) antes del "¡UPS!".
      setReveal({ correct: correctValue, wrong: userValue });
      setTimeout(() => { setReveal(null); finalize(false, entry); }, REVEAL_MS);
      return;
    }
    finalize(isCorrect, entry);
  }

  // Resolver ronda 3 — un paso de la descomposición guiada.
  // El chico escribe UN factor primo a la vez; cada paso correcto avanza
  // (currentN se divide). Cuando currentN = 1, el ejercicio termina.
  // Mistakes en el medio son transitorios (no fallan el ejercicio); solo
  // limpian el slot y permiten reintentar. La penalización es por tiempo.
  function verify() {
    if (problem.idx !== 2 || reveal) return;

    if (slot === "") {
      setFeedback("err");
      setFeedbackMsg("Escribe un factor primo");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }

    const p = parseInt(slot, 10);
    const valid = isPrime(p) && currentN % p === 0;

    if (!valid) {
      // Error transitorio: NO avanza, NO finaliza el ejercicio (el chico
      // reintenta). Antes de limpiar, revelar un factor primo correcto del
      // paso en un cartel verde, conservando lo que escribió el niño (en rojo).
      const correctFactor = primeFactors(currentN)[0];
      setReveal({ correctSlot: String(correctFactor) });
      setTimeout(() => {
        setReveal(null);
        setSlot("");
      }, REVEAL_MS);
      return;
    }

    // Paso válido: dividir y avanzar.
    const quotient = currentN / p;
    const newSteps = [...steps, { dividend: currentN, divisor: p, quotient }];
    setSteps(newSteps);
    setSlot("");

    if (quotient === 1) {
      // Descomposición completa — finalizar el ejercicio como CORRECTO.
      if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();
      const userFactors = newSteps.map((s) => s.divisor);
      const entry = {
        a: String(problem.number),
        b: problem.factors.join("×"),
        op: "=",
        correctAnswer: problem.factors.join("×"),
        userAnswer: userFactors.join("×"),
      };
      finalize(true, entry);
    } else {
      // Quedan más factores — actualizar currentN y dejar que el chico
      // siga. Feedback verde corto para reforzar el acierto.
      setCurrentN(quotient);
      setFeedback("ok");
      setFeedbackMsg(`${p} ✓`);
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 600);
    }
  }

  // Finalizar el ejercicio: actualizar stats, log, navegar.
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
        setProblem(makeProblem(cat, newAttempted));
        exerciseStart.current = Date.now();
      }
    }, wait);
  }

  // Numpad ronda 3: 1 slot único. El chico escribe el factor primo del
  // paso actual. El slot soporta hasta 1 dígito (todos los factores del
  // pool son 2/3/5/7).
  function pressDigit(d) {
    if (problem.idx !== 2 || reveal) return;
    // 0 y 1 nunca son factores válidos (el pool de factores es 2/3/5/7).
    if (d === "0" || d === "1") return;
    // Respuesta de un solo dígito: tocar otro número REEMPLAZA el actual,
    // así el niño puede corregir sin tener que tocar BORRAR primero.
    setSlot(d);
  }

  function eraseLast() {
    if (problem.idx !== 2 || reveal) return;
    if (slot !== "") setSlot("");
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  // Reiniciar el juego desde cero — disponible solo en rondas 1 y 2.
  // Resetea todo: stats, log, cronómetro y vuelve a sortear ronda 1.
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
    setSlot("");
    setSteps([]);
    setCurrentN(0);
    setProblem(makeProblem(cat, 0));
    started.current = Date.now();
    exerciseStart.current = Date.now();
  }

  const bocadilloText = "Encuentra los primos.";
  const instructionByIdx = [
    "¿Primo o compuesto?",
    "¿Cuál es el primo?",
    "Descompón en factores primos",
  ];
  const instructionText = instructionByIdx[problem.idx] || "";

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
          hueco arriba (donde antes vivía el indicador de RONDA). ══════ */}
      <div data-qa="zona-central" style={{
        position: "absolute", left: "50%", top: 80, transform: "translateX(-50%)",
        width: 580, bottom: problem.idx === 2 ? 92 : 28,
        display: "flex", flexDirection: "column",
        alignItems: "center",
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

        {/* Contenido interactivo de cada ronda, centrado verticalmente. */}
        <div data-qa="zona-contenido" style={{
          flex: 1, width: "100%",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "space-evenly",
        }}>

        {/* Ronda 1 — número grande + 2 botones */}
        {problem.idx === 0 && (
          <>
            <div style={{
              fontFamily: "var(--ed-font-display)", fontWeight: 700,
              fontSize: 100, lineHeight: 1, color: "#fce9a8",
              textShadow: "0 0 20px rgba(252,233,168,0.45), 0 4px 12px rgba(0,0,0,0.5)",
              padding: "10px 30px",
              borderRadius: 18,
              border: "2px solid rgba(252,233,168,0.4)",
              background: "rgba(10,6,35,0.5)",
              minWidth: 180,
            }}>
              {problem.number}
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              {["PRIMO", "COMPUESTO"].map((label, bi) => {
                const baseBorder = bi === 0 ? "#4fd8ff" : "#f5a623";
                const baseGlow = bi === 0 ? "rgba(79,216,255,0.35)" : "rgba(245,166,35,0.35)";
                const baseBg = bi === 0
                  ? "linear-gradient(180deg, rgba(79,216,255,0.2), rgba(79,216,255,0.08))"
                  : "linear-gradient(180deg, rgba(245,166,35,0.22), rgba(245,166,35,0.08))";
                const isCorrectOpt = reveal && reveal.correct != null && label === reveal.correct;
                const isWrongOpt = reveal && reveal.wrong != null && label === reveal.wrong;
                const locked = feedback !== null || reveal !== null;
                return (
                <button
                  key={label}
                  onClick={() => answerTap(label)}
                  disabled={locked}
                  style={{
                    position: "relative",
                    fontFamily: "var(--ed-font-display)", fontWeight: 800,
                    fontSize: 22, letterSpacing: "0.06em",
                    padding: "16px 40px",
                    borderRadius: 14,
                    border: `2.5px solid ${
                      isCorrectOpt ? "#2ecc8f" :
                      isWrongOpt ? "#ff6b6b" :
                      baseBorder
                    }`,
                    background: isCorrectOpt ? "rgba(46,204,143,0.25)"
                            : isWrongOpt ? "rgba(255,107,107,0.22)"
                            : baseBg,
                    color: isCorrectOpt ? "#eafff4" : isWrongOpt ? "#ffe3e3" : "#fff",
                    cursor: locked ? "not-allowed" : "pointer",
                    boxShadow: isCorrectOpt ? "0 0 16px rgba(46,204,143,0.6)"
                            : isWrongOpt ? "0 0 16px rgba(255,107,107,0.5)"
                            : `0 6px 18px ${baseGlow}`,
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    opacity: locked && !isCorrectOpt && !isWrongOpt ? 0.45 : (locked ? 1 : 1),
                  }}
                  onMouseEnter={(e) => !locked && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
                >
                  {label}
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

        {/* Ronda 2 — 4 números clickeables.
            Ancho contenido a 420 px (originalmente 520) para no
            superponer con el personaje a la izquierda (que llega a
            ~228 px) ni con la columna de acciones a la derecha
            (que arranca en ~732 px). */}
        {problem.idx === 1 && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14, width: 420,
          }}>
            {problem.options.map((n, i) => {
              const isCorrectOpt = reveal && reveal.correct != null && n === reveal.correct;
              const isWrongOpt = reveal && reveal.wrong != null && n === reveal.wrong;
              const locked = feedback !== null || reveal !== null;
              return (
              <button
                key={i}
                onClick={() => answerTap(n)}
                disabled={locked}
                style={{
                  position: "relative",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700,
                  fontSize: 44, lineHeight: 1,
                  padding: "16px 0",
                  borderRadius: 14,
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
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
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
                {n}
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
        )}

        {/* Ronda 3 — escalera de divisiones paso a paso.
            Pasos completados se renderizan tenues encima; la fila activa
            (currentN ÷ [_] = ?) está resaltada en dorado. */}
        {problem.idx === 2 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            fontFamily: "var(--ed-font-display)", fontWeight: 700,
          }}>
            {steps.map((s, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                fontSize: 24, color: "rgba(252,233,168,0.55)",
                lineHeight: 1.1,
              }}>
                <span style={{ minWidth: 56, textAlign: "right" }}>{s.dividend}</span>
                <span>÷</span>
                <span style={{ minWidth: 32, textAlign: "center", color: "#fce9a8" }}>{s.divisor}</span>
                <span>=</span>
                <span style={{ minWidth: 56, textAlign: "left" }}>{s.quotient}</span>
              </div>
            ))}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              fontSize: 38, color: "#fce9a8",
              textShadow: "0 0 12px rgba(252,233,168,0.4), 0 2px 6px rgba(0,0,0,0.45)",
              padding: "6px 0",
              marginTop: steps.length > 0 ? 4 : 0,
            }}>
              <span style={{ minWidth: 80, textAlign: "right" }}>{currentN}</span>
              <span>÷</span>
              {/* Al fallar: el slot conserva lo que el niño escribió (en rojo)
                  y al lado aparece un cartel verde con un factor primo correcto. */}
              <SlotBox value={slot} feedback={reveal && reveal.correctSlot != null ? "err" : feedback} size={48} />
              <span>=</span>
              <span style={{ minWidth: 60, textAlign: "left", color: "rgba(252,233,168,0.55)" }}>?</span>
              {reveal && reveal.correctSlot != null && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 16px", borderRadius: 999,
                  background: "rgba(11,54,41,0.98)", border: "2px solid #2ecc8f",
                  color: "#eafff4", fontSize: 18, fontWeight: 800,
                  boxShadow: "0 0 16px rgba(46,204,143,0.5)",
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ fontSize: 14, color: "#bff5df", letterSpacing: "0.03em" }}>Correcta:</span>
                  ✓ {reveal.correctSlot}
                </span>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Numpad — solo en ronda 3 */}
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

      {/* Botones de acción — laterales derechos.
          Ronda 1 y 2: REINICIAR + SALIR.
          Ronda 3: VERIFICAR + BORRAR + SALIR. */}
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
  const res = app.lastResult || { category: "Números primos", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
