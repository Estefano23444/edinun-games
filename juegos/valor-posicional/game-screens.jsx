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
// Generador de problemas por categoría — VALOR POSICIONAL
//   vp40 → modo Dienes, número objetivo 11..40
//   vp60 → modo Dienes, número objetivo 11..60
//   vp9  → modo Dígitos, número objetivo de 8 o 9 cifras
//
// Devuelve siempre el contrato del log académico:
//   { a, b, op, answer, mode, digitsCount }
// donde a == answer == número objetivo, b == cantidad de cifras (2/8/9)
// y op === "VP" para que ResultsScreen lo trate como valor posicional.
// ─────────────────────────────────────────────────────────────
function makeProblem(cat) {
  const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  switch (cat) {
    case "vp40": {
      const target = rand(11, 40);
      return { a: target, b: 2, op: "VP", answer: target, mode: "dienes", digitsCount: 2 };
    }
    case "vp60": {
      const target = rand(11, 60);
      return { a: target, b: 2, op: "VP", answer: target, mode: "dienes", digitsCount: 2 };
    }
    case "vp9": {
      // Mezcla aleatoria entre 8 y 9 cifras (10 000 000 .. 999 999 999)
      const useNine = Math.random() < 0.5;
      const target = useNine ? rand(100000000, 999999999) : rand(10000000, 99999999);
      const dc = useNine ? 9 : 8;
      return { a: target, b: dc, op: "VP", answer: target, mode: "digitos", digitsCount: dc };
    }
    default: {
      const target = rand(11, 40);
      return { a: target, b: 2, op: "VP", answer: target, mode: "dienes", digitsCount: 2 };
    }
  }
}

function digits(n) {
  return String(n).split("");
}

