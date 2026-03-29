import { useState, useRef, useEffect } from "react";

// Build a lookup by date string
function getDayByDate(allDays, date) {
  const key = date.toISOString().split("T")[0];
  return allDays?.find(d => d.date.toISOString().split("T")[0] === key) || null;
}

function formatDayContext(day, calcDayMacros, label) {
  if (!day) return `${label}: outside plan range`;
  const macros = calcDayMacros(day.macroDay, day.km);
  const parts = [
    `${label} (${day.date.toDateString()}):`,
    `  Session: ${day.type} — ${day.detail}`,
    `  Phase: ${day.phase.name}`,
    `  Km: ${day.km || 0}km`,
    `  Eat: ${macros.kcal} kcal | Protein: ${macros.protein}g | Carbs: ${macros.carbs}g | Fat: ${macros.fat}g`,
    `  Est. burn: ~${macros.burn} kcal (run: ~${macros.runBurn} kcal)`,
    `  Macro type: ${day.macroDay}`,
  ];
  if (day.fueling) parts.push(`  Fueling: ${day.fueling}`);
  return parts.join("\n");
}

const PLAN_CONTEXT = `You are an expert marathon coach and sports nutritionist embedded in a training app. You are helping Ross Hunter, 39yo male, Amsterdam, train for Amsterdam Marathon 18 Oct 2026. Goal: sub-4:00 (5:41/km).

KEY STATS: 90kg, 175cm, BMI 29.4, target 75-78kg. VO2 Max 43 (peaked 45.3 Nov 2025). Lactate threshold 5:36/km @ 184bpm. Best marathon: 4:37. Recently ran 85km ultra. TDEE ~2,923 kcal/day (Garmin). Heavy sweater. Uses Precision Hydration. Reformer Pilates Sundays. Prefers no Tue/Thu training.

TRAINING PHASES:
- BASE Apr-May: 50-55km/wk, LT target 5:36→5:25/km
- BUILD Jun-Jul: 60-70km/wk, LT target 5:25→5:15/km  
- PEAK Aug-Sep: 70-80km/wk, LT target 5:15→5:05/km
- TAPER Oct: 35-50km/wk

PACES: Easy/Z2 6:20-6:45/km <155bpm | Marathon 5:41/km ~170bpm | Tempo 5:20-5:30/km ~178bpm | Intervals 5:00-5:10/km ~182bpm

NUTRITION: Hard day 2800kcal (355g C/155g P/80g F) | Easy 2400kcal | Pilates/active 2200kcal | Rest 2000kcal. Protein 155g EVERY day.

FUELING (Precision Hydration): PH 1500 pre all hard sessions. PH Carb 30 gels base/build. PH Carb 90 from peak phase. PH Caffeine Gel race day km30. Heavy sweater = always PH 1500 not 1000.

Be concise, specific and direct. Reference Ross's actual data. If given Garmin screenshots, analyse vs plan and give actionable feedback.`;

