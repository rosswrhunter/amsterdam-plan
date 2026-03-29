import { useState, useRef } from "react";

const PLAN_CONTEXT = `You are an expert marathon coach helping Ross Hunter (39yo, 90kg, Amsterdam Marathon 18 Oct 2026, sub-4:00 goal, VO2max 43, LT 5:36/km). He uses a Garmin and tracks Body Battery. He is in a structured training plan with BASE/BUILD/PEAK/TAPER phases.

Based on his readiness inputs and optional Garmin screenshot, give a clear morning recommendation. Be direct and specific. Reference his actual data if a screenshot is provided.`;

const EMOJIS = {
  sleep:    ["😴","😐","🙂","😊","🔥"],
  soreness: ["💀","😣","😐","🙂","✅"],
  stress:   ["🤯","😤","😐","😌","😎"],
};

const LABELS = {
  sleep:    ["Terrible","Poor","OK","Good","Great"],
  soreness: ["Wrecked","Sore","Moderate","Slight","Fresh"],
  stress:   ["Overwhelming","High","Moderate","Low","None"],
};

function Slider({ label, icon, value, onChange, type }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "2px" }}>{icon} {label.toUpperCase()}</div>
        <div style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: "bold" }}>
          {EMOJIS[type][value - 1]} {LABELS[type][value - 1]}
        </div>
      </div>
      <div style={{ display: "flex", gap: "6px" }}>
        {[1,2,3,4,5].map(v => (
          <button key={v} onClick={() => onChange(v)} style={{
            flex: 1, height: "32px", border: "none", borderRadius: "6px",
            background: v <= value
              ? v <= 2 ? "#ef4444" : v === 3 ? "#facc15" : "#4ade80"
              : "#1e293b",
            cursor: "pointer", transition: "background 0.15s",
            opacity: v <= value ? 1 : 0.4,
          }} />
        ))}
      </div>
    </div>
  );
}

