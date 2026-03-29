import { useState } from "react";

const USERS = [
  { username: "ross", password: "amsterdam2026" },
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  function handleSubmit() {
    const match = USERS.find(u => u.username === username.toLowerCase() && u.password === password);
    if (match) {
      localStorage.setItem("ams_auth", "1");
      onLogin();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div style={{
      background: "#0a0a0f", minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Courier New', monospace",
    }}>
      <div style={{
        width: "100%", maxWidth: "340px", padding: "0 24px",
        animation: shake ? "shake 0.4s ease" : "none",
      }}>
        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-6px); }
            80% { transform: translateX(6px); }
          }
          input:-webkit-autofill {
            -webkit-box-shadow: 0 0 0 30px #0f172a inset !important;
            -webkit-text-fill-color: #e2e8f0 !important;
          }
        `}</style>

        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ fontSize: "32px", marginBottom: "10px" }}>🏅</div>
          <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#4ade80", marginBottom: "6px" }}>AMSTERDAM MARATHON 2026</div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f8fafc" }}>Training Plan</div>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "6px" }}>USERNAME</div>
          <input
            value={username}
            onChange={e => { setUsername(e.target.value); setError(false); }}
            onKeyDown={handleKey}
            autoComplete="username"
            style={{
              width: "100%", background: "#0f172a", border: `1px solid ${error ? "#ef4444" : "#1e293b"}`,
              borderRadius: "8px", padding: "12px 14px", color: "#e2e8f0",
              fontSize: "13px", fontFamily: "'Courier New', monospace",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "6px" }}>PASSWORD</div>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false); }}
            onKeyDown={handleKey}
            autoComplete="current-password"
            style={{
              width: "100%", background: "#0f172a", border: `1px solid ${error ? "#ef4444" : "#1e293b"}`,
              borderRadius: "8px", padding: "12px 14px", color: "#e2e8f0",
              fontSize: "13px", fontFamily: "'Courier New', monospace",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div style={{ fontSize: "11px", color: "#ef4444", textAlign: "center", marginBottom: "16px", letterSpacing: "1px" }}>
            Invalid credentials
          </div>
        )}

        <button
          onClick={handleSubmit}
          style={{
            width: "100%", padding: "13px", background: "#4ade80",
            border: "none", borderRadius: "8px", color: "#0a0a0f",
            fontSize: "12px", fontWeight: "bold", letterSpacing: "3px",
            fontFamily: "'Courier New', monospace", cursor: "pointer",
          }}
        >
          LOGIN
        </button>
      </div>
    </div>
  );
}
