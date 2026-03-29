import { useState, useEffect } from "react";
import { dbGet, dbSet } from "./db.js";
import { calcDayMacros } from "./App.jsx";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getWeekBounds(offset = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23,59,59,999);
  return { monday, sunday };
}

function fmt(d) { return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

export default function WeeklySummary({ allDays, workoutLog }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [weight, setWeight] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ams_weights") || "[]"); } catch { return []; }
  });
  useEffect(() => {
    dbGet("ams_weights").then(v => { if (v) setWeight(v); });
  }, []);
  const [weightInput, setWeightInput] = useState("");
  const [showWeightInput, setShowWeightInput] = useState(false);

  const { monday, sunday } = getWeekBounds(weekOffset);
  const { monday: nextMon, sunday: nextSun } = getWeekBounds(weekOffset + 1);

  // This week's plan days
  const weekDays = allDays.filter(d => d.date >= monday && d.date <= sunday);
  const nextWeekDays = allDays.filter(d => d.date >= nextMon && d.date <= nextSun);

  // Planned km this week
  const plannedKm = weekDays.reduce((s, d) => s + (d.km || 0), 0);
  const nextPlannedKm = nextWeekDays.reduce((s, d) => s + (d.km || 0), 0);

  // Logged sessions this week
  const weekLogs = workoutLog.filter(l => {
    const d = new Date(l.date + "T12:00:00");
    return d >= monday && d <= sunday;
  });

  // Average daily deficit this week
  const avgDeficit = weekDays.length
    ? Math.round(weekDays.reduce((s, d) => s + calcDayMacros(d.macroDay, d.km, d.phase?.name).deficit, 0) / weekDays.length)
    : 0;

  const weekPhase = weekDays[0]?.phase?.name || "BASE";
  const nextPhase = nextWeekDays[0]?.phase?.name || "BASE";

  // Weight trend
  const recentWeights = weight.slice(-7);
  const latestWeight = recentWeights[recentWeights.length - 1]?.w;
  const firstWeight = recentWeights[0]?.w;
  const weightChange = latestWeight && firstWeight ? (latestWeight - firstWeight).toFixed(1) : null;

  function saveWeight() {
    const w = parseFloat(weightInput);
    if (!w || w < 40 || w > 200) return;
    const today = dateKey(new Date());
    const updated = [...weight.filter(x => x.date !== today), { date: today, w }].sort((a,b) => a.date.localeCompare(b.date));
    setWeight(updated);
    localStorage.setItem("ams_weights", JSON.stringify(updated));
    dbSet("ams_weights", updated);
    setWeightInput("");
    setShowWeightInput(false);
  }

  async function generateSummary() {
    const apiKey = localStorage.getItem("oai_key");
    if (!apiKey) return;
    setLoading(true);
    setSummary(null);

    const logSummary = weekLogs.length
      ? weekLogs.map(l => `${l.date}: ${l.actual} — felt ${l.felt}${l.analysis ? ` | coach: ${l.analysis.slice(0,100)}` : ""}`).join("\n")
      : "No sessions logged this week";

    const nextWeekSessions = nextWeekDays.map(d => `${DAYS[d.date.getDay()]}: ${d.type}${d.km ? ` ${d.km}km` : ""}`).join(", ");

    const prompt = `You are writing a weekly training summary for Ross Hunter, 39yo marathon runner training for Amsterdam Marathon 18 Oct 2026 (sub-4:00 goal, currently ${latestWeight || 90}kg, target 75-78kg).

WEEK: ${fmt(monday)} – ${fmt(sunday)}
Phase: ${weekPhase}
Planned km: ${plannedKm}km
Avg daily deficit: ~${avgDeficit} kcal
${weightChange ? `Weight change this week: ${weightChange}kg` : "No weight data logged"}
Sessions logged: ${weekLogs.length}

SESSION DATA:
${logSummary}

NEXT WEEK PREVIEW (${nextPhase} phase): ${nextWeekSessions}
Next week planned km: ${nextPlannedKm}km

Write an engaging, personal weekly summary that Ross would genuinely enjoy reading on a Sunday. Include:
1. A punchy headline (like a coach would say)
2. 2-3 sentences on how the week went — honest, specific, motivating
3. One key win or learning from the week
4. What to focus on next week — specific to the sessions coming up
5. A one-liner to close — something that makes him want to lace up Monday

Keep it conversational, direct, not corporate. Like a great coach texting you. Max 200 words total.

Respond as JSON:
{"headline":"...","body":"...","keyWin":"...","nextWeekFocus":"...","closing":"..."}`;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o", max_tokens: 600,
          messages: [
            { role: "system", content: "You are a JSON API. Respond only with a valid JSON object, no markdown." },
            { role: "user", content: prompt }
          ]
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      const cleaned = text.replace(/```json|```/g, "").trim();
      setSummary(JSON.parse(cleaned));
    } catch (e) {
      setSummary({ headline: "Error", body: "Couldn't generate summary. Try again.", keyWin: "", nextWeekFocus: "", closing: "" });
    }
    setLoading(false);
  }

  const phaseColors = { BASE: "#4ade80", BUILD: "#facc15", PEAK: "#f97316", TAPER: "#818cf8" };
  const col = phaseColors[weekPhase] || "#4ade80";
  const nextCol = phaseColors[nextPhase] || "#4ade80";

  return (
    <div style={{ padding: "16px 14px 80px", fontFamily: "'Courier New', monospace", color: "#e2e8f0" }}>

      {/* Header + week nav */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "3px" }}>WEEKLY SUMMARY</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
          <button onClick={() => { setWeekOffset(w => w - 1); setSummary(null); }} style={{ background: "transparent", border: "1px solid #1e293b", borderRadius: "6px", color: "#475569", padding: "5px 10px", cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: "12px" }}>‹</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#e2e8f0" }}>{fmt(monday)} – {fmt(sunday)}</div>
            <div style={{ fontSize: "9px", color: col, letterSpacing: "2px", marginTop: "2px" }}>{weekPhase} PHASE</div>
          </div>
          <button onClick={() => { setWeekOffset(w => w + 1); setSummary(null); }} disabled={weekOffset >= 0} style={{ background: "transparent", border: "1px solid #1e293b", borderRadius: "6px", color: weekOffset >= 0 ? "#1e293b" : "#475569", padding: "5px 10px", cursor: weekOffset >= 0 ? "default" : "pointer", fontFamily: "'Courier New', monospace", fontSize: "12px" }}>›</button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
        {[
          { label: "PLANNED KM", value: `${plannedKm}km`, color: col },
          { label: "LOGGED", value: `${weekLogs.length} sessions`, color: "#60a5fa" },
          { label: "AVG DEFICIT", value: `${avgDeficit} kcal`, color: "#4ade80" },
          { label: "WEIGHT", value: latestWeight ? `${latestWeight}kg` : "—", color: "#facc15" },
        ].map(s => (
          <div key={s.label} style={{ flex: "1 1 calc(50% - 4px)", background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 12px" }}>
            <div style={{ fontSize: "8px", color: "#475569", letterSpacing: "2px" }}>{s.label}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: s.color, marginTop: "3px" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Weight log */}
      <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px", marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px" }}>WEIGHT LOG</div>
          <button onClick={() => setShowWeightInput(s => !s)} style={{ background: "transparent", border: "1px solid #1e293b", borderRadius: "5px", color: "#475569", fontSize: "9px", padding: "2px 8px", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>
            + LOG TODAY
          </button>
        </div>
        {showWeightInput && (
          <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
            <input value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder="e.g. 89.4"
              style={{ flex: 1, padding: "7px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b", borderRadius: "6px", color: "#e2e8f0", fontSize: "14px", fontFamily: "'Courier New', monospace", outline: "none" }} />
            <span style={{ color: "#475569", alignSelf: "center", fontSize: "11px" }}>kg</span>
            <button onClick={saveWeight} style={{ padding: "7px 14px", background: "rgba(250,204,21,0.15)", border: "1px solid #facc15", borderRadius: "6px", color: "#facc15", fontSize: "11px", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>SAVE</button>
          </div>
        )}
        {recentWeights.length > 0 ? (
          <div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {recentWeights.slice(-7).map((w, i) => (
                <div key={i} style={{ fontSize: "10px", color: "#64748b" }}>
                  <span style={{ color: "#334155" }}>{w.date.slice(5)}</span> <span style={{ color: "#facc15", fontWeight: "bold" }}>{w.w}kg</span>
                </div>
              ))}
            </div>
            {weightChange && (
              <div style={{ fontSize: "11px", marginTop: "8px", color: parseFloat(weightChange) < 0 ? "#4ade80" : "#f97316" }}>
                {parseFloat(weightChange) < 0 ? "↓" : "↑"} {Math.abs(weightChange)}kg this week · target 75–78kg by Oct
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: "10px", color: "#334155" }}>No weight data yet — log your morning weight daily for trend tracking</div>
        )}
      </div>

      {/* This week's sessions */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "8px" }}>THIS WEEK</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {weekDays.map((d, i) => {
            const logged = weekLogs.find(l => l.date === dateKey(d.date));
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px", background: logged ? "rgba(74,222,128,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${logged ? "#4ade8030" : "#0f172a"}`, borderRadius: "6px" }}>
                <div style={{ minWidth: "32px", fontSize: "9px", color: "#475569" }}>{DAYS[d.date.getDay()]}</div>
                <div style={{ flex: 1, fontSize: "10px", color: d.preferred ? "#94a3b8" : "#334155" }}>{d.icon} {d.type}{d.km ? ` · ${d.km}km` : ""}</div>
                {logged && <div style={{ fontSize: "9px", color: "#4ade80" }}>✓</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Summary */}
      <button onClick={generateSummary} disabled={loading} style={{
        width: "100%", padding: "13px",
        background: loading ? "rgba(255,255,255,0.02)" : `${col}15`,
        border: `1px solid ${loading ? "#1e293b" : col}`,
        borderRadius: "8px", color: loading ? "#334155" : col,
        fontSize: "12px", letterSpacing: "2px", cursor: loading ? "default" : "pointer",
        fontFamily: "'Courier New', monospace", fontWeight: "bold", marginBottom: "14px",
      }}>
        {loading ? "GENERATING…" : "✦ GENERATE WEEK SUMMARY"}
      </button>

      {summary && (
        <div style={{ marginBottom: "18px" }}>
          <div style={{ background: `${col}10`, border: `1px solid ${col}30`, borderRadius: "12px", padding: "16px", marginBottom: "10px" }}>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: col, marginBottom: "10px", lineHeight: 1.3 }}>{summary.headline}</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.7, marginBottom: "12px" }}>{summary.body}</div>
            {summary.keyWin && (
              <div style={{ background: "rgba(74,222,128,0.08)", border: "1px solid #4ade8025", borderRadius: "6px", padding: "8px 12px", marginBottom: "8px" }}>
                <div style={{ fontSize: "8px", color: "#4ade80", letterSpacing: "2px", marginBottom: "3px" }}>KEY WIN</div>
                <div style={{ fontSize: "11px", color: "#e2e8f0" }}>{summary.keyWin}</div>
              </div>
            )}
          </div>

          {/* Next week */}
          <div style={{ background: `${nextCol}08`, border: `1px solid ${nextCol}25`, borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
            <div style={{ fontSize: "9px", color: nextCol, letterSpacing: "2px", marginBottom: "6px" }}>NEXT WEEK · {nextPhase}</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.6 }}>{summary.nextWeekFocus}</div>
          </div>

          <div style={{ padding: "12px 14px", borderLeft: `3px solid ${col}`, background: "rgba(255,255,255,0.02)", borderRadius: "0 6px 6px 0" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>"{summary.closing}"</div>
          </div>
        </div>
      )}
    </div>
  );
}