export default function Readiness({ allDays }) {
  const [sleep, setSleep]       = useState(3);
  const [soreness, setSoreness] = useState(3);
  const [stress, setStress]     = useState(3);
  const [notes, setNotes]       = useState("");
  const [imageB64, setImageB64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);
  const fileRef = useRef(null);

  // Today's planned session
  const today = new Date(); today.setHours(0,0,0,0);
  const todayPlan = allDays?.find(d => {
    const d2 = new Date(d.date); d2.setHours(0,0,0,0);
    return d2.getTime() === today.getTime();
  });

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImageB64(ev.target.result.split(",")[1]);
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function checkReadiness() {
    const apiKey = localStorage.getItem("oai_key");
    if (!apiKey) { setError("No OpenAI key — add it in the Coach tab first."); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    const todayStr = todayPlan
      ? `Today's planned session: ${todayPlan.type} — ${todayPlan.detail} (${todayPlan.phase?.name} phase)`
      : "No session planned today (rest day or outside plan).";

    const prompt = `${PLAN_CONTEXT}

${todayStr}
Date: ${today.toDateString()}

READINESS SCORES (1=worst, 5=best):
- Sleep quality: ${sleep}/5 (${LABELS.sleep[sleep-1]})
- Muscle soreness: ${soreness}/5 (${LABELS.soreness[soreness-1]})
- Stress level: ${stress}/5 (${LABELS.stress[stress-1]})
${notes ? `- Additional notes: ${notes}` : ""}
${imageB64 ? "- Garmin screenshot attached (analyse Body Battery, HRV, recovery, sleep data if visible)" : ""}

Give Ross a clear morning recommendation with:
1. A verdict: GO AS PLANNED / MODIFY / REST — with a colour-coded label
2. One sentence explanation
3. If modifying: exactly what to change (pace, distance, intensity)
4. One nutrition tip for today based on what he should do
5. One sentence motivational close

Keep it tight — he's reading this on his phone at 7am. Format as JSON:
{
  "verdict": "GO AS PLANNED" | "MODIFY" | "REST",
  "verdictColor": "#4ade80" | "#facc15" | "#ef4444",
  "explanation": "...",
  "modification": "..." or null,
  "nutritionTip": "...",
  "motivation": "..."
}`;

    try {
      const messages = imageB64
        ? [{ role: "user", content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } },
            { type: "text", text: prompt }
          ]}]
        : [{ role: "user", content: prompt }];

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-4o", max_tokens: 600, messages }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResult(parsed);
    } catch (e) {
      setError(e.message || "Failed to analyse. Try again.");
    }
    setLoading(false);
  }

  function reset() {
    setResult(null);
    setSleep(3); setSoreness(3); setStress(3);
    setNotes(""); setImageB64(null); setImagePreview(null);
  }

  const overallScore = Math.round((sleep + soreness + stress) / 3 * 10) / 10;
  const scoreColor = overallScore >= 4 ? "#4ade80" : overallScore >= 2.5 ? "#facc15" : "#ef4444";

  return (
    <div style={{ padding: "16px 14px 80px", fontFamily: "'Courier New', monospace", color: "#e2e8f0" }}>

      {/* Header */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "3px" }}>MORNING CHECK-IN</div>
        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f8fafc", marginTop: "2px" }}>How are you feeling?</div>
        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{today.toDateString()}</div>
      </div>

      {/* Today's session */}
      {todayPlan && (
        <div style={{ background: `${todayPlan.phase?.color}10`, border: `1px solid ${todayPlan.phase?.color}30`, borderRadius: "8px", padding: "10px 12px", marginBottom: "18px" }}>
          <div style={{ fontSize: "9px", color: todayPlan.phase?.color, letterSpacing: "2px", marginBottom: "3px" }}>TODAY'S PLAN</div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#e2e8f0" }}>{todayPlan.icon} {todayPlan.type}</div>
          <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{todayPlan.detail}</div>
        </div>
      )}

      {!result ? (
        <>
          {/* Sliders */}
          <Slider label="Sleep" icon="🌙" value={sleep} onChange={setSleep} type="sleep" />
          <Slider label="Soreness" icon="💪" value={soreness} onChange={setSoreness} type="soreness" />
          <Slider label="Stress" icon="🧠" value={stress} onChange={setStress} type="stress" />

          {/* Overall score */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
            <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "2px" }}>READINESS SCORE</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: scoreColor }}>{overallScore}/5</div>
          </div>

          {/* Optional notes */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Anything else? (niggle, poor sleep reason, yesterday's session...)"
            style={{
              width: "100%", padding: "10px", background: "rgba(255,255,255,0.03)",
              border: "1px solid #1e293b", borderRadius: "8px", color: "#94a3b8",
              fontSize: "11px", fontFamily: "'Courier New', monospace", resize: "none",
              height: "70px", marginBottom: "12px", boxSizing: "border-box",
            }}
          />

          {/* Garmin screenshot upload */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: `1px dashed ${imagePreview ? "#4ade8060" : "#1e293b"}`,
              borderRadius: "8px", padding: imagePreview ? "8px" : "14px 12px",
              textAlign: "center", cursor: "pointer", marginBottom: "14px",
              background: imagePreview ? "rgba(74,222,128,0.04)" : "transparent",
            }}>
            {imagePreview ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img src={imagePreview} alt="" style={{ height: "50px", borderRadius: "4px" }} />
                <div style={{ fontSize: "10px", color: "#4ade80", textAlign: "left" }}>
                  Garmin screenshot added<br/>
                  <span style={{ color: "#475569" }}>Tap to change</span>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "20px", marginBottom: "4px" }}>📱</div>
                <div style={{ fontSize: "11px", color: "#475569" }}>Upload Garmin screenshot <span style={{ color: "#334155" }}>(optional)</span></div>
                <div style={{ fontSize: "9px", color: "#334155", marginTop: "2px" }}>Body Battery, HRV, sleep — AI will factor it in</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid #ef444330", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px", fontSize: "11px", color: "#ef4444" }}>
              ⚠ {error}
            </div>
          )}

          <button onClick={checkReadiness} disabled={loading} style={{
            width: "100%", padding: "14px",
            background: loading ? "rgba(255,255,255,0.03)" : "rgba(74,222,128,0.1)",
            border: `1px solid ${loading ? "#1e293b" : "#4ade80"}`,
            borderRadius: "8px", color: loading ? "#334155" : "#4ade80",
            fontSize: "12px", letterSpacing: "2px", cursor: loading ? "default" : "pointer",
            fontFamily: "'Courier New', monospace", fontWeight: "bold",
          }}>
            {loading ? "ANALYSING…" : "✦ CHECK READINESS"}
          </button>
        </>
      ) : (
        /* Result card */
        <div>
          {/* Verdict */}
          <div style={{
            background: `${result.verdictColor}12`,
            border: `2px solid ${result.verdictColor}`,
            borderRadius: "12px", padding: "18px", marginBottom: "14px", textAlign: "center",
          }}>
            <div style={{ fontSize: "24px", marginBottom: "6px" }}>
              {result.verdict === "GO AS PLANNED" ? "✅" : result.verdict === "MODIFY" ? "⚡" : "😴"}
            </div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: result.verdictColor, letterSpacing: "1px", marginBottom: "8px" }}>
              {result.verdict}
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6 }}>{result.explanation}</div>
          </div>

          {/* Modification */}
          {result.modification && (
            <div style={{ background: "rgba(250,204,21,0.08)", border: "1px solid #facc1530", borderRadius: "8px", padding: "12px 14px", marginBottom: "10px" }}>
              <div style={{ fontSize: "9px", color: "#facc15", letterSpacing: "2px", marginBottom: "5px" }}>MODIFICATION</div>
              <div style={{ fontSize: "12px", color: "#e2e8f0", lineHeight: 1.6 }}>{result.modification}</div>
            </div>
          )}

          {/* Nutrition tip */}
          <div style={{ background: "rgba(96,165,250,0.08)", border: "1px solid #60a5fa30", borderRadius: "8px", padding: "12px 14px", marginBottom: "10px" }}>
            <div style={{ fontSize: "9px", color: "#60a5fa", letterSpacing: "2px", marginBottom: "5px" }}>NUTRITION TODAY</div>
            <div style={{ fontSize: "12px", color: "#e2e8f0", lineHeight: 1.6 }}>{result.nutritionTip}</div>
          </div>

          {/* Motivation */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px 14px", marginBottom: "18px" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", lineHeight: 1.6 }}>"{result.motivation}"</div>
          </div>

          <button onClick={reset} style={{
            width: "100%", padding: "12px",
            background: "transparent", border: "1px solid #1e293b",
            borderRadius: "8px", color: "#475569",
            fontSize: "11px", letterSpacing: "2px", cursor: "pointer",
            fontFamily: "'Courier New', monospace",
          }}>
            ↺ CHECK AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
