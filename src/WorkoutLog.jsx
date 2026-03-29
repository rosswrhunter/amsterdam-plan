import { useState, useRef } from "react";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

const feltColors = { great: "#4ade80", good: "#60a5fa", ok: "#facc15", tough: "#f97316", bad: "#ef4444" };
const feltEmoji  = { great: "🔥", good: "✅", ok: "😐", tough: "😤", bad: "💀" };

// Build a lookup of planned workouts by date string "YYYY-MM-DD"
function buildPlanLookup(allDays) {
  const lookup = {};
  allDays.forEach(day => {
    const key = day.date.toISOString().split("T")[0];
    lookup[key] = day;
  });
  return lookup;
}

export default function WorkoutLog({ log, onAdd, onDelete, allDays }) {
  const planLookup = buildPlanLookup(allDays);
  const fileRef = useRef(null);
  const [analysing, setAnalysing] = useState(false);
  const [pending, setPending] = useState(null); // AI-extracted entry awaiting confirm
  const [error, setError] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ planned: "", actual: "", notes: "", felt: "good", date: new Date().toISOString().split("T")[0] });

  async function handleScreenshot(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    e.target.value = "";

    const apiKey = localStorage.getItem("oai_key");
    if (!apiKey) {
      setError("No OpenAI key found — add it in the Coach tab first.");
      return;
    }

    // Read all images as base64
    const images = await Promise.all(files.map(file => new Promise(res => {
      const reader = new FileReader();
      reader.onload = ev => res({ b64: ev.target.result.split(",")[1], preview: ev.target.result });
      reader.readAsDataURL(file);
    })));

    setAnalysing(true);
    setError(null);
    setPending(null);

    const prompt = `You are analysing ${images.length > 1 ? `${images.length} Garmin Connect screenshots` : "a Garmin Connect activity screenshot"} for Ross Hunter's marathon training log.
${images.length > 1 ? "Screenshots may show Overview, Stats, Laps, Charts or other tabs of the same activity — combine all visible data." : ""}

Extract ALL available data and return ONLY a valid JSON object with these fields:
{
  "date": "YYYY-MM-DD",
  "activityType": "string (e.g. Running, Cycling, etc)",
  "distance": "string with unit e.g. 10.4 km",
  "duration": "string e.g. 58:32",
  "avgPace": "string e.g. 5:38/km",
  "avgHR": "number or null",
  "maxHR": "number or null",
  "elevationGain": "string or null",
  "calories": "number or null",
  "cadence": "string or null",
  "vo2max": "number or null",
  "trainingEffect": "string or null",
  "title": "activity title if shown",
  "notes": "any other notable data visible e.g. splits, zones, training load, HRV, recovery"
}

If any field is not visible, use null. Date is critical — extract it precisely.
Return ONLY the JSON object, no other text.`;

    try {
      const imageContent = images.map(img => ({
        type: "image_url", image_url: { url: `data:image/jpeg;base64,${img.b64}`, detail: "high" }
      }));

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: [{ type: "text", text: prompt }, ...imageContent]
          }]
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const raw = data.choices[0].message.content.replace(/```json|```/g, "").trim();
      const extracted = JSON.parse(raw);

      // Match against plan — default to today if AI couldn't extract a clear date
      const today = new Date().toISOString().split("T")[0];
      const sessionDate = extracted.date || today;
      const planned = planLookup[sessionDate];
      if (!extracted.date) extracted.date = today;
      const plannedText = planned ? `${planned.type} — ${planned.detail} (${phase} phase)` : "No planned session found for this date (may be rest day or outside plan)";

      // Build actual summary
      const parts = [];
      if (extracted.distance) parts.push(extracted.distance);
      if (extracted.duration) parts.push(extracted.duration);
      if (extracted.avgPace) parts.push(`@ ${extracted.avgPace}`);
      if (extracted.avgHR) parts.push(`HR ${extracted.avgHR}bpm`);
      const actualText = parts.join(" · ");

      // Build notes
      const noteParts = [];
      if (extracted.calories) noteParts.push(`${extracted.calories} kcal`);
      if (extracted.elevationGain) noteParts.push(`↑${extracted.elevationGain}`);
      if (extracted.trainingEffect) noteParts.push(`TE: ${extracted.trainingEffect}`);
      if (extracted.vo2max) noteParts.push(`VO2: ${extracted.vo2max}`);
      if (extracted.notes) noteParts.push(extracted.notes);

      // Now get AI to compare planned vs actual
      const sessionType = planned?.type || "unplanned";
      const phase = planned?.phase?.name || "BASE";
      const analysisPrompt = `Ross Hunter is training for Amsterdam Marathon (18 Oct 2026, goal sub-4:00). Current phase: ${phase}.

Planned session: ${plannedText}
Actual session: ${actualText}
Extra data: ${noteParts.join(", ")}

IMPORTANT CONTEXT — judge the run against the PLANNED session type, not his race pace:
- Easy/Zone 2 runs: target 6:20–6:45/km, HR <155bpm. Slower pace is CORRECT.
- Tempo runs: target 5:25–5:30/km, HR ~178bpm
- Intervals: target 5:00–5:10/km, HR ~182bpm
- Marathon pace: target 5:41/km, HR ~170bpm
- Long runs: target 6:15–6:30/km, HR <160bpm
- 5:41/km is his RACE pace — do NOT use this to judge easy runs

Write 2-3 sentences: did he execute the session correctly for its type? What does HR/pace data suggest? One specific recommendation. Be direct, no fluff, no hedging.`;

      const analysisRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 200,
          messages: [{ role: "user", content: analysisPrompt }]
        })
      });
      const analysisData = await analysisRes.json();
      const analysis = analysisData.choices?.[0]?.message?.content || "";

      setPending({
        date: extracted.date || new Date().toISOString().split("T")[0],
        planned: plannedText,
        actual: actualText || "Session logged",
        notes: noteParts.join(" · "),
        analysis,
        felt: "good",
        extracted,
        image: `data:image/jpeg;base64,${imageB64}`,
      });

    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    }
    setAnalysing(false);
  }

  function confirmPending() {
    onAdd({
      id: Date.now(),
      date: pending.date,
      planned: pending.planned,
      actual: pending.actual,
      notes: pending.notes,
      analysis: pending.analysis,
      felt: pending.felt,
      images: pending.images,
    });
    setPending(null);
  }

  function submitManual() {
    if (!manual.actual.trim()) return;
    onAdd({ id: Date.now(), ...manual });
    setManual({ planned: "", actual: "", notes: "", felt: "good", date: new Date().toISOString().split("T")[0] });
    setShowManual(false);
  }

  return (
    <div style={{ padding: "14px 14px 80px", fontFamily: "'Courier New', monospace" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "3px" }}>WORKOUT LOG</div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>{log.length} sessions recorded</div>
        </div>
        <button onClick={() => setShowManual(!showManual)} style={{
          padding: "7px 12px", background: "transparent", border: "1px solid #1e293b",
          borderRadius: "6px", color: "#475569", fontSize: "10px", cursor: "pointer",
          fontFamily: "'Courier New', monospace", letterSpacing: "1px"
        }}>
          {showManual ? "CANCEL" : "+ MANUAL"}
        </button>
      </div>

      {/* Primary CTA — screenshot upload */}
      {!pending && !analysing && !showManual && (
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: "1px dashed #4ade8050", borderRadius: "10px", padding: "24px 16px",
            textAlign: "center", cursor: "pointer", marginBottom: "16px",
            background: "rgba(74,222,128,0.03)",
            transition: "background 0.2s",
          }}
        >
          <div style={{ fontSize: "32px", marginBottom: "8px" }}>📸</div>
          <div style={{ fontSize: "13px", color: "#4ade80", fontWeight: "bold", letterSpacing: "1px", marginBottom: "4px" }}>
            Upload Garmin Screenshot
          </div>
          <div style={{ fontSize: "10px", color: "#475569", lineHeight: 1.5 }}>
            Upload 1 or more screenshots (Overview, Stats, Laps…)<br/>AI combines them, matches to your plan and logs automatically
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleScreenshot} style={{ display: "none" }} />

      {/* Analysing state */}
      {analysing && (
        <div style={{ border: "1px solid #1e293b", borderRadius: "10px", padding: "24px 16px", textAlign: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "28px", marginBottom: "10px" }}>🔍</div>
          <div style={{ fontSize: "12px", color: "#4ade80", letterSpacing: "2px", marginBottom: "6px" }}>ANALYSING</div>
          <div style={{ fontSize: "10px", color: "#475569" }}>Reading your activity and comparing to training plan...</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid #ef444430", borderRadius: "8px", padding: "12px", marginBottom: "14px", fontSize: "11px", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* Pending confirmation card */}
      {pending && (
        <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid #4ade8040", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
          <div style={{ fontSize: "9px", color: "#4ade80", letterSpacing: "2px", marginBottom: "12px" }}>
            ✓ ANALYSED — {formatDate(pending.date)}
          </div>

          {/* Screenshot thumbnail */}
          {pending.images?.length > 0 && (
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px", overflowX: "auto" }}>
              {pending.images.map((src, i) => <img key={i} src={src} alt="" style={{ height: "80px", borderRadius: "4px", flexShrink: 0 }} />)}
            </div>
          )}

          {/* Planned vs Actual */}
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "7px", padding: "10px", marginBottom: "10px" }}>
            <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "1px", marginBottom: "3px" }}>PLANNED</div>
            <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px", lineHeight: 1.4 }}>{pending.planned}</div>
            <div style={{ fontSize: "9px", color: "#4ade80", letterSpacing: "1px", marginBottom: "3px" }}>ACTUAL</div>
            <div style={{ fontSize: "12px", color: "#e2e8f0", fontWeight: "bold", lineHeight: 1.4 }}>{pending.actual}</div>
            {pending.notes && <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>{pending.notes}</div>}
          </div>

          {/* AI Analysis */}
          {pending.analysis && (
            <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid #31286150", borderRadius: "7px", padding: "10px", marginBottom: "12px" }}>
              <div style={{ fontSize: "9px", color: "#818cf8", letterSpacing: "1px", marginBottom: "5px" }}>🤖 COACH ANALYSIS</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.6 }}>{pending.analysis}</div>
            </div>
          )}

          {/* How did it feel */}
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "1px", marginBottom: "8px" }}>HOW DID IT FEEL?</div>
          <div style={{ display: "flex", gap: "5px", marginBottom: "12px" }}>
            {Object.entries(feltEmoji).map(([key, emoji]) => (
              <button key={key} onClick={() => setPending(p => ({ ...p, felt: key }))} style={{
                flex: 1, padding: "7px 2px", border: `1px solid ${pending.felt === key ? feltColors[key] : "#1e293b"}`,
                borderRadius: "6px", background: pending.felt === key ? `${feltColors[key]}20` : "transparent",
                color: pending.felt === key ? feltColors[key] : "#334155",
                cursor: "pointer", fontSize: "15px", fontFamily: "'Courier New', monospace"
              }}>
                {emoji}
                <div style={{ fontSize: "7px", marginTop: "2px", letterSpacing: "0px" }}>{key}</div>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setPending(null)} style={{
              flex: 1, padding: "11px", background: "transparent", border: "1px solid #1e293b",
              borderRadius: "7px", color: "#475569", fontSize: "11px", cursor: "pointer",
              fontFamily: "'Courier New', monospace",
            }}>DISCARD</button>
            <button onClick={confirmPending} style={{
              flex: 2, padding: "11px", background: "#4ade80", border: "none",
              borderRadius: "7px", color: "#0a0a0f", fontSize: "11px", fontWeight: "bold",
              cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: "2px"
            }}>SAVE SESSION</button>
          </div>
        </div>
      )}

      {/* Manual entry form */}
      {showManual && (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "12px" }}>MANUAL ENTRY</div>
          {[
            { key: "date", label: "DATE", type: "date" },
            { key: "planned", label: "PLANNED", placeholder: "e.g. 10km tempo @ 5:30/km" },
            { key: "actual", label: "ACTUAL *", placeholder: "e.g. 10.2km @ 5:28/km avg, HR 176bpm" },
            { key: "notes", label: "NOTES", placeholder: "Fueling, how legs felt, anything notable..." },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "1px", marginBottom: "5px" }}>{f.label}</div>
              <input type={f.type || "text"} value={manual[f.key]}
                onChange={e => setManual(m => ({ ...m, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", padding: "9px 10px", color: "#e2e8f0", fontSize: "16px", fontFamily: "'Courier New', monospace", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          ))}
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "1px", marginBottom: "8px" }}>HOW DID IT FEEL?</div>
          <div style={{ display: "flex", gap: "5px", marginBottom: "12px" }}>
            {Object.entries(feltEmoji).map(([key, emoji]) => (
              <button key={key} onClick={() => setManual(m => ({ ...m, felt: key }))} style={{
                flex: 1, padding: "7px 2px", border: `1px solid ${manual.felt === key ? feltColors[key] : "#1e293b"}`,
                borderRadius: "6px", background: manual.felt === key ? `${feltColors[key]}20` : "transparent",
                color: manual.felt === key ? feltColors[key] : "#334155",
                cursor: "pointer", fontSize: "15px", fontFamily: "'Courier New', monospace"
              }}>
                {emoji}<div style={{ fontSize: "7px", marginTop: "2px" }}>{key}</div>
              </button>
            ))}
          </div>
          <button onClick={submitManual} style={{ width: "100%", padding: "11px", background: "#4ade80", border: "none", borderRadius: "7px", color: "#0a0a0f", fontSize: "11px", fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: "2px" }}>SAVE</button>
        </div>
      )}

      {/* Log entries */}
      {log.length === 0 && !showManual && !pending && !analysing && (
        <div style={{ textAlign: "center", padding: "30px 20px", color: "#334155", fontSize: "11px", lineHeight: 1.6 }}>
          No sessions logged yet.<br/>
          <span style={{ fontSize: "10px", color: "#1e293b" }}>Upload a Garmin screenshot after each workout<br/>and AI will do the rest.</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {[...log].reverse().map(entry => {
          const fc = feltColors[entry.felt] || "#475569";
          const fe = feltEmoji[entry.felt] || "✅";
          return (
            <div key={entry.id} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid #1e293b", borderLeft: `3px solid ${fc}`, borderRadius: "8px", padding: "11px 13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "1px" }}>{formatDate(entry.date)}</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "15px" }}>{fe}</span>
                  <button onClick={() => onDelete(entry.id)} style={{ background: "none", border: "none", color: "#1e293b", cursor: "pointer", fontSize: "11px", padding: "0 2px" }}>✕</button>
                </div>
              </div>
              {entry.planned && <div style={{ fontSize: "10px", color: "#334155", marginBottom: "2px" }}>PLAN: <span style={{ color: "#475569" }}>{entry.planned}</span></div>}
              <div style={{ fontSize: "11px", color: "#e2e8f0", fontWeight: "bold", marginBottom: entry.notes || entry.analysis ? "5px" : "0" }}>✓ {entry.actual}</div>
              {entry.notes && <div style={{ fontSize: "10px", color: "#64748b", lineHeight: 1.4, marginBottom: entry.analysis ? "6px" : "0" }}>{entry.notes}</div>}
              {entry.analysis && (
                <div style={{ background: "rgba(99,102,241,0.07)", borderRadius: "5px", padding: "7px 9px", fontSize: "10px", color: "#818cf8", lineHeight: 1.5 }}>
                  🤖 {entry.analysis}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
