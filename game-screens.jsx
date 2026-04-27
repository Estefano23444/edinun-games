// game-screens.jsx — Juego, resultados, perfil.

const { useState: useStateG, useEffect: useEffectG, useRef: useRefG, useMemo: useMemoG } = React;

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
  const [stars, setStars] = useStateG(app.stars || 48);
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

  const aDigits = digits(problem.a);
  const bDigits = digits(problem.b);
  const maxLen = Math.max(aDigits.length, bDigits.length);
  const padA = Array(maxLen - aDigits.length).fill(" ").concat(aDigits);
  const padB = Array(maxLen - bDigits.length).fill(" ").concat(bDigits);

  const levelOfCat = CATEGORIES.find((c) => c.id === cat)?.level || "basic";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>


      {/* Top HUD */}
      <div style={{ position: "absolute", top: 10, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        {/* Izq: logo limpio (sin wrapper). El cambio de nivel se hace
            tocando los tabs Básico/Medio/Avanzado de abajo, con modal de
            confirmación. */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <EdinunLogoMini size={56} />
        </div>

        {/* Centro: barra de niveles — clickeable. Tocar un nivel distinto al
            actual abre un modal de confirmación; aceptar reinicia la ronda
            con la dificultad nueva. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, maxWidth: 440, justifyContent: "center" }}>
          {[
            { id: "basic", label: "Básico", c: "#f5a623" },
            { id: "medium", label: "Medio", c: "#f5d84b" },
            { id: "advanced", label: "Avanzado", c: "#4fa0ff" },
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
          numpad. Cuando hay feedback de error, muestra un bocadillo con frase
          motivadora (`feedbackMsg`). */}
      <div style={{
        position: "absolute", left: 8, bottom: 90, width: 220,
        pointerEvents: "none", textAlign: "center",
      }}>
        {/* Bocadillo motivador (visible solo en feedback de error con texto) */}
        {feedback === "err" && feedbackMsg && (
          <div style={{
            position: "absolute", left: 160, bottom: 150,
            background: "rgba(255,255,255,0.96)",
            color: "#1a3a2d",
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 13,
            padding: "8px 14px", borderRadius: 16,
            maxWidth: 220, lineHeight: 1.25,
            boxShadow: "0 8px 22px rgba(0,0,0,0.35), 0 0 0 2px rgba(242,194,96,0.55)",
            animation: "ed-pop-in 0.25s",
          }}>
            <div style={{
              position: "absolute", left: -8, bottom: 14,
              width: 0, height: 0,
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderRight: "10px solid rgba(255,255,255,0.96)",
            }} />
            {feedbackMsg}
          </div>
        )}
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

      {/* Botones de acción — columna derecha, centrados verticalmente */}
      <div style={{
        position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 12, width: 140,
      }}>
        <button
          className="ed-btn ed-btn-verify"
          onClick={verify}
          style={{ fontSize: 16, padding: "14px 10px", height: 66, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          ¡VERIFICAR!
        </button>
        <button
          className="ed-btn ed-btn-erase"
          onClick={erase}
          style={{ fontSize: 15, padding: "12px 10px", height: 52, fontWeight: 700 }}
        >
          Borrar 🗑
        </button>
      </div>

      {/* Feedback overlay — al acertar muestra estrellas; al fallar deja al
          personaje hablar (bocadillo abajo a la izquierda). */}
      {feedback && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 8,
          animation: "ed-pop-in 0.3s",
        }}>
          <div style={{
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 72,
            color: feedback === "ok" ? "#2ecc8f" : "#ff6b6b",
            textShadow: "0 4px 0 rgba(0,0,0,0.35), 0 0 40px currentColor",
          }}>
            {feedback === "ok" ? "¡EXCELENTE!" : "¡UPS!"}
          </div>
          {feedback === "ok" && feedbackMsg && (
            <div style={{
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 28,
              color: "#fce9a8",
              background: "rgba(0,0,0,0.5)",
              padding: "6px 22px", borderRadius: 999,
              textShadow: "0 2px 6px rgba(0,0,0,0.6)",
            }}>
              {feedbackMsg}
            </div>
          )}
        </div>
      )}

      {/* Modal de confirmación de cambio de nivel desde los tabs */}
      {pendingLevel && (() => {
        const labels = { basic: "Básico", medium: "Medio", advanced: "Avanzado" };
        const colors = { basic: "#f5a623", medium: "#f5d84b", advanced: "#4fa0ff" };
        return (
          <div
            onClick={() => setPendingLevel(null)}
            style={{
              position: "absolute", inset: 0, zIndex: 50,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "ed-pop-in 0.18s",
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
                  style={{ height: 44 }}
                >
                  Cancelar
                </button>
                <button
                  className="ed-btn ed-btn-primary"
                  onClick={() => { applyLevelChange(pendingLevel); setPendingLevel(null); }}
                  style={{ height: 44 }}
                >
                  Sí, cambiar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PANTALLA DE RESULTADOS
// ─────────────────────────────────────────────────────────────
function ResultsScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const res = app.lastResult || { category: "Sumas", solved: 0, total: 3, time: 0, streak: 0, starsEarned: 0 };
  const m = Math.floor(res.time / 60), s = res.time % 60;
  const totalEx = res.total || 3;
  const accuracy = totalEx > 0 ? Math.round((res.solved / totalEx) * 100) : 0;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>


      {/* Confetti simulado */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Array.from({ length: 24 }).map((_, i) => {
          const colors = ["#fce9a8", "#4fd8ff", "#ff5fb3", "#7bf5c4", "#f5a623"];
          return (
            <div key={i} style={{
              position: "absolute",
              left: `${(i * 37) % 100}%`,
              top: `-20px`,
              width: 8, height: 12,
              background: colors[i % 5],
              borderRadius: 2,
              animation: `ed-confetti ${3 + (i % 3)}s linear ${i * 0.2}s infinite`,
            }} />
          );
        })}
      </div>
      <style>{`
        @keyframes ed-confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0.4; }
        }
      `}</style>

      {/* Header — logo grande centrado-derecha */}
      <div style={{ position: "absolute", top: 14, left: 24, right: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button className="ed-btn ed-btn-ghost" onClick={() => go("home")} style={{ padding: "8px 14px" }}>← Volver</button>
        <EdinunLogoMini size={64} />
      </div>

      {/* Contenido central */}
      <div style={{
        position: "absolute", inset: "60px 40px 20px 40px",
        display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 32, alignItems: "center",
      }}>
        {/* Izq: personaje celebrando */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
          <div style={{
            position: "absolute", top: -10,
            fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 52,
            background: "linear-gradient(180deg, #fce9a8, #d9a441)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            textShadow: "0 0 20px rgba(242,194,96,0.4)",
          }}>
            ¡VICTORIA!
          </div>
          <div style={{ marginTop: 50 }}>
            <char.Component size={220} />
          </div>
          <div style={{ marginTop: 8, textAlign: "center" }}>
            <div className="ed-body" style={{ fontStyle: "italic", maxWidth: 280 }}>
              "¡{app.studentName}, superaste la ronda con {res.streak} respuestas seguidas!" — {char.name}
            </div>
          </div>
        </div>

        {/* Der: tarjeta de resultados */}
        <div className="ed-card ed-card-glow ed-print-area" style={{ padding: 18 }}>
          {/* Encabezado imprimible (solo visible en papel) */}
          <div className="ed-print-only" style={{ borderBottom: "2px solid #111", paddingBottom: 10, marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 800, fontSize: 22, letterSpacing: 2 }}>EDINUN</div>
              <div style={{ fontFamily: "var(--ed-font-mono)", fontSize: 12 }}>{new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" })}</div>
            </div>
            <div style={{ fontFamily: "var(--ed-font-mono)", fontSize: 11, marginTop: 4, letterSpacing: 1 }}>REPORTE DE SESIÓN · MATEMÁTICAS</div>
          </div>
          <div className="ed-label" style={{ color: "#4fd8ff", marginBottom: 2, fontSize: 10 }}>
            Reporte de la sesión · {res.category}
          </div>
          <h2 className="ed-h1" style={{ fontSize: 22, marginBottom: 12, lineHeight: 1.1 }}>
            Resultados de <span style={{ color: "#fce9a8" }}>{app.studentName}</span>
          </h2>

          {/* Stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <Stat label="Respuestas correctas" value={`${res.solved}/${res.total || 3}`} tone="#2ecc8f" />
            <Stat label="Tiempo total" value={`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`} tone="#4fd8ff" />
            <Stat label="Precisión" value={`${accuracy}%`} tone="#fce9a8" />
            <Stat label="Mejor racha" value={`${res.streak}🔥`} tone="#ff5fb3" />
          </div>

          {/* Estrellas ganadas */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 12px", borderRadius: 12,
            background: "linear-gradient(90deg, rgba(242,194,96,0.15), rgba(242,194,96,0.05))",
            border: "1px solid rgba(242,194,96,0.4)",
            marginBottom: 10,
          }}>
            <div>
              <div className="ed-label" style={{ color: "#fce9a8", fontSize: 10 }}>Estrellas ganadas</div>
              <div style={{ fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 22, color: "#fce9a8", lineHeight: 1 }}>
                +{res.starsEarned} ⭐
              </div>
            </div>
            <div style={{ fontSize: 34 }}>🏆</div>
          </div>

          {/* Acciones */}
          <div className="ed-print-hide" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button className="ed-btn ed-btn-ghost" onClick={() => window.print()} style={{ padding: "10px 8px", fontSize: 13, height: 42 }}>
              🖨 Imprimir reporte
            </button>
            <button className="ed-btn ed-btn-primary" onClick={() => go("game")} style={{ padding: "10px 8px", fontSize: 13, height: 42 }}>
              Reiniciar juego ↻
            </button>
          </div>
        </div>
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