// Formatea un entero con espacios cada 3 cifras desde la derecha
// (separador de millares para el modo dígitos / advanced).
function fmtThousands(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// Convierte un número ≤ 999 999 999 a su lectura en español. Pensado
// para los enunciados del modo dígitos. No maneja decimales ni signos.
function numberToSpanish(n) {
  if (n === 0) return "cero";
  const units = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve",
    "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve",
    "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
  const tens = ["", "", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const hundreds = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

  function below1000(n) {
    if (n === 0) return "";
    if (n < 30) return units[n];
    if (n < 100) {
      const t = Math.floor(n / 10), u = n % 10;
      return u === 0 ? tens[t] : `${tens[t]} y ${units[u]}`;
    }
    if (n === 100) return "cien";
    const h = Math.floor(n / 100), rest = n % 100;
    return rest === 0 ? hundreds[h] : `${hundreds[h]} ${below1000(rest)}`;
  }

  let parts = [];
  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;

  if (millones > 0) {
    if (millones === 1) parts.push("un millón");
    else parts.push(`${below1000(millones)} millones`);
  }
  if (miles > 0) {
    if (miles === 1) parts.push("mil");
    else parts.push(`${below1000(miles)} mil`);
  }
  if (resto > 0) parts.push(below1000(resto));

  return parts.join(" ");
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

// Bloques de Dienes — barra (10 unidades apiladas) y cubito (1 unidad).
// Definidos como componentes simples para mantener la coherencia visual
// entre la bandeja de la derecha y los contenedores DECENAS / UNIDADES.
function DienesBar({ color = "#f5a623", small = false }) {
  const w = small ? 12 : 18;
  const cellH = small ? 5 : 10;
  return (
    <div style={{
      width: w, height: cellH * 10, borderRadius: 4,
      background: color,
      boxShadow: `inset 0 0 0 1.5px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.4)`,
      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${cellH - 1}px, rgba(0,0,0,0.45) ${cellH - 1}px, rgba(0,0,0,0.45) ${cellH}px)`,
    }} />
  );
}
function DienesCube({ color = "#4fa0ff" }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 4,
      background: color,
      boxShadow: `inset 0 0 0 1.5px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.4)`,
    }} />
  );
}

// Mapeo nivel → (catId, catLabel). Único punto de verdad para el HUD
// de tabs del GameScreen y para applyLevelChange().
function levelToCat(level) {
  if (level === "medium") return { catId: "vp60", catLabel: "Valor posicional - Hasta 60" };
  if (level === "advanced") return { catId: "vp9", catLabel: "Valor posicional - Números grandes" };
  return { catId: "vp40", catLabel: "Valor posicional - Hasta 40" };
}

function GameScreen({ app, setApp, go }) {
  const char = CHARACTERS.find((c) => c.id === app.character) || CHARACTERS[0];
  const cat = app.currentCategory || "vp40";
  const catLabel = app.currentCatLabel || "Valor posicional - Hasta 40";

  const [problem, setProblem] = useStateG(() => makeProblem(cat));
  // Estado del input según modo:
  //   Dienes (vp40/vp60): { tens, units } + history para "QUITAR ÚLTIMO"
  //   Dígitos (vp9):      array de 9 slots (índice 0 = CMi, índice 8 = U)
  const [tens, setTens] = useStateG(0);
  const [units, setUnits] = useStateG(0);
  const [pieceHistory, setPieceHistory] = useStateG([]); // ej: ['t','u','t','t']
  const [answer, setAnswer] = useStateG([]); // 9 slots para modo dígitos

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

  const isDienes = problem.mode === "dienes";
  const totalSlots = 9; // siempre 9 en modo dígitos (CMi..U)
  const usedSlots = problem.digitsCount || 9; // 8 o 9 en vp9

  const started = useRefG(Date.now());
  const exerciseStart = useRefG(Date.now());

  useEffectG(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, []);

  // ─── Acciones modo Dienes ────────────────────────────────────
  const TENS_CAP = problem.mode === "dienes" ? Math.ceil((cat === "vp60" ? 60 : 40) / 10) : 0; // 4 o 6
  function addTen() {
    if (tens >= TENS_CAP) return;
    setTens((t) => t + 1);
    setPieceHistory((h) => [...h, "t"]);
  }
  function addUnit() {
    if (units >= 9) return;
    setUnits((u) => u + 1);
    setPieceHistory((h) => [...h, "u"]);
  }
  function removeLastPiece() {
    if (pieceHistory.length === 0) return;
    const last = pieceHistory[pieceHistory.length - 1];
    setPieceHistory((h) => h.slice(0, -1));
    if (last === "t") setTens((t) => Math.max(0, t - 1));
    else setUnits((u) => Math.max(0, u - 1));
  }

  // ─── Acciones modo Dígitos ───────────────────────────────────
  // answer[0] = slot CMi, answer[8] = slot U.
  // Si el problema es de 8 cifras, el slot CMi (índice 0) está deshabilitado.
  const firstActive = totalSlots - usedSlots; // 0 si 9 cifras, 1 si 8

  function press(d, slotIdx) {
    setAnswer((prev) => {
      const next = [...prev];
      while (next.length < totalSlots) next.push(undefined);
      if (typeof slotIdx === "number") {
        if (slotIdx < firstActive) return next; // slot deshabilitado
        next[slotIdx] = d;
      } else {
        // Sin destino explícito: rellenar el primer slot vacío de izquierda
        // a derecha dentro del rango activo (lectura natural del enunciado).
        for (let i = firstActive; i < totalSlots; i++) {
          if (next[i] === undefined) { next[i] = d; return next; }
        }
      }
      return next;
    });
  }
  function eraseAtSlot(i) {
    setAnswer((prev) => {
      const next = [...prev];
      while (next.length < totalSlots) next.push(undefined);
      next[i] = undefined;
      return next;
    });
  }
  function eraseLastDigit() {
    setAnswer((prev) => {
      const next = [...prev];
      while (next.length < totalSlots) next.push(undefined);
      // Borra el último colocado: el más a la derecha entre los llenos.
      for (let i = totalSlots - 1; i >= firstActive; i--) {
        if (next[i] !== undefined) { next[i] = undefined; return next; }
      }
      return next;
    });
  }

  function getCurrentValue() {
    if (isDienes) return tens * 10 + units;
    const slice = answer.slice(firstActive, totalSlots);
    if (slice.some((d) => d === undefined || d === "")) return null; // incompleto
    return parseInt(slice.join(""), 10);
  }

  function verify() {
    const value = getCurrentValue();
    if (isDienes) {
      if (tens === 0 && units === 0) {
        setFeedback("err");
        setFeedbackMsg("Pon barras o cubitos");
        setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
        return;
      }
    } else {
      if (value === null) {
        setFeedback("err");
        setFeedbackMsg("Completa todos los casilleros");
        setTimeout(() => { setFeedback(null); setFeedbackMsg(""); }, 700);
        return;
      }
    }

    const isCorrect = value === problem.answer;
    const exerciseSec = Math.max(0, Math.floor((Date.now() - exerciseStart.current) / 1000));
    const earned = isCorrect ? Math.max(1, 10 - Math.floor(exerciseSec / 3)) : 0;

    const newAttempted = attempted + 1;
    const newSolved = solved + (isCorrect ? 1 : 0);
    const newStarsSession = starsSession + earned;
    const newStarsTotal = stars + earned;

    const entry = {
      idx: newAttempted,
      a: problem.a,
      b: problem.b,
      op: problem.op,
      correctAnswer: problem.answer,
      userAnswer: value,
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
      // Reset del input para la siguiente ronda
      setTens(0); setUnits(0); setPieceHistory([]);
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

  function applyLevelChange(newLevel) {
    const { catId, catLabel: lbl } = levelToCat(newLevel);
    setApp((s) => ({ ...s, level: newLevel, currentCategory: catId, currentCatLabel: lbl }));
    setProblem(makeProblem(catId));
    setTens(0); setUnits(0); setPieceHistory([]);
    setAnswer([]);
    setSolved(0); setAttempted(0); setStarsSession(0);
    setLog([]);
    setFeedback(null); setFeedbackMsg("");
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

  // ─── Etiquetas de los 9 slots posicionales (modo dígitos) ─────
  const SLOT_LABELS = ["CMi","DMi","UMi","CM","DM","UM","C","D","U"];
  // Separadores visuales entre grupos: hay un gap extra después de los
  // índices 2 (CMi DMi UMi | CM DM UM ...) y 5 (... UM | C D U).
  const SLOT_GROUP_BREAK = new Set([3, 6]);

  // Hint del bocadillo según modo. CÓMO resolver, no QUÉ.
  const hintText = isDienes
    ? "Arrastra cada pieza a su columna."
    : "Arrastra los dígitos a su lugar.";

  // Instrucción del ejercicio (en el centro).
  const exerciseInstruction = isDienes
    ? "Completa el número usando decenas y unidades."
    : "Escribe el número que dice el cartel:";

  // Estado efímero de "drop incorrecto" — el contenedor que recibió la
  // pieza equivocada destella en rojo durante 700 ms.
  const [wrongDrop, setWrongDrop] = useStateG(null); // 'tens' | 'units' | null
  function flashWrong(side) {
    setWrongDrop(side);
    setTimeout(() => setWrongDrop(null), 700);
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>


      {/* Top HUD — el centro (tabs de nivel) está absolutamente centrado en la
          pantalla, no entre las dos columnas, para que no se desplace cuando el
          logo es más ancho que el timer/stars de la derecha. */}
      <div style={{ position: "absolute", top: 10, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        {/* Izq: logo + indicador de RONDA pegado al logo. RONDA vivía en
            absolute top:78 centrado, pero ahí se cruzaba con el enunciado
            del modo Dienes. Pasarlo al HUD libera la franja superior del
            lienzo para que el cartel respire y aprovecha el espacio que
            queda entre el logo y los tabs centrales. */}
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

        {/* Centro: barra de niveles — clickeable, anclada al centro real de la
            pantalla. Tocar un nivel distinto al actual abre un modal de
            confirmación; aceptar reinicia la ronda con la dificultad nueva. */}
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {[
            { id: "basic", label: "Números hasta el 40", c: "#f5a623" },
            { id: "medium", label: "Números hasta el 60", c: "#f5d84b" },
            { id: "advanced", label: "9 cifras", c: "#4fa0ff" },
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
                  fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 11,
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

      {/* Pista de juego — bocadillo en la zona superior izquierda, sobre el
          personaje. Explica COMO resolver (no QUE resolver). El texto cambia
          segun el modo activo (Dienes vs digitos posicionales). */}
      <div style={{
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
          {hintText}
          {/* Pico del bocadillo apuntando hacia el personaje (abajo). */}
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

      {/* Personaje compañero — lado izquierdo, elevado para no chocar con el
          numpad. La frase motivadora aparece en el feedback central (con
          atribución al personaje); el bocadillo de arriba lleva la pista
          de mecánica del juego.
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

      {/* ══════ ZONA CENTRAL — depende del modo activo ══════
          Modo Dienes (vp40/vp60): bandeja con barras y cubitos.
          Modo Dígitos (vp9): cartel con número en palabras + slots posicionales. */}

      {isDienes && (() => {
        const total = tens * 10 + units;
        const baseTens = "#f5a623", baseUnits = "#4fa0ff";
        const fbCol = feedback === "ok" ? "#2ecc8f" : feedback === "err" ? "#ff6b6b" : null;
        const TENS_BORDER = wrongDrop === "tens" ? "#ff6b6b" : (fbCol || baseTens);
        const UNITS_BORDER = wrongDrop === "units" ? "#ff6b6b" : (fbCol || baseUnits);
        const TENS_GLOW = wrongDrop === "tens" || feedback ? `0 0 14px ${TENS_BORDER}66` : "none";
        const UNITS_GLOW = wrongDrop === "units" || feedback ? `0 0 14px ${UNITS_BORDER}66` : "none";

        // Handlers de drop. Drop válido = pieza coincide con columna.
        const onDropTens = (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("drag-over");
          const data = e.dataTransfer.getData("text/plain");
          if (data === "piece:tens") addTen();
          else if (data === "piece:units") flashWrong("tens");
        };
        const onDropUnits = (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("drag-over");
          const data = e.dataTransfer.getData("text/plain");
          if (data === "piece:units") addUnit();
          else if (data === "piece:tens") flashWrong("units");
        };
        const onDragOverBox = (e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); };
        const onDragLeaveBox = (e) => e.currentTarget.classList.remove("drag-over");

        return (
          <React.Fragment>
            {/* CABECERA del modo Dienes — instrucción + número objetivo.
                top:80 (un punto más abajo del HUD para que el enunciado no
                se sienta pegado a los tabs). Cabecera, contenedores y total
                bajan en bloque; la bandeja de piezas se queda anclada
                abajo. */}
            <div style={{
              position: "absolute", top: 80, left: 240, right: 200,
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 700,
                fontSize: 18, lineHeight: 1.25, color: "#fff",
                marginBottom: 14, textShadow: "0 2px 6px rgba(0,0,0,0.45)",
              }}>
                {exerciseInstruction}
              </div>
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 800,
                fontSize: 60, lineHeight: 1, color: "#fce9a8",
                textShadow: "0 0 24px rgba(252,233,168,0.55), 0 4px 0 rgba(0,0,0,0.35)",
              }}>
                {problem.answer}
              </div>
            </div>

            {/* CONTENEDORES DECENAS / UNIDADES — bajan 20 px junto con la
                cabecera. top:200, altura 180 → centro y=290, alineado con
                la nueva posición de los botones de la derecha. */}
            <div style={{
              position: "absolute", top: 200, left: 240, right: 200,
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14,
              alignItems: "stretch",
            }}>
              {/* DECENAS */}
              <div
                onDragOver={onDragOverBox}
                onDragLeave={onDragLeaveBox}
                onDrop={onDropTens}
                style={{
                  background: "rgba(10,6,35,0.55)",
                  border: `1.5px solid ${TENS_BORDER}aa`,
                  borderRadius: 14, padding: "8px 8px 10px",
                  boxShadow: TENS_GLOW,
                  height: 180,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 4, transition: "box-shadow 0.18s, border-color 0.18s",
                }}
              >
                <div className="ed-label" style={{ color: TENS_BORDER, fontSize: 11 }}>
                  DECENAS
                </div>
                <div style={{
                  fontFamily: "var(--ed-font-display)", fontWeight: 700,
                  fontSize: 18, color: "#fff", lineHeight: 1,
                }}>
                  {tens} <span style={{ color: "rgba(246,241,255,0.55)", fontSize: 13 }}>· {tens * 10}</span>
                </div>
                <div style={{
                  display: "flex", alignItems: "flex-end", justifyContent: "center",
                  gap: 6, flex: 1, paddingTop: 2, minHeight: 100,
                }}>
                  {Array.from({ length: tens }).map((_, i) => (
                    <DienesBar key={i} color={baseTens} />
                  ))}
                </div>
              </div>

              {/* UNIDADES */}
              <div
                onDragOver={onDragOverBox}
                onDragLeave={onDragLeaveBox}
                onDrop={onDropUnits}
                style={{
                  background: "rgba(10,6,35,0.55)",
                  border: `1.5px solid ${UNITS_BORDER}aa`,
                  borderRadius: 14, padding: "8px 8px 10px",
                  boxShadow: UNITS_GLOW,
                  height: 180,
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 4, transition: "box-shadow 0.18s, border-color 0.18s",
                }}
              >
                <div className="ed-label" style={{ color: UNITS_BORDER, fontSize: 11 }}>
                  UNIDADES
                </div>
                <div style={{
                  fontFamily: "var(--ed-font-display)", fontWeight: 700,
                  fontSize: 18, color: "#fff", lineHeight: 1,
                }}>
                  {units} <span style={{ color: "rgba(246,241,255,0.55)", fontSize: 13 }}>· {units}</span>
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(5, 22px)", gap: 5,
                  paddingTop: 4, minHeight: 100, alignContent: "end", justifyContent: "center",
                }}>
                  {Array.from({ length: units }).map((_, i) => (
                    <DienesCube key={i} color={baseUnits} />
                  ))}
                </div>
              </div>
            </div>

            {/* TOTAL — debajo de los contenedores con holgura clara
                (contenedores terminan en y=380, total empieza en y=398). */}
            <div style={{
              position: "absolute", top: 398, left: 240, right: 200,
              fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 18,
              color: "#fff", letterSpacing: "0.02em", textAlign: "center",
              textShadow: "0 2px 4px rgba(0,0,0,0.45)",
            }}>
              Total: <span style={{ color: "#fce9a8", fontSize: 26 }}>{total}</span>
            </div>
          </React.Fragment>
        );
      })()}

      {!isDienes && (() => {
        // Slots ligeramente más estrechos (46 en vez de 50) para que el
        // wrapper pueda usar right:200 y dejar holgura cómoda con la columna
        // de botones (VERIFICAR/BORRAR/SALIR), evitando que el slot U se
        // pegue al primer botón. SLOT_H=92 para llenar el aire vertical
        // disponible entre el cartel y el numpad. GROUP_GAP=10 mantiene la
        // lectura por grupos de millares.
        const SLOT_W = 46, SLOT_H = 92, GAP = 3;
        const GROUP_GAP = 10;
        return (
          <React.Fragment>
            {/* HEADER del modo dígitos: instrucción grande + cartel narrado.
                top:80 — bajado para que el enunciado no quede pegado a los
                tabs del HUD. Cartel un punto más grande para legibilidad. */}
            <div style={{
              position: "absolute", top: 80, left: 240, right: 200,
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: "var(--ed-font-display)", fontWeight: 700,
                fontSize: 19, lineHeight: 1.2, color: "#fff",
                marginBottom: 12, textShadow: "0 2px 6px rgba(0,0,0,0.45)",
              }}>
                {exerciseInstruction}
              </div>
              <div style={{
                background: "linear-gradient(180deg, rgba(252,233,168,0.97), rgba(217,164,65,0.97))",
                color: "#1a0f00",
                borderRadius: 14,
                padding: "14px 22px",
                fontFamily: "var(--ed-font-display)", fontWeight: 700, fontSize: 22,
                lineHeight: 1.25,
                boxShadow: "0 6px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}>
                {numberToSpanish(problem.answer)}
              </div>
            </div>

            {/* SLOTS del modo dígitos: top:233 — siguen al cabezal que bajó
                20 px. Centro vertical y=290, alineado con la nueva
                posición de la columna de botones. Slots de 92 px para
                llenar el aire entre cabecera y numpad. */}
            <div style={{
              position: "absolute", top: 233, left: 232, right: 200,
              textAlign: "center",
            }}>
              {/* Etiquetas CMi DMi UMi · CM DM UM · C D U */}
              <div style={{
                display: "flex", justifyContent: "center", alignItems: "center",
                marginBottom: 8, gap: 0,
              }}>
                {SLOT_LABELS.map((lb, i) => (
                  <React.Fragment key={`L${i}`}>
                    {SLOT_GROUP_BREAK.has(i) && <div style={{ width: GROUP_GAP }} />}
                    <div style={{
                      width: SLOT_W, marginRight: i < SLOT_LABELS.length - 1 ? GAP : 0,
                      fontFamily: "var(--ed-font-mono)", fontSize: 13,
                      color: i < firstActive ? "rgba(246,241,255,0.25)" : "#fce9a8",
                      letterSpacing: "0.05em", textAlign: "center",
                    }}>
                      {lb}
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* 9 slots */}
              <div style={{
                display: "flex", justifyContent: "center", alignItems: "center", gap: 0,
              }}>
                {SLOT_LABELS.map((_lb, i) => {
                  const disabled = i < firstActive;
                  const d = answer[i];
                  const filled = d !== undefined && d !== "";
                  let activeIdx = -1;
                  for (let k = firstActive; k < totalSlots; k++) {
                    if (answer[k] === undefined || answer[k] === "") { activeIdx = k; break; }
                  }
                  const isActive = i === activeIdx;
                  return (
                    <React.Fragment key={`S${i}`}>
                      {SLOT_GROUP_BREAK.has(i) && <div style={{ width: GROUP_GAP }} />}
                      <div
                        className={`ed-answer-slot ${!disabled && isActive ? "active" : ""} ${filled ? "filled" : ""}`}
                        draggable={filled && !disabled}
                        onDragStart={(e) => {
                          if (!filled || disabled) return;
                          e.dataTransfer.setData("text/plain", `s:${i}:${d}`);
                          e.dataTransfer.effectAllowed = "move";
                          e.currentTarget.classList.add("dragging");
                        }}
                        onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}
                        onDragOver={(e) => { if (!disabled) { e.preventDefault(); e.currentTarget.classList.add("drag-over"); } }}
                        onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                        onDrop={(e) => {
                          if (disabled) return;
                          e.preventDefault();
                          e.currentTarget.classList.remove("drag-over");
                          const data = e.dataTransfer.getData("text/plain");
                          if (!data) return;
                          setAnswer((prev) => {
                            const next = [...prev];
                            while (next.length < totalSlots) next.push(undefined);
                            if (data.startsWith("s:")) {
                              const parts = data.split(":");
                              const srcIdx = parseInt(parts[1], 10);
                              const srcDigit = parts.slice(2).join(":");
                              if (Number.isNaN(srcIdx) || srcIdx === i) return next;
                              const here = next[i];
                              next[i] = srcDigit;
                              next[srcIdx] = here;
                            } else if (data.startsWith("n:")) {
                              next[i] = data.slice(2);
                            } else {
                              next[i] = data;
                            }
                            return next;
                          });
                        }}
                        onClick={() => { if (filled && !disabled) eraseAtSlot(i); }}
                        title={disabled ? "Este casillero no se usa en este número" : (filled ? "Toca para borrar · arrastra para mover" : "Arrastra un número aquí")}
                        style={{
                          width: SLOT_W, height: SLOT_H, fontSize: 42,
                          marginRight: i < SLOT_LABELS.length - 1 ? GAP : 0,
                          opacity: disabled ? 0.25 : 1,
                          pointerEvents: disabled ? "none" : "auto",
                          borderColor: feedback === "ok" ? "#2ecc8f" : feedback === "err" ? "#ff6b6b" : undefined,
                          boxShadow: feedback === "ok"
                            ? "0 0 18px rgba(46,204,143,0.65)"
                            : feedback === "err"
                              ? "0 0 18px rgba(255,107,107,0.65)"
                              : undefined,
                          color: "#fff",
                          cursor: disabled ? "not-allowed" : (filled ? "grab" : "default"),
                        }}
                      >
                        {disabled ? "—" : (filled ? d : "")}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        );
      })()}

      {/* Bandeja inferior — depende del modo. */}
      {isDienes ? (
        <div style={{
          position: "absolute", bottom: 14, left: 240, right: 200,
          display: "flex", gap: 18, alignItems: "center", justifyContent: "center",
        }}>
          <button
            className="ed-numpad-key ed-draggable"
            draggable={tens < TENS_CAP}
            onDragStart={(e) => {
              if (tens >= TENS_CAP) { e.preventDefault(); return; }
              e.dataTransfer.setData("text/plain", "piece:tens");
              e.dataTransfer.effectAllowed = "copy";
              e.currentTarget.classList.add("dragging");
            }}
            onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}
            onClick={addTen}
            disabled={tens >= TENS_CAP}
            style={{
              height: 64, padding: "0 18px", fontSize: 14,
              borderColor: "#f5a623", borderWidth: 2, borderStyle: "solid",
              color: "#fff", display: "flex", alignItems: "center", gap: 10,
              opacity: tens >= TENS_CAP ? 0.4 : 1,
              cursor: tens >= TENS_CAP ? "not-allowed" : "grab",
              fontFamily: "var(--ed-font-display)", fontWeight: 700,
            }}
            title="Arrastra a DECENAS o toca para agregar"
          >
            <DienesBar color="#f5a623" small />
            <span>+ DECENA</span>
          </button>
          <button
            className="ed-numpad-key ed-draggable"
            draggable={units < 9}
            onDragStart={(e) => {
              if (units >= 9) { e.preventDefault(); return; }
              e.dataTransfer.setData("text/plain", "piece:units");
              e.dataTransfer.effectAllowed = "copy";
              e.currentTarget.classList.add("dragging");
            }}
            onDragEnd={(e) => e.currentTarget.classList.remove("dragging")}
            onClick={addUnit}
            disabled={units >= 9}
            style={{
              height: 64, padding: "0 18px", fontSize: 14,
              borderColor: "#4fa0ff", borderWidth: 2, borderStyle: "solid",
              color: "#fff", display: "flex", alignItems: "center", gap: 10,
              opacity: units >= 9 ? 0.4 : 1,
              cursor: units >= 9 ? "not-allowed" : "grab",
              fontFamily: "var(--ed-font-display)", fontWeight: 700,
            }}
            title="Arrastra a UNIDADES o toca para agregar"
          >
            <DienesCube color="#4fa0ff" />
            <span>+ UNIDAD</span>
          </button>
        </div>
      ) : (
        <div style={{
          position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
          display: "grid", gridTemplateColumns: "repeat(10, 60px)", gap: 8,
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
                  height: 64, fontSize: 30,
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
      )}

      {/* Botones de acción — columna derecha. Centro vertical en y=290
          (en vez del centro 270 del lienzo) para alinearse con la nueva
          posición bajada de contenedores Dienes / slots dígitos. */}
      <div style={{
        position: "absolute", right: 18, top: "calc(50% + 20px)", transform: "translateY(-50%)",
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
          onClick={isDienes ? removeLastPiece : eraseLastDigit}
          disabled={isDienes ? pieceHistory.length === 0 : answer.every((d) => d === undefined || d === "")}
          style={{ fontSize: 15, padding: "0 10px", height: 56, fontWeight: 800, letterSpacing: "0.04em" }}
        >
          {isDienes ? "QUITAR ÚLTIMO" : "BORRAR"}
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
        const labels = { basic: "Números hasta el 40", medium: "Números hasta el 60", advanced: "9 cifras" };
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
// Formatea una operación de ejercicio para el reporte académico.
// Para valor posicional (op === "VP") usa "Armar 37" / "Armar 12 345 678".
function formatOp(e) {
  if (e.op === "VP") return `Armar ${fmtThousands(e.a)}`;
  return `${e.a} ${e.op} ${e.b}`;
}
// Helper para mostrar respuestas/resultados en el reporte: aplica
// separador de millares cuando es valor posicional (números grandes).
function fmtAnswer(value, op) {
  if (value === undefined || value === null || value === "") return "—";
  if (op === "VP") return fmtThousands(value);
  return value;
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
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{fmtAnswer(e.userAnswer, e.op)}</td>
                <td style={{ ...printStyles.td, ...printStyles.tdR }}>{fmtAnswer(e.correctAnswer, e.op)}</td>
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
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{fmtAnswer(e.userAnswer, e.op)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{fmtAnswer(e.correctAnswer, e.op)}</td>
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
