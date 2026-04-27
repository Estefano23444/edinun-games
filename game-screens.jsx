// game-screens.jsx — Juego, resultados, perfil.

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

// Portal a <body> para sacar overlays/modales del scope del DeviceStage,
// que aplica `transform: scale()` al lienzo 900×540. Sin esto, un
// `position: fixed` o `absolute` con `inset: 0` solo cubre el área del
// lienzo escalado y deja los laterales del letterboxing sin oscurecer.
function PortalToBody({ children }) {
  return ReactDOM.createPortal(children, document.body);
}

// ─────────────────────────────────────────────────────────────
// Generador de problemas por categoría
// ─────────────────────────────────────────────────────────────
function makeProblem(cat) {
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  switch (cat) {
    case "suma": {
      const a = rand(12, 89), b = rand(10, 99);
      return { a, b, op: "+", answer: a + b };
    }
    case "resta": {
      let a = rand(50, 999), b = rand(10, 499);
      if (b > a) [a, b] = [b, a];
      return { a, b, op: "−", answer: a - b };
    }
    case "mult": {
      const a = rand(2, 12), b = rand(2, 9);
      return { a, b, op: "×", answer: a * b };
    }
    case "div": {
      const b = rand(2, 9);
      const ans = rand(2, 12);
      return { a: b * ans, b, op: "÷", answer: ans };
    }
    case "frac":
      return { a: 1, b: 2, op: "+", answer: 3, frac: true };
    default: {
      const a = rand(10, 99), b = rand(10, 99);
      return { a, b, op: "+", answer: a + b };
    }
  }
}

function digits(n) {
  return String(n).split("");
}

// ─────────────────────────────────────────────────────────────
// PANTALLA DE JUEGO — pizarra estilo referencia pero cósmica
// ─────────────────────────────────────────────────────────────
// Frases motivadoras matemáticas para cuando el estudiante se equivoca
// (no se repite el ejercicio; el feedback acompaña con carisma).
const ENCOURAGEMENTS = [
  "¡Casi! Sigue intentándolo.",
  "Los números no muerden 🔢",
  "¡La próxima es tuya!",
  "Equivocarse también es aprender.",
  "Las matemáticas son una aventura.",
  "¡Vamos al siguiente reto!",
  "Cada error te acerca al acierto.",
];

