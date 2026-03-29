import { useState, useRef, useEffect } from 'react'
import { dbGet, dbSet, dbGetAll, migrateFromLocalStorage } from './db.js'
import Login from './Login.jsx'
import App, { generateAllDays, calcDayMacros } from './App.jsx'
import AICoach from './AICoach.jsx'
import WorkoutLog from './WorkoutLog.jsx'
import Memory from './Memory.jsx'
import Recipes from './Recipes.jsx'
import Readiness from './Readiness.jsx'
import WeeklySummary from './WeeklySummary.jsx'
import ShoppingList from './ShoppingList.jsx'
import RaceSimulator from './RaceSimulator.jsx'

const CORE_TABS = [
  { id: "plan",    label: "PLAN",    icon: "📅" },
  { id: "ready",   label: "READY",   icon: "🌅" },
  { id: "log",     label: "LOG",     icon: "✍️" },
  { id: "week",    label: "WEEK",    icon: "📊" },
  { id: "coach",   label: "COACH",   icon: "🤖" },
];

const MORE_TABS = [
  { id: "shop",    label: "Shopping List",    icon: "🛒" },
  { id: "recipes", label: "Recipes",  icon: "🍳" },
  { id: "race",    label: "Race Simulator",    icon: "🏅" },
  { id: "memory",  label: "Notes",   icon: "🧠" },
];

export default function Root() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("ams_auth"));
  const [tab, setTab] = useState("plan");
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMore(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("touchstart", handleClick); };
  }, []);

  // Persistent state — all stored in localStorage
  const [memory, setMemory] = useState("");
  const [workoutLog, setWorkoutLog] = useState([]);
  const [dbReady, setDbReady] = useState(false);

  // Load all data from Supabase on mount, migrate localStorage if needed
  useEffect(() => {
    async function loadData() {
      await migrateFromLocalStorage();
      const all = await dbGetAll();
      if (all["ams_memory"]) setMemory(all["ams_memory"]);
      else setMemory(localStorage.getItem("ams_memory") || "");
      if (all["ams_log"]) setWorkoutLog(all["ams_log"]);
      else { try { setWorkoutLog(JSON.parse(localStorage.getItem("ams_log") || "[]")); } catch {} }
      setDbReady(true);
    }
    loadData();
  }, []);

  function saveMemory(text) {
    setMemory(text);
    localStorage.setItem("ams_memory", text);
    dbSet("ams_memory", text);
  }

  function addWorkout(entry) {
    const updated = [...workoutLog, entry];
    setWorkoutLog(updated);
    localStorage.setItem("ams_log", JSON.stringify(updated));
    dbSet("ams_log", updated);
  }

  function deleteWorkout(id) {
    const updated = workoutLog.filter(w => w.id !== id);
    setWorkoutLog(updated);
    localStorage.setItem("ams_log", JSON.stringify(updated));
    dbSet("ams_log", updated);
  }

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", fontFamily: "'Courier New', monospace" }}>

      {/* Top nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: "#0a0a0f", borderBottom: "1px solid #1e293b", display: "flex", height: "52px" }}>
        {CORE_TABS.map(t => {
          const isActive = tab === t.id;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setShowMore(false); }} style={{
              flex: 1, border: "none",
              borderBottom: isActive ? "2px solid #4ade80" : "2px solid transparent",
              background: "transparent", color: isActive ? "#4ade80" : "#334155",
              cursor: "pointer", fontFamily: "'Courier New', monospace",
              fontSize: "8px", letterSpacing: "0.5px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
              height: "52px", boxSizing: "border-box", padding: "4px 2px",
              transition: "color 0.15s",
            }}>
              <span style={{ fontSize: "17px" }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}

        {/* More button */}
        <div ref={moreRef} style={{ position: "relative", display: "flex" }}>
          <button onClick={() => setShowMore(s => !s)} style={{
            width: "52px", border: "none",
            borderBottom: MORE_TABS.some(t => t.id === tab) ? "2px solid #4ade80" : "2px solid transparent",
            background: "transparent",
            color: MORE_TABS.some(t => t.id === tab) ? "#4ade80" : showMore ? "#94a3b8" : "#334155",
            cursor: "pointer", fontFamily: "'Courier New', monospace",
            fontSize: "8px", letterSpacing: "0.5px",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
            height: "52px", boxSizing: "border-box", padding: "4px 2px",
          }}>
            <span style={{ fontSize: "17px" }}>⋯</span>
            MORE
          </button>

          {/* Dropdown */}
          {showMore && (
            <div style={{
              position: "absolute", top: "52px", right: 0,
              background: "#0d0d18", border: "1px solid #1e293b",
              borderRadius: "10px", overflow: "hidden", minWidth: "160px", zIndex: 30,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}>
              {MORE_TABS.map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setShowMore(false); }} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "12px",
                  padding: "13px 16px", border: "none",
                  borderBottom: "1px solid #1e293b",
                  background: tab === t.id ? "rgba(74,222,128,0.08)" : "transparent",
                  color: tab === t.id ? "#4ade80" : "#94a3b8",
                  cursor: "pointer", fontFamily: "'Courier New', monospace",
                  fontSize: "11px", letterSpacing: "1px", textAlign: "left",
                }}>
                  <span style={{ fontSize: "18px" }}>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab content */}
      {tab === "plan"    && <App />}
      {tab === "ready"   && <Readiness allDays={generateAllDays()} />}
      {tab === "week"    && <WeeklySummary allDays={generateAllDays()} workoutLog={workoutLog} />}
      {tab === "shop"    && <ShoppingList allDays={generateAllDays()} />}
      {tab === "race"    && <RaceSimulator />}
      {tab === "log"     && <WorkoutLog log={workoutLog} onAdd={addWorkout} onDelete={deleteWorkout} allDays={generateAllDays()} />}
      {tab === "recipes" && <Recipes allDays={generateAllDays()} />}
      {tab === "coach"   && <AICoach memory={memory} workoutLog={workoutLog} allDays={generateAllDays()} calcDayMacros={calcDayMacros} />}
      {tab === "memory"  && <Memory memory={memory} onSave={saveMemory} />}
    </div>
  );
}
