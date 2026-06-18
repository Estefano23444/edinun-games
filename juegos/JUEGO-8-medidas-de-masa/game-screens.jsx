// game-screens.jsx — Juego de Medidas de masa (1 nivel, 3 rondas escalonadas).
// Audiencia 9 años (excepción al default 6-8 del repo).

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

// Portal a <body> para sacar overlays/modales del scope del DeviceStage.
function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Generador de problemas — 1 categoría ("masa"), 3 rondas.
//   idx 0 → SOLO multiplicación (×). Par aleatorio en la escala
//           kg → hg → dag → g → dg → cg → mg, dirección mayor→menor.
//           Factor entre ×10 (adyacentes) y ×1.000.000 (kg↔mg).
//   idx 1 → SOLO división (÷). Mismo sorteo de pares, dirección
//           menor→mayor. Factor entre ÷10 y ÷1.000.000.
//   idx 2 → kg ↔ lb (factor 1 kg = 2,2 lb visible).
//
// Restricciones:
// - Tope 7 cifras (≤ 9.999.999) en TODOS los valores. Necesario para
//   permitir kg↔mg (factor 1.000.000).
// - Solo respuestas enteras. Por eso en ronda 2 el fromValue siempre
//   es múltiplo del factor (= answer × factor).
// - Para libras: pool de pares enteros (múltiplos de 5 kg / 11 lb).
// ─────────────────────────────────────────────────────────────
const MASS_SCALE = ["kg", "hg", "dag", "g", "dg", "cg", "mg"];

