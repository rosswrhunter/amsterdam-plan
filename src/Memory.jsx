import { useState } from "react";
import NotificationSettings from "./Notifications.jsx";

export default function Memory({ memory, onSave }) {
  const [text, setText] = useState(memory);
  const [saved, setSaved] = useState(false);

  function save() {
    onSave(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ padding: "14px 14px 60px", fontFamily: "'Courier New', monospace" }}>
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "3px", marginBottom: "4px" }}>COACH MEMORY</div>
        <div style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.5 }}>
          Anything here is sent to your AI coach every time you chat. Use it for injuries, how you're feeling, upcoming races, life context, dietary restrictions — anything relevant.
        </div>
      </div>

      <textarea
        value={text}
        onChange={e => { setText(e.target.value); setSaved(false); }}
        placeholder={`Examples:\n- Left knee niggle since March — nothing serious but monitor\n- Work is very stressful in April, may miss sessions\n- Sleep usually 6-7hrs, trying to improve\n- Don't eat meat\n- Upcoming trip to London 12-14 May\n- Body Battery rarely gets above 70`}
        rows={14}
        style={{
          width: "100%", background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: "8px", padding: "12px", color: "#e2e8f0",
          fontSize: "11px", fontFamily: "'Courier New', monospace",
          outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6
        }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
        <div style={{ fontSize: "10px", color: "#334155" }}>{text.length} chars · stored locally</div>
        <button onClick={save} style={{
          padding: "9px 20px",
          background: saved ? "rgba(74,222,128,0.15)" : "#4ade80",
          border: `1px solid ${saved ? "#4ade80" : "transparent"}`,
          borderRadius: "7px", color: saved ? "#4ade80" : "#0a0a0f",
          fontSize: "11px", fontWeight: "bold", cursor: "pointer",
          fontFamily: "'Courier New', monospace", letterSpacing: "1px",
          transition: "all 0.2s"
        }}>
          {saved ? "✓ SAVED" : "SAVE"}
        </button>
      </div>

      <div style={{ marginTop: "20px", background: "rgba(99,102,241,0.07)", border: "1px solid #312e81", borderRadius: "8px", padding: "12px" }}>
        <div style={{ fontSize: "9px", color: "#818cf8", letterSpacing: "2px", marginBottom: "8px" }}>WHAT TO INCLUDE</div>
        {[
          "Injuries or niggles — even minor ones",
          "Sleep quality and patterns",
          "Stress levels at work or home",
          "Travel or schedule disruptions",
          "Dietary preferences or restrictions",
          "How your body responds to hard sessions",
          "Garmin trends you've noticed",
          "Previous injury history",
        ].map(tip => (
          <div key={tip} style={{ fontSize: "10px", color: "#64748b", padding: "3px 0", lineHeight: 1.4 }}>→ {tip}</div>
        ))}
      </div>

      <div style={{ marginTop: "20px" }}>
        <NotificationSettings />
      </div>
    </div>
  );
}
