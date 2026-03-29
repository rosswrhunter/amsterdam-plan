import { useState } from 'react'
import Login from './Login.jsx'
import App, { generateAllDays, calcDayMacros } from './App.jsx'
import AICoach from './AICoach.jsx'
import WorkoutLog from './WorkoutLog.jsx'
import Memory from './Memory.jsx'

const TABS = [
  { id: "plan",   label: "PLAN",   icon: "📅" },
  { id: "log",    label: "LOG",    icon: "✍️" },
  { id: "coach",  label: "COACH",  icon: "🤖" },
  { id: "memory", label: "NOTES",  icon: "🧠" },
];

export default function Root() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("ams_auth"));
  const [tab, setTab] = useState("plan");

  // Persistent state — all stored in localStorage
  const [memory, setMemory] = useState(() => localStorage.getItem("ams_memory") || "");
  const [workoutLog, setWorkoutLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ams_log") || "[]"); } catch { return []; }
  });

  function saveMemory(text) {
    setMemory(text);
    localStorage.setItem("ams_memory", text);
  }

  function addWorkout(entry) {
    const updated = [...workoutLog, entry];
    setWorkoutLog(updated);
    localStorage.setItem("ams_log", JSON.stringify(updated));
  }

  function deleteWorkout(id) {
    const updated = workoutLog.filter(w => w.id !== id);
    setWorkoutLog(updated);
    localStorage.setItem("ams_log", JSON.stringify(updated));
  }

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", fontFamily: "'Courier New', monospace" }}>

      {/* Top nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#0a0a0f",
        borderBottom: "1px solid #1e293b",
        display: "flex",
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px 4px 10px",
            border: "none",
            borderBottom: tab === t.id ? "2px solid #4ade80" : "2px solid transparent",
            background: "transparent",
            color: tab === t.id ? "#4ade80" : "#334155",
            cursor: "pointer", fontFamily: "'Courier New', monospace",
            fontSize: "9px", letterSpacing: "1.5px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
            transition: "color 0.15s",
          }}>
            <span style={{ fontSize: "16px" }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "plan"   && <App />}
      {tab === "log"    && <WorkoutLog log={workoutLog} onAdd={addWorkout} onDelete={deleteWorkout} allDays={generateAllDays()} />}
      {tab === "coach"  && <AICoach memory={memory} workoutLog={workoutLog} allDays={generateAllDays()} calcDayMacros={calcDayMacros} />}
      {tab === "memory" && <Memory memory={memory} onSave={saveMemory} />}
    </div>
  );
}