function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "suma";
  const catLabel = app.currentCatLabel || "Sumas";

  const [problem, setProblem] = useStateG(() => makeProblem(cat));
  const [answer, setAnswer] = useStateG([]);
  const [elapsed, setElapsed] = useStateG(0);
  // Estrellas SIEMPRE empiezan en 0 al iniciar una partida — no acumulan
  // entre rondas (regla pedida por el usuario).
  const [stars, setStars] = useStateG(0);
  const [streak, setStreak] = useStateG(0);
  const [maxStreak, setMaxStreak] = useStateG(0);
  const [solved, setSolved] = useStateG(0);       // aciertos en la sesión
  const [attempted, setAttempted] = useStateG(0); // ejercicios intentados (correctos o no)
  const [starsSession, setStarsSession] = useStateG(0); // estrellas ganadas en la sesión actual
  const [feedback, setFeedback] = useStateG(null); // 'ok' | 'err' | null
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [hintOn, setHintOn] = useStateG(false);
  // Cambio de nivel desde los tabs del HUD: guarda el nivel propuesto
  // mientras se muestra el modal de confirmación. null = sin modal.
  const [pendingLevel, setPendingLevel] = useStateG(null);
  // Modal de confirmación para rendirse y ver resultados parciales.
  const [confirmingSurrender, setConfirmingSurrender] = useStateG(false);
  // Log de ejercicios de la ronda — alimenta el reporte académico de
  // ResultsScreen. Cada entrada: {idx, a, b, op, correctAnswer, userAnswer,
  // isCorrect, time, earned}.
  const [log, setLog] = useStateG([]);

  const slots = digits(problem.answer).length;
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // Cronómetro total
  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  // answer es un array alineado con la operación — answer[0] es la más
  // significativa (centena), answer[slots-1] es la unidad. Se llena de
  // derecha a izquierda: primero unidades, luego decenas, luego centenas.
  function press(d) {
    setAnswer((prev) => {
      const next = [...prev];
      while (next.length < slots) next.push(undefined);
      // Buscar de derecha a izquierda el primer slot vacío
      for (let i = slots - 1; i >= 0; i--) {
        if (next[i] === undefined) { next[i] = d; return next; }
      }
      return prev; // todos llenos
    });
  }
  function eraseAt(i) {
    setAnswer((prev) => {
      const next = [...prev];
      while (next.length < slots) next.push(undefined);
      next[i] = undefined;
      return next;
    });
  }
  function erase() {
    // Borra el último dígito colocado (el de más a la izquierda entre los llenos)
    setAnswer((prev) => {
      const next = [...prev];
      while (next.length < slots) next.push(undefined);
      for (let i = 0; i < slots; i++) {
        if (next[i] !== undefined) { next[i] = undefined; return next; }
      }
      return next;
    });
  }
  function verify() {
    const filled = Array.from({ length: slots }, (_, i) => answer[i]);
    if (filled.some(d => d === undefined || d === "")) {
      // Faltan dígitos: feedback de error suave (no consume intento)
      setFeedback("err");
      setFeedbackMsg("Completa todos los casilleros");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }
    const joined = filled.join("");
    const entered = parseInt(joined, 10);
    const isCorrect = entered === problem.answer;
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    // Estrellas por ejercicio: máximo 10, decrece con el tiempo. <3s → 10, +3s cada vez.
    const earned = isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;

    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStreak = isCorrect ? streak + 1 : 0;
    const newMaxStreak = Math.max(maxStreak, newStreak);
    const newStarsSession = starsSession + earned;
    const newStarsTotal = stars + earned;

    const entry = {
      idx: newAttempted,
      a: problem.a,
      b: problem.b,
      op: problem.op,
      correctAnswer: problem.answer,
      userAnswer: entered,
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
    setStreak(newStreak);
    setMaxStreak(newMaxStreak);
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 950 : 1200;
    setTimeout(() => {
      setFeedback(null);
      setFeedbackMsg("");
      setAnswer([]);
      if (newAttempted >= 3) {
        setApp((s) => ({
          ...s,
          stars: newStarsTotal,
          lastResult: {
            category: catLabel,
            solved: newSolved,
            total: 3,
            time: elapsed,
            streak: newMaxStreak,
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

  // Aplica un cambio de nivel desde los tabs: deriva nueva categoría,
  // regenera problema y resetea ronda (intentos/aciertos/cronómetro).
  // No navega — sigue en la pantalla de juego.
  function applyLevelChange(newLevel) {
    let catId = "suma", catLabel = "Sumas";
    if (newLevel === "basic") {
      const pick = Math.random() < 0.5 ? ["suma", "Sumas"] : ["resta", "Restas"];
      catId = pick[0]; catLabel = pick[1];
    } else if (newLevel === "medium") {
      catId = "mult"; catLabel = "Multiplicaciones";
    } else if (newLevel === "advanced") {
      catId = "div"; catLabel = "Divisiones";
    }
    setApp((s) => ({ ...s, level: newLevel, currentCategory: catId, currentCatLabel: catLabel }));
    setProblem(makeProblem(catId));
    setAnswer([]);
    setSolved(0);
    setAttempted(0);
    setStreak(0);
    setMaxStreak(0);
    setStarsSession(0);
    setLog([]);
    setFeedback(null);
    setFeedbackMsg("");
    started.current = Date.now();
    exerciseStart.current = Date.now();
    setElapsed(0);
  }

  // Rendirse: cierra la ronda con lo que haya hasta ahora y navega a
  // resultados. El reporte mostrará solo los ejercicios intentados.
  function surrender() {
    setApp((s) => ({
      ...s,
      stars,
      lastResult: {
        category: catLabel,
        solved,
        total: 3,
        time: elapsed,
        streak: maxStreak,
        starsEarned: starsSession,
        log,
        surrendered: true,
      },
    }));
    go("results");
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }

  const aDigits = digits(problem.a);
  const bDigits = digits(problem.b);
  const maxLen = Math.max(aDigits.length, bDigits.length);
  const padA = Array(maxLen - aDigits.length).fill(" ").concat(aDigits);
  const padB = Array(maxLen - bDigits.length).fill(" ").concat(bDigits);

  // Tab activo = nivel actual de la sesión (`app.level`), NO derivado de
  // CATEGORIES. El catálogo tiene a `div` marcado como "medium" pero en este
  // juego mapeamos avanzado → división, así que basarse en CATEGORIES.level
  // hacía que el tab quedara desincronizado al cambiar a Avanzado.
  const levelOfCat = app.level || "basic";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>


      {/* Top HUD — el centro (tabs de nivel) está absolutamente centrado en la
          pantalla, no entre las dos columnas, para que no se desplace cuando el
          logo es más ancho que el timer/stars de la derecha. */}
      <div style={{ position: "absolute", top: 10, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        {/* Izq: logo (mismo tamaño que CharacterScreen para consistencia) */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <EdinunLogoMini size={64} />
        </div>

        {/* Centro: barra de niveles — clickeable, anclada al centro real de la
            pantalla. Tocar un nivel distinto al actual abre un modal de
            confirmación; aceptar reinicia la ronda con la dificultad nueva. */}
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {[
            { id: "basic", label: "BÁSICO", c: "#f5a623" },
            { id: "medium", label: "MEDIO", c: "#f5d84b" },
            { id: "advanced", label: "AVANZADO", c: "#4fa0ff" },
          ].map((lv) => {
            const active = lv.id === levelOfCat;
            return (
              <button
                key={lv.id}
                onClick={() => { if (!active) setPendingLevel(lv.id); }}
                disabled={active}
                style={{
                  padding: "6px 14px", borderRadius: 999,
                  background: active ? lv.c : "rgba(255,255,255,0.15)",
                  color: active ? "#0b3a2d" : "rgba(255,255,255,0.85)",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
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

        {/* Der: stats */}
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

      {/* Personaje compañero — lado izquierdo, elevado para no chocar con el
          numpad. La frase motivadora ahora aparece en el feedback central
          (con atribución al personaje), así que el bocadillo se eliminó.
          Sin z-index: queda en el orden natural del DOM, por encima de los
          glifos del fondo pero por debajo de la ecuación, numpad y botones,
          que vienen después en el JSX. */}
      <div style={{
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

      {/* Racha / progreso — separado del HUD para que no se pegue a los tabs de nivel */}
      <div style={{
        position: "absolute", top: 78, left: "50%", transform: "translateX(-50%)",
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

      {/* ══════ ECUACIÓN PROTAGONISTA ══════
          Centrada en la pantalla, ocupa el espacio principal.
          Columnas CDU alineadas verticalmente. Los slots quedan
          debajo de la línea divisoria, directamente bajo las columnas. */}
      {(() => {
        const DIGIT_W = 54;     // ancho de cada columna (número/slot)
        const GAP = 10;         // gap entre columnas
        const OP_W = 44;        // ancho de la celda del operador
        // CRÍTICO: el número de columnas debe cubrir tanto los operandos
        // como el resultado. Si slots > maxLen (ej. 59+74=133 → 3 slots, maxLen=2),
        // ampliamos el grid y padeamos los operandos a la izquierda con celdas vacías.
        const columns = Math.max(maxLen, slots);
        const TOTAL_W = OP_W + columns * DIGIT_W + columns * GAP;
        // Etiquetas CDU siempre alineadas desde la derecha (unidades siempre a la derecha)
        const labels = ["C","D","U"].slice(3 - columns);
        // Padding de operandos a la izquierda para alinear por la derecha con el grid total
        const leftPadA = Array(columns - padA.length).fill(" ");
        const leftPadB = Array(columns - padB.length).fill(" ");
        const fullA = leftPadA.concat(padA);
        const fullB = leftPadB.concat(padB);
        return (
          <div style={{
            position: "absolute", top: 104, left: "50%", transform: "translateX(-50%)",
            textAlign: "center", width: TOTAL_W,
          }}>
            <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 15, color: "rgba(255,255,255,0.9)", marginBottom: 8 }}>
              Resuelve la siguiente operación:
            </div>

            {/* Encabezado C D U — alineado sobre las columnas de dígitos */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `${OP_W}px repeat(${columns}, ${DIGIT_W}px)`,
              gap: GAP, justifyContent: "center", alignItems: "center",
              marginBottom: 6,
            }}>
              <span />
              {labels.map((lb) => (
                <div key={lb} className={`ed-dice ed-dice-${lb.toLowerCase()}`} style={{ width: 32, height: 32, fontSize: 16, margin: "0 auto" }}>
                  {lb}
                </div>
              ))}
            </div>

            {/* Fila A */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `${OP_W}px repeat(${columns}, ${DIGIT_W}px)`,
              gap: GAP, justifyContent: "center", alignItems: "center",
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 54, color: "#fff",
              lineHeight: 1,
            }}>
              <span />
              {fullA.map((d, i) => <span key={`a${i}`}>{d}</span>)}
            </div>

            {/* Fila B con operador */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `${OP_W}px repeat(${columns}, ${DIGIT_W}px)`,
              gap: GAP, justifyContent: "center", alignItems: "center",
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 54, color: "#fff",
              lineHeight: 1, marginTop: 2,
            }}>
              <span style={{ textAlign: "center" }}>{problem.op}</span>
              {fullB.map((d, i) => <span key={`b${i}`}>{d}</span>)}
            </div>

            {/* Línea divisoria */}
            <div style={{
              height: 4, background: "#fff", borderRadius: 2,
              margin: "8px auto 10px", width: TOTAL_W - 12,
              boxShadow: "0 0 10px rgba(255,255,255,0.35)",
            }} />

            {/* Slots de respuesta — alineados bajo las columnas CDU (derecha) */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `${OP_W}px repeat(${columns}, ${DIGIT_W}px)`,
              gap: GAP, justifyContent: "center", alignItems: "center",
            }}>
              <span />
              {/* Padding izquierdo vacío para empujar slots a la derecha */}
              {Array.from({ length: columns - slots }).map((_, k) => <span key={`pad${k}`} />)}
              {Array.from({ length: slots }).map((_, i) => {
                const d = answer[i];
                const filled = d !== undefined && d !== "";
                // El slot "activo" es el más a la derecha que esté vacío (U→D→C)
                let activeIdx = -1;
                for (let k = slots - 1; k >= 0; k--) {
                  if (answer[k] === undefined || answer[k] === "") { activeIdx = k; break; }
                }
                const isActive = i === activeIdx;
                return (
                  <div
                    key={i}
                    className={`ed-answer-slot ${isActive ? "active" : ""} ${filled ? "filled" : ""}`}
                    draggable={filled}
                    onDragStart={(e) => {
                      if (!filled) return;
                      e.dataTransfer.setData("text/plain", `s:${i}:${d}`);
                      e.dataTransfer.effectAllowed = "move";
                      e.currentTarget.classList.add("dragging");
                    }}
                    onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                    onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("drag-over");
                      const data = e.dataTransfer.getData("text/plain");
                      if (!data) return;
                      setAnswer((prev) => {
                        const next = [...prev];
                        while (next.length < slots) next.push(undefined);
                        if (data.startsWith("s:")) {
                          // Intercambio entre slots: s:<srcIdx>:<digit>
                          const parts = data.split(":");
                          const srcIdx = parseInt(parts[1], 10);
                          const srcDigit = parts.slice(2).join(":");
                          if (Number.isNaN(srcIdx) || srcIdx === i) return next;
                          const here = next[i];
                          next[i] = srcDigit;
                          next[srcIdx] = here; // queda undefined si el destino estaba vacío
                        } else if (data.startsWith("n:")) {
                          // Desde el numpad: n:<digit>
                          next[i] = data.slice(2);
                        } else {
                          // Compatibilidad: tratar como dígito directo
                          next[i] = data;
                        }
                        return next;
                      });
                    }}
                    onClick={() => { if (filled) eraseAt(i); }}
                    title={filled ? "Toca para borrar · arrastra para mover/intercambiar" : "Arrastra un número aquí"}
                    style={{
                      width: DIGIT_W, height: 62, fontSize: 36,
                      margin: "0 auto",
                      borderColor: feedback === "ok" ? "#2ecc8f" : feedback === "err" ? "#ff6b6b" : undefined,
                      boxShadow: feedback === "ok"
                        ? "0 0 18px rgba(46,204,143,0.65)"
                        : feedback === "err"
                          ? "0 0 18px rgba(255,107,107,0.65)"
                          : undefined,
                      color: "#fff",
                      cursor: filled ? "grab" : "default",
                    }}
                  >
                    {filled ? d : ""}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Fichas arrastrables — fila inferior centrada */}
      <div style={{
        position: "absolute", bottom: 18, left: "50%", transform: "translateX(-50%)",
        display: "grid", gridTemplateColumns: "repeat(10, 48px)", gap: 8,
      }}>
        {["1","2","3","4","5","6","7","8","9","0"].map((d, i) => {
          const color = ["#ef5a5a","#f5a623","#f5d84b","#4fa0ff","#2ecc8f"][i % 5];
          return (
            <button
              key={d}
              className="ed-numpad-key ed-draggable"
              draggable="true"
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", `n:${d}`);
                e.dataTransfer.effectAllowed = "copy";
                e.currentTarget.classList.add("dragging");
              }}
              onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}
              onClick={() => press(d)}
              style={{
                height: 52, fontSize: 22,
                borderColor: color,
                borderWidth: 2, borderStyle: "solid",
                cursor: "grab",
              }}
              title="Arrastra al casillero o toca para colocar"
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Botones de acción — columna derecha, centrados verticalmente. Todos
          al mismo tamaño y en mayúsculas para que la columna se vea uniforme. */}
      <div style={{
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
          BORRAR 🗑
        </button>
        <button
          className="ed-btn ed-btn-ghost"
          onClick={() => setConfirmingSurrender(true)}
          title="Terminar la ronda y ver los resultados parciales"
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          RENDIRSE
        </button>
      </div>

      {/* Feedback overlay — renderizado vía Portal a <body> para que el
          backdrop cubra TODO el viewport (incluidos los laterales fuera del
          lienzo 900×540 del DeviceStage). */}
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

      {/* Modal de confirmación de rendirse — vía portal para cubrir todo el
          viewport, no solo el lienzo del DeviceStage. */}
      {confirmingSurrender && (
        <PortalToBody>
          <div
            onClick={() => setConfirmingSurrender(false)}
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
                Terminar ronda
              </div>
              <h2 className="ed-h1" style={{ fontSize: 22, lineHeight: 1.15, marginBottom: 8 }}>
                ¿Rendirte ahora?
              </h2>
              <p className="ed-body" style={{ marginBottom: 16, fontSize: 14 }}>
                Vas a ver el reporte con los ejercicios que llevas resueltos hasta ahora ({attempted}/3). No podrás retomar esta ronda.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="ed-btn ed-btn-ghost" onClick={() => setConfirmingSurrender(false)} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SEGUIR JUGANDO
                </button>
                <button className="ed-btn ed-btn-primary" onClick={() => { setConfirmingSurrender(false); surrender(); }} style={{ height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
                  SÍ, VER RESULTADOS
                </button>
              </div>
            </div>
          </div>
        </PortalToBody>
      )}

      {/* Modal de confirmación de cambio de nivel desde los tabs — vía portal */}
      {pendingLevel && (() => {
        const labels = { basic: "Básico", medium: "Medio", advanced: "Avanzado" };
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
                  Cambiar dificultad
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
// PANTALLA DE RESULTADOS
// ─────────────────────────────────────────────────────────────
// Formatea una operación de ejercicio sin emojis ni signos UI: "23 + 45".
function formatOp(e) {
  return `${e.a} ${e.op} ${e.b}`;
}

function ResultsScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const res = app.lastResult || { category: "Sumas", solved: 0, total: 3, time: 0, streak: 0, starsEarned: 0, log: [] };
  const m = Math.floor(res.time / 60), s = res.time % 60;
  const totalEx = res.total || 3;
  const attemptedCount = (res.log || []).length;
  // Precisión sobre los ejercicios realmente intentados (si se rindió a mitad,
  // no penaliza con los no intentados como si fueran fallos).
  const accuracy = attemptedCount > 0 ? Math.round((res.solved / attemptedCount) * 100) : 0;
  const dateStr = new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Header pantalla — solo el botón volver. El logo único vive dentro
          del reporte (a la derecha) para evitar que se duplique visualmente. */}
      <div className="ed-print-hide" style={{ position: "absolute", top: 14, left: 24, right: 24, display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
        <button className="ed-btn ed-btn-ghost" onClick={() => go("home")} style={{ padding: "8px 14px", fontWeight: 800, letterSpacing: "0.04em" }}>← VOLVER AL INICIO</button>
      </div>

      {/* Contenido central */}
      <div style={{
        position: "absolute", inset: "70px 32px 20px 32px",
        display: "grid", gridTemplateColumns: "0.85fr 1.4fr", gap: 24, alignItems: "stretch",
      }}>
        {/* Izq: personaje + saludo (fuera del área imprimible) */}
        <div className="ed-print-hide" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
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

        {/* Der: REPORTE ACADÉMICO (área imprimible) */}
        <div className="ed-card ed-print-area" style={{ padding: 16, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Encabezado del reporte: logo + título institucional */}
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

          {/* Datos del estudiante */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
            fontFamily: "var(--ed-font-ui)", fontSize: 12, marginBottom: 10,
          }}>
            <ReportField label="Estudiante" value={app.studentName || "—"} />
            <ReportField label="Categoría" value={res.category} />
            <ReportField label="Tiempo total" value={`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`} />
          </div>

          {/* Tabla de ejercicios */}
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
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>Operación</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Respuesta del estudiante</th>
                  <th style={{ textAlign: "right", padding: "6px 8px" }}>Resultado correcto</th>
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

          {/* Resumen final — precisión como total */}
          <div style={{
            borderTop: "2px solid rgba(242,194,96,0.45)",
            paddingTop: 10,
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
            fontFamily: "var(--ed-font-ui)", fontSize: 11,
          }}>
            <SummaryCell label="Ejercicios" value={`${attemptedCount} / ${totalEx}`} />
            <SummaryCell label="Correctos" value={`${res.solved}`} tone="#2ecc8f" />
            <SummaryCell label="Mejor racha" value={`${res.streak}`} />
            <SummaryCell label="Precisión total" value={`${accuracy}%`} tone="#fce9a8" emphasis />
          </div>

          {/* Acciones (no se imprimen) — uniformes y en mayúsculas */}
          <div className="ed-print-hide" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="ed-btn ed-btn-ghost" onClick={() => window.print()} style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              IMPRIMIR REPORTE
            </button>
            <button className="ed-btn ed-btn-primary" onClick={() => go("game")} style={{ padding: "0 10px", fontSize: 13, height: 44, fontWeight: 800, letterSpacing: "0.04em" }}>
              JUGAR OTRA RONDA
            </button>
          </div>
        </div>
      </div>
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

function Stat({ label, value, tone }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 14,
      background: "rgba(10,6,35,0.55)",
      border: `1px solid ${tone}55`,
    }}>
      <div className="ed-label" style={{ color: tone, fontSize: 10 }}>{label}</div>
      <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 600, fontSize: 24, color: "#fff", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANTALLA DE PERFIL / PROGRESO
// ─────────────────────────────────────────────────────────────
function ProfileScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const sessionMin = Math.max(1, Math.round((Date.now() - (app.sessionStart || Date.now())) / 60000));

  // Historia simulada
  const history = [
    { date: "Hoy 14:22", cat: "Sumas", solved: 5, time: "01:34", stars: 25 },
    { date: "Hoy 14:08", cat: "Restas", solved: 4, time: "02:02", stars: 18 },
    { date: "Ayer 17:45", cat: "Multiplicación", solved: 3, time: "03:21", stars: 12 },
    { date: "Ayer 16:30", cat: "Sumas", solved: 5, time: "01:12", stars: 25 },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>


      {/* Header */}
      <div style={{ position: "absolute", top: 16, left: 24, right: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="ed-btn ed-btn-ghost" onClick={() => go("menu")} style={{ padding: "8px 14px" }}>← Volver</button>
        <EdinunLogoMini size={36} />
        <button className="ed-btn ed-btn-ghost" onClick={() => go("home")} style={{ padding: "8px 14px" }}>Cerrar sesión</button>
      </div>

      {/* Contenido */}
      <div style={{
        position: "absolute", inset: "60px 40px 24px 40px",
        display: "grid", gridTemplateColumns: "0.9fr 1.3fr", gap: 20,
      }}>
        {/* Perfil card */}
        <div className="ed-card" style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <div style={{ position: "relative" }}>
            <char.Component size={160} />
          </div>
          <h2 className="ed-h1" style={{ fontSize: 28 }}>{app.studentName}</h2>
          <div className="ed-label" style={{ color: "#fce9a8", marginTop: 2 }}>Estudiante EDINUN · con {char.name}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Stat label="Estrellas" value={`${app.stars || 48}⭐`} tone="#fce9a8" />
            <Stat label="Sesión" value={`${sessionMin} min`} tone="#4fd8ff" />
          </div>
          <button className="ed-btn ed-btn-primary" onClick={() => go("character")} style={{ marginTop: 14, width: "100%" }}>
            Cambiar personaje
          </button>
        </div>

        {/* Historia */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
          <div className="ed-card" style={{ padding: 16 }}>
            <div className="ed-label" style={{ color: "#4fd8ff", marginBottom: 8 }}>Progreso por categoría</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {CATEGORIES.slice(0, 8).map((c) => (
                <div key={c.id} style={{ opacity: c.locked ? 0.35 : 1 }}>
                  <div style={{ fontSize: 13, fontFamily: "var(--ed-font-display)", fontWeight: 600, marginBottom: 4 }}>
                    <span style={{ color: c.tone, marginRight: 6, fontSize: 16 }}>{c.emoji}</span>
                    {c.name}
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.round(c.prog * 100)}%`, height: "100%", background: c.tone }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ed-card" style={{ padding: 16, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="ed-label" style={{ color: "#4fd8ff", marginBottom: 8 }}>Trazabilidad — últimas sesiones</div>
            <div className="ed-noscroll" style={{ overflow: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: "rgba(246,241,255,0.55)", textAlign: "left" }}>
                    <th style={{ padding: "6px 8px", fontFamily: "var(--ed-font-ui)", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>FECHA</th>
                    <th style={{ padding: "6px 8px", fontFamily: "var(--ed-font-ui)", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>CATEGORÍA</th>
                    <th style={{ padding: "6px 8px", fontFamily: "var(--ed-font-ui)", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>ACIERTOS</th>
                    <th style={{ padding: "6px 8px", fontFamily: "var(--ed-font-ui)", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>TIEMPO</th>
                    <th style={{ padding: "6px 8px", fontFamily: "var(--ed-font-ui)", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>⭐</th>
                  </tr>
                </thead>
                <tbody style={{ fontFamily: "var(--ed-font-mono)" }}>
                  {history.map((h, i) => (
                    <tr key={i} style={{ borderTop: "1px solid rgba(148,120,255,0.15)" }}>
                      <td style={{ padding: "8px 8px", color: "rgba(246,241,255,0.7)" }}>{h.date}</td>
                      <td style={{ padding: "8px 8px", fontFamily: "var(--ed-font-display)", fontWeight: 500 }}>{h.cat}</td>
                      <td style={{ padding: "8px 8px", color: "#2ecc8f" }}>{h.solved}/5</td>
                      <td style={{ padding: "8px 8px", color: "#4fd8ff" }}>{h.time}</td>
                      <td style={{ padding: "8px 8px", color: "#fce9a8" }}>{h.stars}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GameScreen, ResultsScreen });
