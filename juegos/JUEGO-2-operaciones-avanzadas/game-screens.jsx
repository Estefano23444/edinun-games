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
// Generador de problemas por categoría — 4 modos:
//   vert3    → Sumas/restas verticales de 3 cifras (modo "vert")
//   horiz3   → Sumas/restas horizontales de 3 cifras (modo "horiz")
//   decimals → +, −, ×, ÷ con decimales, hasta 3 decimales (modo "decimals")
//   ints     → Suma/resta de enteros con signo (modo "ints", resultado puede ser negativo)
// El objeto problem siempre lleva `mode` para que GameScreen sepa qué layout
// y qué bandeja renderizar y cómo validar la respuesta.
// ─────────────────────────────────────────────────────────────
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// Cuenta los decimales significativos de un número (para detectar la
// cantidad de slots decimales que necesita la respuesta sin arrastrar
// errores de coma flotante).
function countDecimals(n, max = 3) {
  const s = (Math.round(n * 1e6) / 1e6).toString();
  if (s.indexOf(".") === -1) return 0;
  return Math.min(max, s.split(".")[1].length);
}

function makeProblem(cat) {
  switch (cat) {
    case "vert3":
    case "horiz3": {
      // Resultado siempre ≤ 999 (3 cifras): si la suma se va por encima
      // saldrían 4 columnas y se rompería el grid C/D/U. Para suma,
      // limitamos b a 999 - a; para resta a ≥ b ≥ 100.
      const op = Math.random() < 0.5 ? "+" : "−";
      let a = rand(100, 899);
      let b;
      if (op === "+") {
        b = rand(100, 999 - a);
      } else {
        b = rand(100, a);
      }
      const answer = op === "+" ? a + b : a - b;
      return { mode: cat === "vert3" ? "vert" : "horiz", a, b, op, answer };
    }
    case "decimals": {
      const opPick = ["+", "−", "×", "÷"][rand(0, 3)];
      let a, b, answer;
      if (opPick === "+" || opPick === "−") {
        // Operandos con 1 decimal cada uno, resultado con 1 decimal.
        a = rand(11, 99) / 10;
        b = rand(11, 99) / 10;
        if (opPick === "−" && b > a) [a, b] = [b, a];
        answer = opPick === "+" ? a + b : a - b;
      } else if (opPick === "×") {
        // a con 1 decimal, b con 1 decimal → resultado con hasta 2 decimales.
        a = rand(11, 99) / 10;
        b = rand(11, 99) / 10;
        answer = a * b;
      } else { // ÷
        // Resultado con 1 o 2 decimales para mantenerlo manejable.
        // Generamos a partir del resultado para evitar divisiones infinitas.
        const ansDecPlaces = rand(1, 2);
        const ansScaled = rand(11, ansDecPlaces === 1 ? 99 : 999);
        const ans = ansScaled / Math.pow(10, ansDecPlaces);
        b = rand(2, 9);
        a = ans * b;
        answer = ans;
      }
      // Redondear a 3 decimales para evitar errores de coma flotante.
      answer = Math.round(answer * 1000) / 1000;
      a = Math.round(a * 1000) / 1000;
      b = Math.round(b * 1000) / 1000;
      return { mode: "decimals", a, b, op: opPick, answer };
    }
    case "ints": {
      const op = Math.random() < 0.5 ? "+" : "−";
      // Excluir 0 para que siempre haya signo visible y resultado no trivial.
      const pickNonZero = (lo, hi) => {
        let v = 0;
        while (v === 0) v = rand(lo, hi);
        return v;
      };
      const a = pickNonZero(-20, 20);
      const b = pickNonZero(-20, 20);
      const answer = op === "+" ? a + b : a - b;
      return { mode: "ints", a, b, op, answer };
    }
    default: {
      // Fallback seguro: vert3 estándar.
      let a = rand(100, 999), b = rand(100, 999);
      if (b > a) [a, b] = [b, a];
      return { mode: "vert", a, b, op: "+", answer: a + b };
    }
  }
}