export default function AICoach({ memory, workoutLog, allDays, calcDayMacros }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("oai_key") || "");
  const [showKey, setShowKey] = useState(!localStorage.getItem("oai_key"));
  const [keyInput, setKeyInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey Ross 👋 I have full context of your plan, training data, nutrition and PH fueling setup.\n\nAsk me anything — pacing, nutrition, whether to train if tired, recovery, race strategy. Or upload a Garmin screenshot for analysis against your plan." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageB64, setImageB64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function saveKey() {
    if (!keyInput.trim()) return;
    localStorage.setItem("oai_key", keyInput.trim());
    setApiKey(keyInput.trim());
    setShowKey(false);
  }

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const full = ev.target.result;
      setImageB64(full.split(",")[1]);
      setImagePreview(full);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function send() {
    const text = input.trim();
    if (!text && !imageB64) return;
    if (!apiKey) { setShowKey(true); return; }

    const userMsg = {
      role: "user",
      content: text || "Please analyse this Garmin screenshot against my training plan.",
      image: imagePreview
    };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    const capturedB64 = imageB64;
    const capturedPreview = imagePreview;
    setImageB64(null);
    setImagePreview(null);
    setLoading(true);

    // Build live daily context — today, yesterday, tomorrow, day after
    const now = new Date(); now.setHours(0,0,0,0);
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(now); dayAfter.setDate(dayAfter.getDate() + 2);

    const todayDay = getDayByDate(allDays, now);
    const tomorrowDay = getDayByDate(allDays, tomorrow);
    const yesterdayDay = getDayByDate(allDays, yesterday);
    const dayAfterDay = getDayByDate(allDays, dayAfter);

    const liveCtx = allDays && calcDayMacros ? `\n\nLIVE PLAN CONTEXT (today is ${now.toDateString()}):
${formatDayContext(yesterdayDay, calcDayMacros, "YESTERDAY")}
${formatDayContext(todayDay, calcDayMacros, "TODAY")}
${formatDayContext(tomorrowDay, calcDayMacros, "TOMORROW")}
${formatDayContext(dayAfterDay, calcDayMacros, "DAY AFTER")}

When asked about meals, shopping, fueling or nutrition for any of these days, use the exact macro targets above. When asked "what should I eat tomorrow" give specific meals that hit the carb/protein/fat/kcal targets for that day's session.` : "";

    const memCtx = memory ? `\n\nROSS'S NOTES:\n${memory}` : "";
    const logCtx = workoutLog?.length
      ? `\n\nRECENT WORKOUTS (planned → actual):\n${workoutLog.slice(-8).map(w => `${w.date}: ${w.planned} → ${w.actual}${w.notes ? ` (${w.notes})` : ""}`).join("\n")}`
      : "";

    const apiMsgs = [
      { role: "system", content: PLAN_CONTEXT + liveCtx + memCtx + logCtx },
      ...history.slice(1).map(m => {
        if (m.role === "user" && m.image) {
          return {
            role: "user",
            content: [
              { type: "text", text: m.content },
              { type: "image_url", image_url: { url: m.image, detail: "high" } }
            ]
          };
        }
        return { role: m.role, content: m.content };
      })
    ];

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-4o", messages: apiMsgs, max_tokens: 700 })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setMessages(prev => [...prev, { role: "assistant", content: data.choices[0].message.content }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${err.message}` }]);
    }
    setLoading(false);
  }

  const suggestedQuestions = [
    "How should I pace Saturday's long run?",
    "What should I eat before tomorrow's tempo?",
    "My legs are heavy — should I train today?",
    "Explain my lactate threshold and how to improve it",
    "What PH products do I need for a 28km run?",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 116px)", fontFamily: "'Courier New', monospace" }}>

      {/* API Key setup */}
      {showKey && (
        <div style={{ margin: "10px 14px 0", background: "rgba(250,204,21,0.07)", border: "1px solid #facc1540", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "9px", color: "#facc15", letterSpacing: "2px", marginBottom: "8px" }}>OPENAI API KEY REQUIRED</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveKey()}
              placeholder="sk-proj-..."
              style={{ flex: 1, background: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", padding: "8px 10px", color: "#e2e8f0", fontSize: "16px", fontFamily: "'Courier New', monospace", outline: "none" }}
            />
            <button onClick={saveKey} style={{ padding: "8px 14px", background: "#facc15", border: "none", borderRadius: "6px", color: "#0a0a0f", fontSize: "10px", fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: "1px" }}>SAVE</button>
          </div>
          <div style={{ fontSize: "9px", color: "#475569", marginTop: "5px" }}>Stored locally in your browser only. Never shared.</div>
        </div>
      )}

      {/* Change key button */}
      {!showKey && (
        <div style={{ padding: "6px 14px 0", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => { setShowKey(true); setKeyInput(""); }} style={{ fontSize: "9px", color: "#334155", background: "none", border: "none", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: "1px" }}>
            ⚙ API KEY
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 0" }}>

        {/* Suggested questions when empty */}
        {messages.length === 1 && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "9px", color: "#334155", letterSpacing: "2px", marginBottom: "8px" }}>QUICK QUESTIONS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {suggestedQuestions.map(q => (
                <button key={q} onClick={() => setInput(q)} style={{ textAlign: "left", background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: "6px", padding: "7px 10px", color: "#64748b", fontSize: "11px", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>
                  → {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: "8px", marginBottom: "10px", alignItems: "flex-start" }}>
            <div style={{ fontSize: "13px", minWidth: "20px", textAlign: "center", paddingTop: "2px" }}>{msg.role === "user" ? "👤" : "🤖"}</div>
            <div style={{
              maxWidth: "84%",
              background: msg.role === "user" ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${msg.role === "user" ? "#4ade8030" : "#1e293b"}`,
              borderRadius: msg.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
              padding: "9px 11px", fontSize: "11px", color: "#e2e8f0", lineHeight: 1.6, whiteSpace: "pre-wrap"
            }}>
              {msg.image && <img src={msg.image} alt="" style={{ width: "100%", borderRadius: "5px", marginBottom: "6px", display: "block" }} />}
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <div style={{ fontSize: "13px" }}>🤖</div>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b", borderRadius: "10px 10px 10px 2px", padding: "9px 14px", fontSize: "14px", color: "#334155", letterSpacing: "4px" }}>···</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div style={{ padding: "0 14px", marginTop: "6px" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img src={imagePreview} alt="" style={{ height: "56px", borderRadius: "5px", border: "1px solid #4ade80" }} />
            <button onClick={() => { setImageB64(null); setImagePreview(null); }} style={{ position: "absolute", top: "-5px", right: "-5px", background: "#ef4444", border: "none", borderRadius: "50%", width: "16px", height: "16px", color: "white", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>×</button>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "8px 14px 12px", borderTop: "1px solid #1e293b", marginTop: "6px" }}>
        <div style={{ display: "flex", gap: "6px", alignItems: "flex-end" }}>
          <button onClick={() => fileRef.current?.click()} title="Upload Garmin screenshot" style={{ padding: "9px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", borderRadius: "7px", color: "#475569", cursor: "pointer", fontSize: "14px", flexShrink: 0, lineHeight: 1 }}>📸</button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask your coach... (Enter to send)"
            rows={1}
            style={{ flex: 1, background: "#0f172a", border: "1px solid #1e293b", borderRadius: "7px", padding: "9px 11px", color: "#e2e8f0", fontSize: "16px", fontFamily: "'Courier New', monospace", outline: "none", resize: "none", lineHeight: 1.5 }}
          />
          <button onClick={send} disabled={loading} style={{ padding: "9px 13px", background: loading ? "#1e293b" : "#4ade80", border: "none", borderRadius: "7px", color: loading ? "#475569" : "#0a0a0f", fontSize: "11px", fontWeight: "bold", cursor: loading ? "default" : "pointer", fontFamily: "'Courier New', monospace", flexShrink: 0, lineHeight: 1 }}>
            {loading ? "..." : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}