function makeProblem(cat, idx = 0) {
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  if (idx === 0) {
    // Ronda 1 — multiplicación. Sortea dos posiciones distintas en la
    // escala; la de menor índice es la unidad mayor (origen),
    // la de mayor índice es la menor (destino).
    const big = rand(0, MASS_SCALE.length - 2);
    const small = rand(big + 1, MASS_SCALE.length - 1);
    const factor = Math.pow(10, small - big);
    const fromValue = rand(1, 9);
    const answer = fromValue * factor;
    return {
      type: "masa", idx,
      fromValue, fromUnit: MASS_SCALE[big],
      toUnit: MASS_SCALE[small],
      answer,
      showFactor: false,
    };
  }

  if (idx === 1) {
    // Ronda 2 — división. Mismo sorteo de pares pero dirección invertida:
    // origen es la unidad MENOR, destino es la MAYOR.
    // El fromValue se construye como answer × factor para garantizar
    // que la división dé un entero limpio.
    //
    // Cantidad de dígitos de la respuesta = ALEATORIA (1, 2 o 3 dígitos
    // según permita el factor + tope 7 cifras). Primero sorteamos la
    // longitud de la respuesta entre las posibles, luego un valor dentro
    // de esa longitud. Así el chico ingresa una cantidad variable de
    // dígitos en cada problema.
    const big = rand(0, MASS_SCALE.length - 2);
    const small = rand(big + 1, MASS_SCALE.length - 1);
    const factor = Math.pow(10, small - big);
    const maxAnswer = Math.floor(9999999 / factor);

    const possibleLens = [];
    if (maxAnswer >= 1) possibleLens.push(1);
    if (maxAnswer >= 10) possibleLens.push(2);
    if (maxAnswer >= 100) possibleLens.push(3);
    const targetLen = possibleLens[rand(0, possibleLens.length - 1)];
    const minVal = targetLen === 1 ? 1 : Math.pow(10, targetLen - 1);
    const maxVal = Math.min(maxAnswer, Math.pow(10, targetLen) - 1);
    const answer = rand(minVal, maxVal);
    const fromValue = answer * factor;
    return {
      type: "masa", idx,
      fromValue, fromUnit: MASS_SCALE[small],
      toUnit: MASS_SCALE[big],
      answer,
      showFactor: false,
    };
  }

  // idx === 2 — kg ↔ lb con factor 2,2.
  // Pool de pares enteros que caben en 3 cifras (1 kg = 2,2 lb).
  const pool = [
    { kg: 5, lb: 11 },
    { kg: 10, lb: 22 },
    { kg: 15, lb: 33 },
    { kg: 20, lb: 44 },
    { kg: 25, lb: 55 },
    { kg: 50, lb: 110 },
    { kg: 100, lb: 220 },
    { kg: 150, lb: 330 },
    { kg: 200, lb: 440 },
    { kg: 250, lb: 550 },
    { kg: 300, lb: 660 },
    { kg: 400, lb: 880 },
    { kg: 450, lb: 990 },
  ];
  const item = pool[rand(0, pool.length - 1)];
  const dirKgToLb = Math.random() < 0.5;
  if (dirKgToLb) {
    return {
      type: "masa", idx,
      fromValue: item.kg, fromUnit: "kg",
      toUnit: "lb",
      answer: item.lb,
      showFactor: true,
    };
  }
  return {
    type: "masa", idx,
    fromValue: item.lb, fromUnit: "lb",
    toUnit: "kg",
    answer: item.kg,
    showFactor: true,
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

// ─────────────────────────────────────────────────────────────
// Mensajes motivadores cuando se falla un ejercicio
// ─────────────────────────────────────────────────────────────
const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "Recuerda la equivalencia entre unidades.",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Mira de nuevo cuántos ceros se mueven.",
  "¡Vamos al siguiente reto!",
  "Cada error te acerca al acierto.",
];

// ─────────────────────────────────────────────────────────────
// Tabla de unidades de masa — referencia visual para rondas
// métricas (1 y 2). Estilo "tabla del libro": celdas en fila, de
// mayor (kg) a menor (mg). El juego solo evalúa múltiplos del gramo;
// los submúltiplos están en la tabla como referencia del sistema
// completo. En ronda 3 (libras) se reemplaza por la píldora del
// factor 1 kg = 2,2 lb.
// ─────────────────────────────────────────────────────────────
function UnitsTable() {
  const UNITS = ["kg", "hg", "dag", "g", "dg", "cg", "mg"];
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${UNITS.length}, 1fr)`,
      width: 480,
      borderRadius: 12,
      overflow: "hidden",
      border: "2px solid rgba(252,233,168,0.65)",
      boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
    }}>
      {UNITS.map((u, i) => (
        <div key={u} style={{
          padding: "12px 0",
          background: "rgba(252,233,168,0.12)",
          borderRight: i < UNITS.length - 1 ? "2px solid rgba(252,233,168,0.65)" : "none",
          fontFamily: "var(--ed-font-display)", fontWeight: 700,
          fontSize: 22, color: "#fce9a8",
          textAlign: "center",
          textShadow: "0 0 10px rgba(252,233,168,0.35)",
          letterSpacing: "0.02em",
        }}>
          {u}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO — 3 rondas escalonadas por idx
// ─────────────────────────────────────────────────────────────
function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "masa";
  const catLabel = app.currentCatLabel || "Medidas de masa";

  const [problem, setProblem] = useStateG(() => makeProblem(cat, 0));

  // Slot único: array de dígitos del largo de la respuesta correcta.
  const [slots, setSlots] = useStateG([]);

  const [elapsed, setElapsed] = useStateG(0);
  const [stars, setStars] = useStateG(0);
  const [solved, setSolved] = useStateG(0);
  const [attempted, setAttempted] = useStateG(0);
  const [starsSession, setStarsSession] = useStateG(0);
  const [feedback, setFeedback] = useStateG(null);
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  // Fase "reveal": antes del overlay "¡UPS!" se muestra la respuesta correcta.
  // Mecánica única de numpad → { correctSlot: "<valor correcto>" }: los slots
  // conservan lo que escribió el niño (en rojo) y aparece un cartel verde con
  // el número correcto al lado. NO se sobrescribe lo que puso el niño.
  const [reveal, setReveal] = useStateG(null);
  // El revelado (respuesta correcta marcada) es el momento educativo → dura más.
  // El overlay "¡UPS!" es solo refuerzo emocional → corto (ver `wait` en verify).
  const REVEAL_MS = 2800;
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  const [log, setLog] = useStateG([]);

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // Reset de slots al cambiar de problema (y en el primer render).
  useEffectG(() => {
    if (problem.type === "masa") {
      const len = String(problem.answer).length;
      setSlots(Array(len).fill(""));
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

  function pressDigit(d) {
    if (reveal) return;
    const emptyIdx = slots.findIndex((x) => x === "");
    if (emptyIdx === -1) return;
    // No leading zero — la respuesta es entera ≥ 1, ningún número empieza con 0.
    if (emptyIdx === 0 && d === "0") return;
    const next = [...slots];
    next[emptyIdx] = d;
    setSlots(next);
  }

  function eraseLast() {
    if (reveal) return;
    for (let i = slots.length - 1; i >= 0; i--) {
      if (slots[i] !== "") {
        const next = [...slots];
        next[i] = "";
        setSlots(next);
        return;
      }
    }
  }

  function verify() {
    if (reveal) return;
    const allFilled = slots.length > 0 && slots.every((x) => x !== "");
    if (!allFilled) {
      setFeedback("err");
      setFeedbackMsg("Completa los casilleros");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }

    const userVal = parseInt(slots.join(""), 10);
    const isCorrect = userVal === problem.answer;

    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    // Adaptación del log (igual en acierto y fallo):
    const partialEntry = {
      a: `${problem.fromValue} ${problem.fromUnit}`,
      b: problem.toUnit,
      op: "=",
      correctAnswer: String(problem.answer),
      userAnswer: String(userVal),
    };

    if (!isCorrect) {
      // Mantener lo que escribió el niño (slots en rojo vía reveal) y mostrar el
      // número correcto en un cartel verde aparte, antes del "¡UPS!". No se toca
      // el `feedback` global aquí: así el overlay no aparece durante el revelado.
      setReveal({ correctSlot: String(problem.answer) });
      setTimeout(() => {
        setReveal(null);
        finalize(false, partialEntry);
      }, REVEAL_MS);
      return;
    }

    finalize(true, partialEntry);
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

    // El overlay "¡UPS!" ya solo es refuerzo emocional (la respuesta correcta
    // se reveló antes) → corto. El de acierto se queda como estaba.
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

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  const bocadilloText = "Convierte la masa a la unidad pedida.";
  const instructionText = "⚖️ ¡Equilibra la balanza!";

  // Tile width / fontSize según largo del valor visible.
  // Hasta 7 cifras (1.000.000 mg = 1 kg).
  function valueTileWidth(t) {
    const len = String(t).length;
    if (len <= 2) return Math.max(56, len * 28 + 22);
    if (len === 3) return 92;
    if (len === 4) return 110;
    if (len === 5) return 130;
    if (len === 6) return 150;
    return 168; // 7 dígitos
  }
  function valueFontSize(t) {
    const len = String(t).length;
    if (len <= 2) return 44;
    if (len === 3) return 38;
    if (len === 4) return 34;
    if (len === 5) return 30;
    if (len === 6) return 28;
    return 26; // 7 dígitos
  }
  function slotSize(slotsLen) {
    if (slotsLen <= 1) return 52;
    if (slotsLen === 2) return 46;
    if (slotsLen === 3) return 40;
    if (slotsLen === 4) return 36;
    if (slotsLen === 5) return 32;
    if (slotsLen === 6) return 28;
    return 26; // 7 slots
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* HUD superior — sin tabs de nivel (juego de nivel único). */}
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
        width: 580, bottom: 92,
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

        {/* Guía visual:
            - Rondas 1, 2 (idx 0, 1): tabla de unidades métricas.
            - Ronda 3 (idx 2): píldora del factor 1 kg = 2,2 lb. */}
        {problem.showFactor ? (
          <div style={{
            display: "inline-flex", alignItems: "center",
            padding: "8px 18px",
            borderRadius: 999,
            border: "1.5px solid rgba(252,233,168,0.5)",
            background: "rgba(10,6,35,0.55)",
            fontFamily: "var(--ed-font-display)", fontWeight: 700,
            fontSize: 22, color: "#fce9a8",
            letterSpacing: "0.03em",
            textShadow: "0 0 10px rgba(252,233,168,0.35)",
          }}>
            1 kg = 2,2 lb
          </div>
        ) : (
          <UnitsTable />
        )}

        {/* Ecuación: "5 dag = [_ _] g" */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
          flexWrap: "nowrap",
        }}>
          {/* Lado izquierdo: valor + unidad */}
          <div style={{
            display: "flex", alignItems: "baseline", gap: 6,
            fontFamily: "var(--ed-font-display)", fontWeight: 700,
            color: "#fce9a8",
            textShadow: "0 0 12px rgba(252,233,168,0.4), 0 2px 6px rgba(0,0,0,0.4)",
          }}>
            <div style={{
              minWidth: valueTileWidth(problem.fromValue),
              fontSize: valueFontSize(problem.fromValue),
              textAlign: "right",
            }}>
              {problem.fromValue}
            </div>
            <div style={{ fontSize: 24, color: "#fce9a8", opacity: 0.85 }}>
              {problem.fromUnit}
            </div>
          </div>

          {/* Igual */}
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 700,
            fontSize: 38, color: "#fce9a8",
          }}>=</div>

          {/* Slots — durante el revelado se pintan en rojo (lo que escribió el
              niño) aunque el feedback global aún no esté activo. */}
          <div style={{ display: "flex", gap: 5 }}>
            {Array.from({ length: slots.length }).map((_, j) => (
              <SlotBox key={j} value={slots[j] || ""} feedback={reveal && reveal.correctSlot != null ? "err" : feedback} size={slotSize(slots.length)} />
            ))}
          </div>

          {/* Unidad destino */}
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 700,
            fontSize: 24, color: "#fce9a8", opacity: 0.85,
            textShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}>
            {problem.toUnit}
          </div>

          {/* Al fallar: los slots conservan lo que el niño escribió (en rojo)
              y aquí aparece un cartel verde con la respuesta correcta. */}
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
              <th style={printStyles.th}>Conversión</th>
              <th style={{ ...printStyles.th, ...printStyles.thC }}>=</th>
              <th style={{ ...printStyles.th, ...printStyles.thR }}>Unidad destino</th>
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
  const res = app.lastResult || { category: "Medidas de masa", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Conversión</th>
                  <th style={{ textAlign: "center", padding: "6px 8px" }}>=</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Unidad destino</th>
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