function digits(n) {
  // Para el conteo de slots de la respuesta usamos siempre el valor absoluto:
  // el signo va en un slot aparte cuando aplica (modo ints).
  return String(Math.abs(n)).split("");
}

// Formatea un número para mostrar (en el cartel del enunciado y en el
// reporte): coma decimal (locale es), paréntesis para negativos.
function fmtNum(n, withParensIfNeg = false) {
  if (n === undefined || n === null) return "";
  const isNeg = n < 0;
  const abs = Math.abs(n);
  // Usar toLocaleString para coma decimal pero sin separador de miles.
  const s = (Math.round(abs * 1000) / 1000).toString().replace(".", ",");
  if (!isNeg) return s;
  return withParensIfNeg ? `(−${s})` : `−${s}`;
}

// Para la operación impresa en el reporte académico ("23 + 45", "(−3) + 5",
// "2,5 × 1,2"): formato consistente con lo que ve el estudiante.
function formatOpCell(e, mode) {
  if (mode === "ints") {
    return `${fmtNum(e.a, true)} ${e.op} ${fmtNum(e.b, true)}`;
  }
  if (mode === "decimals") {
    return `${fmtNum(e.a)} ${e.op} ${fmtNum(e.b)}`;
  }
  return `${e.a} ${e.op} ${e.b}`;
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

// ─────────────────────────────────────────────────────────────
// AnswerSlot — slot interactivo (drag-and-drop + tap para borrar +
// drop desde el numpad o desde otro slot). Reutilizado por los 4
// modos del cartel central.
// ─────────────────────────────────────────────────────────────
function AnswerSlot({ idx, value, isActive, slots, feedback, setAnswer, eraseAt, width = 56, height = 64, fontSize = 36 }) {
  const filled = value !== undefined && value !== "";
  return (
    <div
      className={`ed-answer-slot ${isActive ? "active" : ""} ${filled ? "filled" : ""}`}
      draggable={filled}
      onDragStart={(e) => {
        if (!filled) return;
        e.dataTransfer.setData("text/plain", `s:${idx}:${value}`);
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
            const parts = data.split(":");
            const srcIdx = parseInt(parts[1], 10);
            const srcVal = parts.slice(2).join(":");
            if (Number.isNaN(srcIdx) || srcIdx === idx) return next;
            const here = next[idx];
            next[idx] = srcVal;
            next[srcIdx] = here;
          } else if (data.startsWith("n:")) {
            next[idx] = data.slice(2);
          } else {
            next[idx] = data;
          }
          return next;
        });
      }}
      onClick={() => { if (filled) eraseAt(idx); }}
      title={filled ? "Toca para borrar · arrastra para mover" : "Arrastra un número aquí"}
      style={{
        width, height, fontSize,
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
      {filled ? value : ""}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EquationCanvas — renderiza el cartel central según problem.mode.
// Encapsula los 4 layouts (vert / horiz / decimals / ints) y delega
// los slots interactivos al componente AnswerSlot.
// ─────────────────────────────────────────────────────────────
function EquationCanvas({ problem, answer, slots, slotsSpec, firstDigitIdx, feedback, setAnswer, eraseAt }) {
  // Calcula el índice del slot "activo" (el siguiente que se va a llenar).
  //  - Si hay signSlot y el signo está vacío → el slot activo es el del signo
  //    (refuerza el orden pedagógico: signo primero, después dígitos).
  //  - Si no, el primero vacío de derecha a izquierda entre los dígitos
  //    (unidades → decenas → centenas).
  let activeIdx = -1;
  if (slotsSpec.signSlot && (answer[0] === undefined || answer[0] === "")) {
    activeIdx = 0;
  } else {
    for (let k = slots - 1; k >= firstDigitIdx; k--) {
      if (answer[k] === undefined || answer[k] === "") { activeIdx = k; break; }
    }
  }

  // El cartel central se posiciona distinto según el modo:
  //   vert     → banda vertical entre el enunciado (top:100) y la bandeja
  //              (numpad en bottom:14, ~90px de alto). Anclamos top + bottom y
  //              centramos el contenido con flexbox. Antes era `top:150` con
  //              flujo libre, que dejaba una banda vacía bajo los slots y el
  //              enunciado pegado; ahora el contenido se reparte y queda
  //              equilibrado sin chocar el numpad (~92 de guarda inferior).
  //   horiz, decimals, ints → centrado vertical en la zona disponible
  //              (translate(-50%, -50%)) porque son layouts cortos en una
  //              sola línea y si no se centran quedan pegados al tope.
  const wrapperBase = problem.mode === "vert"
    ? { position: "absolute", top: 142, bottom: 92, left: "50%", transform: "translateX(-50%)", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }
    : { position: "absolute", top: 290, left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" };
  const numberStyle = {
    fontFamily: "var(--ed-font-display)", fontWeight: 700,
    fontSize: 48, color: "#fff", lineHeight: 1,
  };

  // ───────── Modo VERT (CDU vertical, 3 cifras) ─────────
  if (problem.mode === "vert") {
    const aDigits = digits(problem.a);
    const bDigits = digits(problem.b);
    const maxLen = Math.max(aDigits.length, bDigits.length);
    const columns = Math.max(maxLen, slots);
    const DIGIT_W = 60, GAP = 10, OP_W = 44;
    const TOTAL_W = OP_W + columns * DIGIT_W + columns * GAP;
    // Labels alineados desde la derecha (la unidad siempre va a la derecha).
    // Usamos UM como defensa por si alguna vez se generan 4 cifras pese al
    // límite del makeProblem; con esto el grid no se rompe (no más "U" sola).
    const allLabels = ["UM", "C", "D", "U"];
    const labels = allLabels.slice(Math.max(0, allLabels.length - columns));
    const padA = Array(maxLen - aDigits.length).fill(" ").concat(aDigits);
    const padB = Array(maxLen - bDigits.length).fill(" ").concat(bDigits);
    const fullA = Array(columns - padA.length).fill(" ").concat(padA);
    const fullB = Array(columns - padB.length).fill(" ").concat(padB);
    return (
      <div data-qa="zona-central" style={{ ...wrapperBase, width: Math.max(TOTAL_W, 480) }}>

        <div style={{
          display: "grid", gridTemplateColumns: `${OP_W}px repeat(${columns}, ${DIGIT_W}px)`,
          gap: GAP, justifyContent: "center", alignItems: "center", marginBottom: 6,
        }}>
          <span />
          {labels.map((lb) => (
            <div key={lb} className={`ed-dice ed-dice-${lb.toLowerCase()}`} style={{ width: 30, height: 30, fontSize: 14, margin: "0 auto" }}>{lb}</div>
          ))}
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: `${OP_W}px repeat(${columns}, ${DIGIT_W}px)`,
          gap: GAP, justifyContent: "center", alignItems: "center",
          ...numberStyle,
        }}>
          <span />
          {fullA.map((d, i) => <span key={`a${i}`}>{d}</span>)}
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: `${OP_W}px repeat(${columns}, ${DIGIT_W}px)`,
          gap: GAP, justifyContent: "center", alignItems: "center",
          ...numberStyle, marginTop: 2,
        }}>
          <span style={{ textAlign: "center" }}>{problem.op}</span>
          {fullB.map((d, i) => <span key={`b${i}`}>{d}</span>)}
        </div>

        <div style={{
          height: 4, background: "#fff", borderRadius: 2,
          margin: "8px auto 10px", width: TOTAL_W - 12,
          boxShadow: "0 0 10px rgba(255,255,255,0.35)",
        }} />

        <div style={{
          display: "grid", gridTemplateColumns: `${OP_W}px repeat(${columns}, ${DIGIT_W}px)`,
          gap: GAP, justifyContent: "center", alignItems: "center",
        }}>
          <span />
          {Array.from({ length: columns - slots }).map((_, k) => <span key={`pad${k}`} />)}
          {Array.from({ length: slots }).map((_, i) => (
            <AnswerSlot
              key={i} idx={i} value={answer[i]} isActive={i === activeIdx}
              slots={slots} feedback={feedback}
              setAnswer={setAnswer} eraseAt={eraseAt}
              width={DIGIT_W} height={64} fontSize={36}
            />
          ))}
        </div>
      </div>
    );
  }

  // ───────── Modo HORIZ (a OP b = slots, en una línea) ─────────
  if (problem.mode === "horiz") {
    return (
      <div data-qa="zona-central" style={{ ...wrapperBase, width: 580 }}>
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center", gap: 12,
          ...numberStyle,
        }}>
          <span>{problem.a}</span>
          <span style={{ color: "#fce9a8" }}>{problem.op}</span>
          <span>{problem.b}</span>
          <span style={{ color: "#fce9a8" }}>=</span>
          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: slots }).map((_, i) => (
              <AnswerSlot
                key={i} idx={i} value={answer[i]} isActive={i === activeIdx}
                slots={slots} feedback={feedback}
                setAnswer={setAnswer} eraseAt={eraseAt}
                width={56} height={70} fontSize={38}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ───────── Modo DECIMALS (a,d OP b,d = slots,slots) ─────────
  if (problem.mode === "decimals") {
    return (
      <div data-qa="zona-central" style={{ ...wrapperBase, width: 640 }}>
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center", gap: 10,
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 42, color: "#fff", lineHeight: 1,
        }}>
          <span>{fmtNum(problem.a)}</span>
          <span style={{ color: "#fce9a8" }}>{problem.op}</span>
          <span>{fmtNum(problem.b)}</span>
          <span style={{ color: "#fce9a8" }}>=</span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {Array.from({ length: slots }).map((_, i) => (
              <React.Fragment key={i}>
                <AnswerSlot
                  idx={i} value={answer[i]} isActive={i === activeIdx}
                  slots={slots} feedback={feedback}
                  setAnswer={setAnswer} eraseAt={eraseAt}
                  width={50} height={64} fontSize={32}
                />
                {/* Coma fija visual entre el último dígito entero y los decimales */}
                {i === slotsSpec.decimalAt && (
                  <span style={{ fontSize: 42, color: "#fce9a8", fontWeight: 800, lineHeight: 0.8, transform: "translateY(8px)" }}>,</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ───────── Modo INTS (a OP b = signo + slots) ─────────
  if (problem.mode === "ints") {
    return (
      <div data-qa="zona-central" style={{ ...wrapperBase, width: 600 }}>
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center", gap: 12,
          fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 44, color: "#fff", lineHeight: 1,
        }}>
          <span style={{ color: problem.a < 0 ? "#ff8b8b" : "#fff" }}>{fmtNum(problem.a, true)}</span>
          <span style={{ color: "#fce9a8" }}>{problem.op}</span>
          <span style={{ color: problem.b < 0 ? "#ff8b8b" : "#fff" }}>{fmtNum(problem.b, true)}</span>
          <span style={{ color: "#fce9a8" }}>=</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Slot de signo (índice 0) */}
            <AnswerSlot
              idx={0} value={answer[0]} isActive={0 === activeIdx}
              slots={slots} feedback={feedback}
              setAnswer={setAnswer} eraseAt={eraseAt}
              width={48} height={68} fontSize={32}
            />
            {/* Slots de dígitos */}
            {Array.from({ length: slotsSpec.digitCount }).map((_, k) => {
              const i = k + 1;
              return (
                <AnswerSlot
                  key={i} idx={i} value={answer[i]} isActive={i === activeIdx}
                  slots={slots} feedback={feedback}
                  setAnswer={setAnswer} eraseAt={eraseAt}
                  width={56} height={68} fontSize={36}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

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
  const [solved, setSolved] = useStateG(0);       // aciertos en la sesión
  const [attempted, setAttempted] = useStateG(0); // ejercicios intentados (correctos o no)
  const [starsSession, setStarsSession] = useStateG(0); // estrellas ganadas en la sesión actual
  const [feedback, setFeedback] = useStateG(null); // 'ok' | 'err' | null
  const [feedbackMsg, setFeedbackMsg] = useStateG("");
  const [hintOn, setHintOn] = useStateG(false);
  // Cambio de nivel desde los tabs del HUD: guarda el nivel propuesto
  // mientras se muestra el modal de confirmación. null = sin modal.
  const [pendingLevel, setPendingLevel] = useStateG(null);
  // Modal de confirmación para salir del juego (navega a home y descarta
  // el progreso de la ronda actual). Antes era "rendirse" → resultados
  // parciales; el flujo se simplificó a salir directo al inicio.
  const [confirmingExit, setConfirmingExit] = useStateG(false);
  // Log de ejercicios de la ronda — alimenta el reporte académico de
  // ResultsScreen. Cada entrada: {idx, a, b, op, correctAnswer, userAnswer,
  // isCorrect, time, earned}.
  const [log, setLog] = useStateG([]);

  // Especificación de slots según el modo del problema.
  //   digitCount: cantidad de slots de dígitos.
  //   signSlot:   true si hay un slot de signo (modo ints).
  //   decimalAt:  índice (en el array de dígitos, 0-based) del último dígito
  //               de la parte entera. La coma se renderiza entre digitos[decimalAt]
  //               y digitos[decimalAt+1]. -1 si no hay coma.
  //   total:      digitCount + (signSlot ? 1 : 0). El array `answer` siempre
  //               tiene `total` posiciones; si hay signo, answer[0] es el signo.
  const slotsSpec = useMemoG(() => {
    const ansAbs = Math.abs(problem.answer);
    if (problem.mode === "decimals") {
      const decs = countDecimals(problem.answer, 3);
      const intDigits = String(Math.floor(ansAbs)).length || 1;
      return {
        digitCount: intDigits + decs,
        signSlot: false,
        decimalAt: decs > 0 ? intDigits - 1 : -1,
        total: intDigits + decs,
      };
    }
    if (problem.mode === "ints") {
      const dc = String(Math.abs(problem.answer) || 0).length;
      return { digitCount: dc, signSlot: true, decimalAt: -1, total: dc + 1 };
    }
    const dc = String(Math.abs(problem.answer) || 0).length;
    return { digitCount: dc, signSlot: false, decimalAt: -1, total: dc };
  }, [problem.mode, problem.answer]);

  const slots = slotsSpec.total;
  const firstDigitIdx = slotsSpec.signSlot ? 1 : 0;
  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  // Cronómetro total
  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  // press(d) — d puede ser un dígito ("0".."9") o un signo ("+" o "−").
  // Reglas:
  //  - Si d es un signo, solo aplica si hay signSlot. Va siempre al slot 0.
  //  - Si d es un dígito y el modo es `ints`, está prohibido colocar dígito
  //    antes del signo: el flujo pedagógico exige decidir primero el signo
  //    del resultado y recién después la magnitud.
  //  - Si d es un dígito, busca el primer slot de dígito vacío de derecha
  //    a izquierda (unidades primero) y lo llena. En modo decimals esto
  //    también respeta los slots decimales (los más a la derecha).
  function press(d) {
    const isSign = d === "+" || d === "−";
    setAnswer((prev) => {
      const next = [...prev];
      while (next.length < slots) next.push(undefined);
      if (isSign) {
        if (slotsSpec.signSlot) next[0] = d;
        return next;
      }
      // Modo ints: bloquea dígitos hasta que el signo esté colocado.
      if (slotsSpec.signSlot && (next[0] === undefined || next[0] === "")) {
        return prev;
      }
      // Llenar de derecha a izquierda solo los slots de dígitos.
      for (let i = slots - 1; i >= firstDigitIdx; i--) {
        if (next[i] === undefined) { next[i] = d; return next; }
      }
      return prev;
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
    // Borra el último valor colocado (el más a la izquierda entre los llenos).
    // Incluye el slot de signo si existe — el orden visual coincide con el
    // orden de inserción (signo primero, dígitos de derecha a izquierda).
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
      // Faltan slots: feedback de error suave (no consume intento)
      setFeedback("err");
      setFeedbackMsg("Completa todos los casilleros");
      setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
      return;
    }
    // Cuenta una visita real solo cuando el jugador completa el primer
    // intento de la sesión. Idempotente por sessionStorage.
    if (typeof window.markFirstAttempt === "function") window.markFirstAttempt();

    // Reconstruir el número ingresado según el modo.
    let entered;
    const digitsArr = filled.slice(firstDigitIdx); // solo dígitos
    if (problem.mode === "decimals" && slotsSpec.decimalAt >= 0) {
      const intPart = digitsArr.slice(0, slotsSpec.decimalAt + 1).join("");
      const decPart = digitsArr.slice(slotsSpec.decimalAt + 1).join("");
      entered = parseFloat(`${intPart}.${decPart}`);
    } else {
      entered = parseInt(digitsArr.join(""), 10);
      if (slotsSpec.signSlot && filled[0] === "−") entered = -entered;
    }
    // Comparación con tolerancia para flotantes.
    const isCorrect = problem.mode === "decimals"
      ? Math.abs(entered - problem.answer) < 0.005
      : entered === problem.answer;
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    // Estrellas por ejercicio: máximo 10, decrece con el tiempo. <3s → 10, +3s cada vez.
    const earned = isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;

    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsSession = starsSession + earned;
    const newStarsTotal = stars + earned;

    const entry = {
      idx: newAttempted,
      mode: problem.mode,
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
    setStars(newStarsTotal);
    setStarsSession(newStarsSession);
    setLog(newLog);

    const wait = isCorrect ? 950 : 2600;
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
    const map = {
      basic:    { catId: "vert3",    catLabel: "Vertical · 3 cifras" },
      medium:   { catId: "horiz3",   catLabel: "Horizontal · 3 cifras" },
      advanced: { catId: "decimals", catLabel: "Decimales combinados" },
      expert:   { catId: "ints",     catLabel: "Enteros con signo" },
    };
    const { catId, catLabel } = map[newLevel] || map.basic;
    setApp((s) => ({ ...s, level: newLevel, currentCategory: catId, currentCatLabel: catLabel }));
    setProblem(makeProblem(catId));
    setAnswer([]);
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

  // Tab activo = nivel actual de la sesión. EquationCanvas se encarga de
  // calcular sus propios dígitos/columnas según el modo del problema.
  const levelOfCat = app.level || "basic";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>


      {/* Top HUD — el centro (tabs de nivel) está absolutamente centrado en la
          pantalla, no entre las dos columnas, para que no se desplace cuando el
          logo es más ancho que el timer/stars de la derecha. */}
      <div data-qa="hud" style={{ position: "absolute", top: 10, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
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
            { id: "basic", label: "VERTICALES", c: "#f5a623" },
            { id: "medium", label: "HORIZONTALES", c: "#f5d84b" },
            { id: "advanced", label: "CON DECIMALES", c: "#4fa0ff" },
            { id: "expert", label: "CON ENTEROS", c: "#b48aff" },
          ].map((lv) => {
            const active = lv.id === levelOfCat;
            return (
              <button
                key={lv.id}
                onClick={() => { if (!active) setPendingLevel(lv.id); }}
                disabled={active}
                style={{
                  padding: "5px 10px", borderRadius: 999,
                  background: active ? lv.c : "rgba(255,255,255,0.15)",
                  color: active ? "#0b3a2d" : "rgba(255,255,255,0.85)",
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11,
                  border: active ? `2px solid ${lv.c}` : "2px solid transparent",
                  boxShadow: active ? `0 0 14px ${lv.c}88` : "none",
                  cursor: active ? "default" : "pointer",
                  transition: "background 0.15s ease, transform 0.1s ease",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
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

      {/* Personaje + bocadillo agrupados: el bocadillo se ancla sobre la
          cabeza del personaje y ambos flotan juntos (la animación
          ed-float-soft va en el grupo, no solo en el personaje). La pista
          cambia según el modo del problema. */}
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
                fontWeight: 700, fontSize: 16, lineHeight: 1.25,
                color: "#fce9a8", textAlign: "center",
                boxShadow: "0 8px 22px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}>
                {{
                  vert: "Toca un dígito — empieza por las unidades.",
                  horiz: "Toca un dígito y completa.",
                  decimals: "Toca un dígito — cuidado con la coma.",
                  ints: "Toca primero el signo, después el número.",
                }[problem.mode] || "Toca un dígito y completa."}
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

      {/* Racha / progreso — separado del HUD para que no se pegue a los tabs de nivel */}
      <div style={{
        position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)",
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

      {/* Instrucción del ejercicio — un solo elemento absoluto, fuera del
          cartel central, para que aparezca siempre en la misma altura
          independientemente del modo y no se solape con la fila CDU del
          modo vertical (bug que mostraba la "U" tapando "Resuelvelo"). */}
      <div style={{
        position: "absolute", top: 100, left: "50%", transform: "translateX(-50%)",
        fontFamily: "var(--ed-font-display)", fontWeight: 700,
        fontSize: 22, lineHeight: 1.15,
        color: "#fff",
        textShadow: "0 2px 6px rgba(0,0,0,0.45)",
        whiteSpace: "nowrap",
      }}>
        🧮 ¡Resuelve la operación!
      </div>

      {/* ══════ ECUACIÓN PROTAGONISTA ══════
          Renderiza el cartel central según el modo del problema:
            vert     → cuenta vertical CDU (3 cifras apiladas, línea, slots).
            horiz    → ecuación en una línea: a OP b = [slots].
            decimals → ecuación horizontal con coma decimal visual entre slots.
            ints     → ecuación horizontal con paréntesis para negativos y
                       slot de signo a la izquierda de los dígitos.
          Los slots son el componente común — clickeables (borrar) y soltables
          (drop) en los 4 modos. */}
      <EquationCanvas
        problem={problem}
        answer={answer}
        slots={slots}
        slotsSpec={slotsSpec}
        firstDigitIdx={firstDigitIdx}
        feedback={feedback}
        setAnswer={setAnswer}
        eraseAt={eraseAt}
      />

      {/* Fichas arrastrables — fila inferior centrada. Las fichas dependen
          del modo: dígitos 0-9 en todos, más + y − cuando el modo es `ints`
          (signo del resultado). En modo decimals la coma NO es ficha — es
          visual fija entre los slots de parte entera y decimal. */}
      {(() => {
        const isInts = problem.mode === "ints";
        const tokens = isInts
          ? ["1","2","3","4","5","6","7","8","9","0","+","−"]
          : ["1","2","3","4","5","6","7","8","9","0"];
        const cols = tokens.length;
        const colors = ["#ef5a5a","#f5a623","#f5d84b","#4fa0ff","#2ecc8f"];
        return (
          <div data-qa="bandeja" style={{
            position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
            display: "grid", gridTemplateColumns: `repeat(${cols}, 56px)`, gap: 7,
          }}>
            {tokens.map((d, i) => {
              const isSign = d === "+" || d === "−";
              const color = isSign ? "#b48aff" : colors[i % colors.length];
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
                    height: 60, fontSize: isSign ? 28 : 28,
                    borderColor: color,
                    borderWidth: 2, borderStyle: "solid",
                    cursor: "grab",
                    color: isSign ? "#b48aff" : undefined,
                    fontWeight: isSign ? 800 : undefined,
                  }}
                  title="Arrastra al casillero o toca para colocar"
                >
                  {d}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Botones de acción — columna derecha, centrados verticalmente. Todos
          al mismo tamaño y en mayúsculas para que la columna se vea uniforme. */}
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

      {/* Modal de confirmación de SALIR — vía portal para cubrir todo el
          viewport. Confirmar lleva directo a home descartando el progreso
          de la ronda actual (no genera reporte). */}
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

      {/* Modal de confirmación de cambio de nivel desde los tabs — vía portal */}
      {pendingLevel && (() => {
        const labels = { basic: "Verticales", medium: "Horizontales", advanced: "Con decimales", expert: "Con enteros" };
        const colors = { basic: "#f5a623", medium: "#f5d84b", advanced: "#4fa0ff", expert: "#b48aff" };
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
  // Formato consistente con lo que ve el estudiante en pantalla:
  //   - decimals: "2,5 + 1,7" (coma decimal locale ES).
  //   - ints:     "(−3) + 5"  (paréntesis para negativos, signo unicode).
  //   - vert/horiz/sin mode (legacy): "245 + 138".
  return formatOpCell(e, e.mode || "horiz");
}
// Formato del valor de respuesta para el reporte académico.
function fmtAnswer(v, mode) {
  if (v === undefined || v === null || (typeof v === "number" && Number.isNaN(v))) return "—";
  if (mode === "ints") return fmtNum(v, false);
  if (mode === "decimals") return fmtNum(v);
  return String(v);
}

// PrintableReport — versión imprimible del reporte académico, montada como
// hermana de #root en <body> via Portal. En pantalla queda oculta
// (`.ed-print-doc { display: none }` en CSS). En @media print se muestra y
// #root se oculta. Esto evita los PDFs en blanco que se daban en iOS al
// usar position:fixed dentro del lienzo escalado del DeviceStage o al
// abrir popups (window.open) que iOS bloquea o no rendea bien para print.
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
              <th style={printStyles.th}>Operación</th>
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
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{fmtAnswer(e.userAnswer, e.mode)}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{fmtAnswer(e.correctAnswer, e.mode)}</td>
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
  const res = app.lastResult || { category: "Sumas", solved: 0, total: 3, time: 0, starsEarned: 0, log: [] };
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
      <div style={{ position: "absolute", top: 14, left: 24, right: 24, display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
        <button className="ed-btn ed-btn-ghost" onClick={() => go("home")} style={{ padding: "8px 14px", fontWeight: 800, letterSpacing: "0.04em" }}>← VOLVER AL INICIO</button>
      </div>

      {/* Contenido central */}
      <div style={{
        position: "absolute", inset: "70px 32px 20px 32px",
        display: "grid", gridTemplateColumns: "0.85fr 1.4fr", gap: 24, alignItems: "stretch",
      }}>
        {/* Izq: personaje + saludo (fuera del área imprimible) */}
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

        {/* Der: REPORTE ACADÉMICO (área imprimible) */}
        <div className="ed-card" style={{ padding: 16, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
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
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{fmtAnswer(e.userAnswer, e.mode)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{fmtAnswer(e.correctAnswer, e.mode)}</td>
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
            <SummaryCell label="Estrellas" value={`${res.starsEarned}`} tone="#fce9a8" />
            <SummaryCell label="Precisión total" value={`${accuracy}%`} tone="#fce9a8" emphasis />
          </div>

          {/* Acciones — uniformes y en mayúsculas */}
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

      {/* Documento imprimible montado vía Portal a <body>. Oculto en pantalla,
          visible solo en @media print. Esto garantiza que iOS Safari/Chrome
          puedan imprimirlo correctamente sin pelearse con el lienzo escalado
          del DeviceStage ni con popups bloqueados. */}
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
