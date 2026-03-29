import { useState } from "react";

const PLAN_CONTEXT = `You are an elite marathon coach building a race day execution plan for Ross Hunter (39yo, 90kg, Amsterdam Marathon 18 Oct 2026). Stats: VO2max 43, LT 5:36/km, best marathon 4:37, recently ran 85km ultra. He's targeting sub-4:00 (5:41/km average). He uses Precision Hydration and is a heavy sweater.`;

const CONDITIONS = ["Cool & dry", "Warm & sunny", "Hot & humid", "Cold & windy", "Wet & rainy"];

export default function RaceSimulator() {
  const [targetTime, setTargetTime]   = useState("3:55");
  const [condition, setCondition]     = useState("Cool & dry");
  const [startTemp, setStartTemp]     = useState("12");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [activeKm, setActiveKm]       = useState(null);

  async function simulate() {
    const apiKey = localStorage.getItem("oai_key");
    if (!apiKey) { setError("No OpenAI key — add it in the Coach tab first."); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    const prompt = `${PLAN_CONTEXT}

RACE INPUTS:
- Target finish time: ${targetTime}
- Weather: ${condition}, ~${startTemp}°C at start
- Race: Amsterdam Marathon, 18 October 2026, flat course

Generate a detailed race execution plan. Include:
1. A km-by-km split table for every 5km (5, 10, 15, 20, 25, 30, 35, 40, 42.2) with target pace and cumulative time
2. 4 race phases with specific instructions (warm up / settle / race / finish)
3. Gel & hydration schedule (Precision Hydration specific — PH 1500 pre-race, PH Carb gels during, PH Caffeine gel at 30km)
4. 3 mental cues for tough moments (30km wall, etc.)
5. Pacing strategy note (negative split? even? surge?)

Respond ONLY as valid JSON, no markdown:
{
  "targetTime": "${targetTime}",
  "avgPace": "X:XX/km",
  "strategy": "One sentence pacing strategy",
  "phases": [
    { "km": "0–10", "label": "Settle In", "color": "#4ade80", "instruction": "..." },
    { "km": "10–25", "label": "Find Rhythm", "color": "#60a5fa", "instruction": "..." },
    { "km": "25–35", "label": "Race Begins", "color": "#facc15", "instruction": "..." },
    { "km": "35–42.2", "label": "Everything Left", "color": "#f97316", "instruction": "..." }
  ],
  "splits": [
    { "km": 5, "pace": "X:XX", "cumTime": "X:XX:XX", "note": "short tip" }
  ],
  "fueling": [
    { "km": 0, "action": "PH 1500 tablet in 500ml — drink 30 min before start", "type": "hydration" },
    { "km": 10, "action": "...", "type": "gel" | "hydration" | "caffeine" }
  ],
  "mentalCues": [
    { "km": 30, "cue": "..." },
    { "km": 35, "cue": "..." },
    { "km": 40, "cue": "..." }
  ],
  "weatherNote": "Any specific advice for ${condition} conditions"
}`;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o", max_tokens: 2000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.choices?.[0]?.message?.content || "";
      setResult(JSON.parse(text.replace(/```json|```/g, "").trim()));
    } catch (e) {
      setError(e.message || "Failed to generate. Try again.");
    }
    setLoading(false);
  }

  const phaseColor = km => {
    if (km <= 10) return "#4ade80";
    if (km <= 25) return "#60a5fa";
    if (km <= 35) return "#facc15";
    return "#f97316";
  };

  return (
    <div style={{ padding: "16px 14px 80px", fontFamily: "'Courier New', monospace", color: "#e2e8f0" }}>

      {/* Header */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "3px" }}>RACE DAY SIMULATOR</div>
        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f8fafc", marginTop: "2px" }}>Amsterdam Marathon</div>
        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>18 October 2026 · 42.2km</div>
      </div>

      {!result ? (
        <>
          {/* Target time */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "7px" }}>TARGET FINISH TIME</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["3:45","3:50","3:55","4:00","4:05","4:10"].map(t => (
                <button key={t} onClick={() => setTargetTime(t)} style={{
                  padding: "8px 14px", border: `1px solid ${targetTime === t ? "#818cf8" : "#1e293b"}`,
                  borderRadius: "6px", background: targetTime === t ? "rgba(129,140,248,0.15)" : "transparent",
                  color: targetTime === t ? "#818cf8" : "#475569", cursor: "pointer",
                  fontSize: "13px", fontFamily: "'Courier New', monospace", fontWeight: "bold",
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Weather */}
          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "7px" }}>CONDITIONS</div>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {CONDITIONS.map(c => (
                <button key={c} onClick={() => setCondition(c)} style={{
                  padding: "6px 10px", border: `1px solid ${condition === c ? "#60a5fa" : "#1e293b"}`,
                  borderRadius: "6px", background: condition === c ? "rgba(96,165,250,0.12)" : "transparent",
                  color: condition === c ? "#60a5fa" : "#475569", cursor: "pointer",
                  fontSize: "10px", fontFamily: "'Courier New', monospace",
                }}>{c}</button>
              ))}
            </div>
          </div>

          {/* Temperature */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "7px" }}>START TEMP (°C)</div>
            <div style={{ display: "flex", gap: "5px" }}>
              {["8","10","12","14","16","18","20"].map(t => (
                <button key={t} onClick={() => setStartTemp(t)} style={{
                  flex: 1, padding: "7px 4px",
                  border: `1px solid ${startTemp === t ? "#f97316" : "#1e293b"}`,
                  borderRadius: "6px", background: startTemp === t ? "rgba(249,115,22,0.12)" : "transparent",
                  color: startTemp === t ? "#f97316" : "#475569", cursor: "pointer",
                  fontSize: "11px", fontFamily: "'Courier New', monospace",
                }}>{t}°</button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid #ef444330", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px", fontSize: "11px", color: "#ef4444" }}>
              ⚠ {error}
            </div>
          )}

          <button onClick={simulate} disabled={loading} style={{
            width: "100%", padding: "14px",
            background: loading ? "rgba(255,255,255,0.03)" : "rgba(129,140,248,0.1)",
            border: `1px solid ${loading ? "#1e293b" : "#818cf8"}`,
            borderRadius: "8px", color: loading ? "#334155" : "#818cf8",
            fontSize: "12px", letterSpacing: "2px", cursor: loading ? "default" : "pointer",
            fontFamily: "'Courier New', monospace", fontWeight: "bold",
          }}>
            {loading ? "SIMULATING RACE…" : "🏅 SIMULATE RACE DAY"}
          </button>
        </>
      ) : (
        <div>
          {/* Verdict banner */}
          <div style={{ background: "rgba(129,140,248,0.1)", border: "1px solid #818cf8", borderRadius: "12px", padding: "16px", marginBottom: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "2px", marginBottom: "4px" }}>TARGET</div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#818cf8" }}>{result.targetTime}</div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Avg {result.avgPace} · {result.strategy}</div>
          </div>

          {/* Weather note */}
          {result.weatherNote && (
            <div style={{ background: "rgba(96,165,250,0.07)", border: "1px solid #60a5fa20", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px" }}>
              <div style={{ fontSize: "9px", color: "#60a5fa", letterSpacing: "2px", marginBottom: "4px" }}>WEATHER NOTE</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.6 }}>{result.weatherNote}</div>
            </div>
          )}

          {/* Race phases */}
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "8px" }}>RACE PHASES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
            {result.phases?.map((p, i) => (
              <div key={i} style={{ background: `${p.color}08`, border: `1px solid ${p.color}30`, borderRadius: "8px", padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "bold", color: p.color }}>{p.label}</span>
                  <span style={{ fontSize: "10px", color: "#334155" }}>km {p.km}</span>
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5 }}>{p.instruction}</div>
              </div>
            ))}
          </div>

          {/* Splits table */}
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "8px" }}>SPLITS · Tap for tip</div>
          <div style={{ border: "1px solid #1e293b", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
            {result.splits?.map((s, i) => {
              const col = phaseColor(s.km);
              return (
                <div key={i} onClick={() => setActiveKm(activeKm === s.km ? null : s.km)} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "9px 12px", borderBottom: i < result.splits.length - 1 ? "1px solid #0f172a" : "none",
                  cursor: "pointer", background: activeKm === s.km ? `${col}10` : "transparent",
                }}>
                  <div style={{ minWidth: "36px", fontSize: "12px", fontWeight: "bold", color: col }}>
                    {s.km}km
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "#e2e8f0" }}>{s.pace}/km</div>
                    {activeKm === s.km && (
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "3px", lineHeight: 1.4 }}>{s.note}</div>
                    )}
                  </div>
                  <div style={{ fontSize: "11px", color: "#475569", textAlign: "right" }}>{s.cumTime}</div>
                </div>
              );
            })}
          </div>

          {/* Fueling */}
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "8px" }}>FUELING SCHEDULE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "16px" }}>
            {result.fueling?.map((f, i) => {
              const fCol = f.type === "caffeine" ? "#f97316" : f.type === "gel" ? "#facc15" : "#38bdf8";
              return (
                <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: "7px", padding: "8px 11px" }}>
                  <div style={{ minWidth: "36px", fontSize: "11px", fontWeight: "bold", color: fCol }}>{f.km}km</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5 }}>{f.action}</div>
                </div>
              );
            })}
          </div>

          {/* Mental cues */}
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "8px" }}>MENTAL CUES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "18px" }}>
            {result.mentalCues?.map((c, i) => (
              <div key={i} style={{ background: "rgba(129,140,248,0.05)", border: "1px solid #818cf820", borderRadius: "7px", padding: "8px 11px", display: "flex", gap: "10px" }}>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#818cf8", minWidth: "36px" }}>{c.km}km</div>
                <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5, fontStyle: "italic" }}>"{c.cue}"</div>
              </div>
            ))}
          </div>

          <button onClick={() => setResult(null)} style={{
            width: "100%", padding: "12px", background: "transparent",
            border: "1px solid #1e293b", borderRadius: "8px", color: "#475569",
            fontSize: "11px", letterSpacing: "2px", cursor: "pointer",
            fontFamily: "'Courier New', monospace",
          }}>
            ↺ SIMULATE AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
