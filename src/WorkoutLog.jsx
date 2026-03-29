import { useState } from "react";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(d) {
  const date = new Date(d);
  return `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export default function WorkoutLog({ log, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ planned: "", actual: "", notes: "", felt: "good" });

  function submit() {
    if (!form.actual.trim()) return;
    onAdd({
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      planned: form.planned,
      actual: form.actual,
      notes: form.notes,
      felt: form.felt,
    });
    setForm({ planned: "", actual: "", notes: "", felt: "good" });
    setShowForm(false);
  }

  const feltColors = { great: "#4ade80", good: "#60a5fa", ok: "#facc15", tough: "#f97316", bad: "#ef4444" };
  const feltEmoji = { great: "🔥", good: "✅", ok: "😐", tough: "😤", bad: "💀" };

  return (
    <div style={{ padding: "14px 14px 60px", fontFamily: "'Courier New', monospace" }}>

      {/* Header + Add button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "3px" }}>WORKOUT LOG</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{log.length} sessions recorded</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: "8px 14px", background: showForm ? "rgba(255,255,255,0.05)" : "#4ade80",
          border: `1px solid ${showForm ? "#1e293b" : "#4ade80"}`,
          borderRadius: "7px", color: showForm ? "#475569" : "#0a0a0f",
          fontSize: "11px", fontWeight: "bold", cursor: "pointer",
          fontFamily: "'Courier New', monospace", letterSpacing: "1px"
        }}>
          {showForm ? "CANCEL" : "+ LOG"}
        </button>
      </div>

      {/* Log form */}
      {showForm && (
        <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid #4ade8030", borderRadius: "10px", padding: "14px", marginBottom: "16px" }}>
          <div style={{ fontSize: "9px", color: "#4ade80", letterSpacing: "2px", marginBottom: "12px" }}>LOG TODAY'S SESSION — {formatDate(new Date())}</div>

          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "1px", marginBottom: "5px" }}>WHAT WAS PLANNED</div>
            <input value={form.planned} onChange={e => setForm(f => ({ ...f, planned: e.target.value }))}
              placeholder="e.g. 10km tempo @ 5:30/km"
              style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", padding: "8px 10px", color: "#e2e8f0", fontSize: "16px", fontFamily: "'Courier New', monospace", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "1px", marginBottom: "5px" }}>WHAT YOU ACTUALLY DID *</div>
            <input value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))}
              placeholder="e.g. 10km @ 5:28/km avg, HR 178bpm"
              style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", padding: "8px 10px", color: "#e2e8f0", fontSize: "16px", fontFamily: "'Courier New', monospace", outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "1px", marginBottom: "5px" }}>NOTES (injuries, nutrition, how body felt)</div>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Felt strong first 6km, legs tightened late. Took PH 1500 pre, one Carb 30 at 6km..."
              rows={2}
              style={{ width: "100%", background: "#0f172a", border: "1px solid #1e293b", borderRadius: "6px", padding: "8px 10px", color: "#e2e8f0", fontSize: "16px", fontFamily: "'Courier New', monospace", outline: "none", resize: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "1px", marginBottom: "8px" }}>HOW DID IT FEEL?</div>
            <div style={{ display: "flex", gap: "6px" }}>
              {Object.entries(feltEmoji).map(([key, emoji]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, felt: key }))} style={{
                  flex: 1, padding: "8px 4px", border: `1px solid ${form.felt === key ? feltColors[key] : "#1e293b"}`,
                  borderRadius: "6px", background: form.felt === key ? `${feltColors[key]}20` : "transparent",
                  color: form.felt === key ? feltColors[key] : "#334155",
                  cursor: "pointer", fontSize: "16px", fontFamily: "'Courier New', monospace"
                }}>{emoji}<div style={{ fontSize: "7px", letterSpacing: "0px", marginTop: "2px", textTransform: "uppercase" }}>{key}</div></button>
              ))}
            </div>
          </div>

          <button onClick={submit} style={{ width: "100%", padding: "11px", background: "#4ade80", border: "none", borderRadius: "7px", color: "#0a0a0f", fontSize: "11px", fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: "2px" }}>
            SAVE SESSION
          </button>
        </div>
      )}

      {/* Log entries */}
      {log.length === 0 && !showForm && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "#334155", fontSize: "12px" }}>
          No sessions logged yet.<br/>
          <span style={{ fontSize: "10px" }}>Tap + LOG after each workout to track progress.</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {[...log].reverse().map(entry => {
          const fc = feltColors[entry.felt] || "#475569";
          const fe = feltEmoji[entry.felt] || "✅";
          const hit = entry.actual && entry.planned;
          return (
            <div key={entry.id} style={{ background: "rgba(255,255,255,0.025)", border: `1px solid #1e293b`, borderLeft: `3px solid ${fc}`, borderRadius: "8px", padding: "11px 13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "1px" }}>{formatDate(entry.date + "T12:00:00")}</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span style={{ fontSize: "16px" }}>{fe}</span>
                  <button onClick={() => onDelete(entry.id)} style={{ background: "none", border: "none", color: "#1e293b", cursor: "pointer", fontSize: "12px", padding: "0 2px" }}>✕</button>
                </div>
              </div>
              {entry.planned && (
                <div style={{ fontSize: "10px", marginBottom: "3px" }}>
                  <span style={{ color: "#334155" }}>PLAN: </span>
                  <span style={{ color: "#64748b" }}>{entry.planned}</span>
                </div>
              )}
              <div style={{ fontSize: "11px", color: "#e2e8f0", marginBottom: entry.notes ? "5px" : "0", fontWeight: "bold" }}>
                ✓ {entry.actual}
              </div>
              {entry.notes && <div style={{ fontSize: "10px", color: "#64748b", lineHeight: 1.4 }}>{entry.notes}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
