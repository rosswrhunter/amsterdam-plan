import { useState, useEffect } from "react";

const BASE_VO2MAX = 43;
const BASE_LT_PACE = 5.6; // min/km (5:36)
const TARGET_PACE = 5.683; // min/km (5:41 = sub-4:00)
const RACE_DATE = new Date(2026, 9, 18);

function paceToSeconds(paceStr) {
  if (!paceStr) return null;
  const clean = paceStr.replace("/km", "").trim();
  const parts = clean.split(":");
  if (parts.length !== 2) return null;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function secondsToPace(s) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function finishTimeFromPace(paceSecs) {
  const totalSecs = paceSecs * 42.195;
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = Math.round(totalSecs % 60);
  return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function analyseLog(workoutLog) {
  const sessions = workoutLog.filter(l => {
    const actual = l.actual || "";
    return actual.includes("/km") && actual.includes("km");
  });

  if (sessions.length === 0) return null;

  // Extract pace and distance from actual string like "10.2 km · 58:32 · @ 5:44/km · HR 172bpm"
  const parsed = sessions.map(l => {
    const actual = l.actual || "";
    const paceMatch = actual.match(/@ (\d+:\d+)\/km/);
    const distMatch = actual.match(/([\d.]+)\s*km/);
    const hrMatch = actual.match(/HR (\d+)bpm/);
    const pace = paceMatch ? paceToSeconds(paceMatch[1]) : null;
    const dist = distMatch ? parseFloat(distMatch[1]) : null;
    const hr = hrMatch ? parseInt(hrMatch[1]) : null;
    return { pace, dist, hr, date: l.date, felt: l.felt, type: l.planned || "" };
  }).filter(s => s.pace && s.dist);

  if (parsed.length === 0) return null;

  // Categorise sessions
  const tempoSessions = parsed.filter(s => s.pace < 340 && s.dist >= 8); // faster than 5:40/km
  const easySessions = parsed.filter(s => s.pace >= 340 && s.pace < 420); // 5:40–7:00/km
  const longRuns = parsed.filter(s => s.dist >= 15);

  // Estimate LT from tempo sessions (LT is roughly tempo pace - 10–15s)
  let ltPaceEst = null;
  if (tempoSessions.length > 0) {
    const avgTempo = tempoSessions.reduce((s, x) => s + x.pace, 0) / tempoSessions.length;
    ltPaceEst = avgTempo + 12; // LT slightly slower than tempo
  }

  // Estimate aerobic fitness from easy HR (lower HR at same pace = better fitness)
  let aerobicTrend = null;
  if (easySessions.length >= 3) {
    const recent = easySessions.slice(-3);
    const older = easySessions.slice(0, Math.max(1, easySessions.length - 3));
    if (older.length > 0) {
      const recentAvgHR = recent.filter(s => s.hr).reduce((s, x) => s + x.hr, 0) / recent.filter(s => s.hr).length;
      const olderAvgHR = older.filter(s => s.hr).reduce((s, x) => s + x.hr, 0) / older.filter(s => s.hr).length;
      if (recentAvgHR && olderAvgHR) {
        aerobicTrend = olderAvgHR - recentAvgHR; // positive = improving
      }
    }
  }

  // Project marathon pace
  // Base: use LT if available, else use current training data
  let projectedMarathonPace;
  if (ltPaceEst) {
    // Marathon pace is typically LT pace + 20–30s
    projectedMarathonPace = ltPaceEst + 22;
  } else if (easySessions.length >= 2) {
    // Rough estimate from easy pace (marathon is ~80-85% of easy effort improvement)
    const avgEasy = easySessions.reduce((s, x) => s + x.pace, 0) / easySessions.length;
    projectedMarathonPace = avgEasy - 60; // roughly
  } else {
    projectedMarathonPace = TARGET_PACE * 60;
  }

  // Adjust for aerobic trend
  if (aerobicTrend && aerobicTrend > 2) {
    projectedMarathonPace -= Math.min(10, aerobicTrend * 1.5);
  }

  const daysToRace = Math.max(0, Math.floor((RACE_DATE - new Date()) / (1000 * 60 * 60 * 24)));
  const weeksToRace = Math.floor(daysToRace / 7);

  // Project improvement over remaining weeks (roughly 1-2s/km per week of quality training)
  const improvementFactor = Math.min(30, weeksToRace * 1.2);
  const projectedRacePace = projectedMarathonPace - improvementFactor;

  return {
    sessions: parsed.length,
    tempoSessions: tempoSessions.length,
    longRuns: longRuns.length,
    ltPaceEst: ltPaceEst ? secondsToPace(ltPaceEst) : null,
    currentProjectedPace: secondsToPace(Math.round(projectedMarathonPace)),
    raceProjectedPace: secondsToPace(Math.round(projectedRacePace)),
    currentFinishTime: finishTimeFromPace(projectedMarathonPace),
    raceFinishTime: finishTimeFromPace(projectedRacePace),
    aerobicTrend,
    weeksToRace,
    daysToRace,
    latestSessions: parsed.slice(-5).reverse(),
  };
}

export default function RacePredictor({ workoutLog }) {
  const [aiInsight, setAiInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const prediction = analyseLog(workoutLog || []);
  const target = 4 * 3600; // 4:00:00 in seconds
  const daysToRace = Math.max(0, Math.floor((RACE_DATE - new Date()) / (1000 * 60 * 60 * 24)));

  function parseFinishSecs(timeStr) {
    const parts = timeStr.split(":").map(Number);
    return parts[0]*3600 + parts[1]*60 + (parts[2]||0);
  }

  async function getAiInsight() {
    const apiKey = localStorage.getItem("oai_key");
    if (!apiKey || !prediction) return;
    setLoading(true);
    try {
      const prompt = `You are a marathon coach analysing training data for Ross Hunter (39yo, 90kg, target sub-4:00 Amsterdam Marathon 18 Oct 2026, ${daysToRace} days away).

Training data from ${prediction.sessions} logged sessions:
- Tempo sessions: ${prediction.tempoSessions}
- Long runs: ${prediction.longRuns}
- Estimated LT pace: ${prediction.ltPaceEst || "insufficient data"}
- Current projected marathon pace: ${prediction.currentProjectedPace}/km (${prediction.currentFinishTime})
- Race day projection (with ${prediction.weeksToRace} weeks training remaining): ${prediction.raceProjectedPace}/km (${prediction.raceFinishTime})
- Aerobic trend: ${prediction.aerobicTrend ? (prediction.aerobicTrend > 0 ? `improving (HR down ${prediction.aerobicTrend.toFixed(1)}bpm)` : `declining (HR up ${Math.abs(prediction.aerobicTrend).toFixed(1)}bpm)`) : "insufficient data"}

Recent sessions: ${prediction.latestSessions.map(s => `${s.dist}km @ ${secondsToPace(s.pace)}/km${s.hr ? ` HR${s.hr}` : ""}`).join(", ")}

Give Ross a direct, specific 3-sentence analysis:
1. Where he's at vs the sub-4:00 target
2. The one thing that will make the biggest difference between now and race day
3. A specific training recommendation for this week

Be honest — if he's on track say so, if he needs to push say so. No waffle.`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-4o", max_tokens: 250, messages: [{ role: "user", content: prompt }] }),
      });
      const data = await res.json();
      setAiInsight(data.choices?.[0]?.message?.content || "");
    } catch (e) {}
    setLoading(false);
  }

  const targetPaceStr = "5:41";
  const sub4color = "#818cf8";

  return (
    <div style={{ padding: "16px 14px 80px", fontFamily: "'Courier New', monospace", color: "#e2e8f0" }}>

      {/* Header */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "3px" }}>RACE PREDICTOR</div>
        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f8fafc", marginTop: "2px" }}>Amsterdam Marathon</div>
        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>18 Oct 2026 · {daysToRace} days away</div>
      </div>

      {/* Countdown */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {[
          { label: "DAYS", value: daysToRace },
          { label: "WEEKS", value: Math.floor(daysToRace / 7) },
          { label: "TARGET", value: "Sub-4:00" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: "rgba(129,140,248,0.08)", border: "1px solid #818cf820", borderRadius: "8px", padding: "10px 8px", textAlign: "center" }}>
            <div style={{ fontSize: "8px", color: "#475569", letterSpacing: "2px" }}>{s.label}</div>
            <div style={{ fontSize: s.label === "TARGET" ? "14px" : "22px", fontWeight: "bold", color: sub4color, marginTop: "3px" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {!prediction ? (
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: "10px", padding: "24px 16px", textAlign: "center" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>📊</div>
          <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>No training data yet</div>
          <div style={{ fontSize: "10px", color: "#334155", lineHeight: 1.6 }}>Log sessions in the LOG tab after your runs.<br/>The predictor updates automatically as you train.</div>
        </div>
      ) : (
        <>
          {/* Projection cards */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "8px" }}>PROJECTION</div>
            <div style={{ display: "flex", gap: "8px" }}>
              {/* Current */}
              <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "8px", color: "#475569", letterSpacing: "2px", marginBottom: "6px" }}>IF RACE WAS TODAY</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: parseFinishSecs(prediction.currentFinishTime) < target ? "#4ade80" : "#f97316" }}>
                  {prediction.currentFinishTime}
                </div>
                <div style={{ fontSize: "10px", color: "#475569", marginTop: "3px" }}>{prediction.currentProjectedPace}/km</div>
              </div>
              {/* Race day */}
              <div style={{ flex: 1, background: "rgba(129,140,248,0.08)", border: "1px solid #818cf830", borderRadius: "10px", padding: "12px" }}>
                <div style={{ fontSize: "8px", color: sub4color, letterSpacing: "2px", marginBottom: "6px" }}>RACE DAY (18 OCT)</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: parseFinishSecs(prediction.raceFinishTime) < target ? "#4ade80" : "#facc15" }}>
                  {prediction.raceFinishTime}
                </div>
                <div style={{ fontSize: "10px", color: "#475569", marginTop: "3px" }}>{prediction.raceProjectedPace}/km</div>
              </div>
            </div>

            {/* vs target bar */}
            <div style={{ marginTop: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontSize: "9px", color: "#475569", letterSpacing: "1px" }}>PACE vs TARGET ({targetPaceStr}/km)</span>
                <span style={{ fontSize: "10px", fontWeight: "bold", color: sub4color }}>{prediction.raceProjectedPace}/km</span>
              </div>
              {(() => {
                const raceSecs = paceToSeconds(prediction.raceProjectedPace);
                const targetSecs = TARGET_PACE * 60;
                const diff = raceSecs - targetSecs;
                const absDiff = Math.abs(diff);
                const isFaster = diff < 0;
                return (
                  <div>
                    <div style={{ background: "#1e293b", borderRadius: "3px", height: "6px", position: "relative" }}>
                      <div style={{ position: "absolute", left: "60%", top: "-2px", width: "2px", height: "10px", background: "#818cf8" }} />
                      <div style={{ background: isFaster ? "#4ade80" : "#facc15", borderRadius: "3px", height: "6px", width: `${Math.min(100, Math.max(10, 60 + (isFaster ? absDiff : -absDiff) * 2))}%` }} />
                    </div>
                    <div style={{ fontSize: "9px", color: isFaster ? "#4ade80" : "#facc15", marginTop: "5px" }}>
                      {isFaster ? `${secondsToPace(absDiff)} faster than target 🎯` : `${secondsToPace(absDiff)} slower than target — keep pushing`}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Training metrics */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "8px" }}>FROM YOUR TRAINING</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                { label: "SESSIONS LOGGED", value: prediction.sessions },
                { label: "TEMPO RUNS", value: prediction.tempoSessions },
                { label: "LONG RUNS", value: prediction.longRuns },
                { label: "EST. LT PACE", value: prediction.ltPaceEst || "—" },
                { label: "AEROBIC TREND", value: prediction.aerobicTrend ? (prediction.aerobicTrend > 0 ? `↑ ${prediction.aerobicTrend.toFixed(1)}bpm` : `↓ ${Math.abs(prediction.aerobicTrend).toFixed(1)}bpm`) : "—",
                  color: prediction.aerobicTrend > 2 ? "#4ade80" : prediction.aerobicTrend < -2 ? "#f97316" : "#475569" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: "6px", padding: "8px 10px", minWidth: "calc(50% - 3px)", flex: "1 1 calc(50% - 3px)" }}>
                  <div style={{ fontSize: "8px", color: "#475569", letterSpacing: "1px" }}>{s.label}</div>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: s.color || "#e2e8f0", marginTop: "2px" }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent sessions */}
          {prediction.latestSessions.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "8px" }}>RECENT SESSIONS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {prediction.latestSessions.map((s, i) => {
                  const paceColor = s.pace < 340 ? "#f97316" : s.pace < 390 ? "#60a5fa" : "#4ade80";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid #0f172a", borderRadius: "6px" }}>
                      <div style={{ fontSize: "11px", fontWeight: "bold", color: paceColor, minWidth: "46px" }}>{secondsToPace(s.pace)}/km</div>
                      <div style={{ fontSize: "10px", color: "#475569" }}>{s.dist}km</div>
                      {s.hr && <div style={{ fontSize: "10px", color: "#475569" }}>HR {s.hr}</div>}
                      <div style={{ fontSize: "9px", color: "#334155", marginLeft: "auto" }}>{s.date}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Coach insight */}
          <button onClick={getAiInsight} disabled={loading} style={{
            width: "100%", padding: "13px",
            background: loading ? "rgba(255,255,255,0.02)" : "rgba(129,140,248,0.1)",
            border: `1px solid ${loading ? "#1e293b" : "#818cf8"}`,
            borderRadius: "8px", color: loading ? "#334155" : "#818cf8",
            fontSize: "12px", letterSpacing: "2px", cursor: loading ? "default" : "pointer",
            fontFamily: "'Courier New', monospace", fontWeight: "bold", marginBottom: "12px",
          }}>
            {loading ? "ANALYSING…" : "🤖 GET COACH INSIGHT"}
          </button>

          {aiInsight && (
            <div style={{ background: "rgba(129,140,248,0.06)", border: "1px solid #818cf825", borderRadius: "10px", padding: "14px" }}>
              <div style={{ fontSize: "9px", color: "#818cf8", letterSpacing: "2px", marginBottom: "8px" }}>COACH ANALYSIS</div>
              <div style={{ fontSize: "12px", color: "#94a3b8", lineHeight: 1.7 }}>{aiInsight}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
