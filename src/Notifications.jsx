import { useState, useEffect } from "react";

const NOTIF_SETTINGS_KEY = "ams_notif_settings";

const DEFAULT_SETTINGS = {
  enabled: false,
  morningReadiness: true,   // 7:30am daily
  mealNudge: true,          // 8pm if nothing logged
  weeklySummary: true,      // Sunday 8pm
};

function getSettings() {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(NOTIF_SETTINGS_KEY) || "{}") }; }
  catch { return DEFAULT_SETTINGS; }
}

function saveSettings(s) {
  localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(s));
}

async function requestPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

function scheduleNotifications(settings) {
  // Store schedule in localStorage — checked by the service worker / visibility handler
  const schedule = {
    morningReadiness: settings.morningReadiness ? "07:30" : null,
    mealNudge: settings.mealNudge ? "20:00" : null,
    weeklySummary: settings.weeklySummary ? "sunday:20:00" : null,
    lastChecked: null,
  };
  localStorage.setItem("ams_notif_schedule", JSON.stringify(schedule));
}

// Check and fire due notifications (called on app open/focus)
export function checkAndFireNotifications(workoutLog, photoLog) {
  const settings = getSettings();
  if (!settings.enabled || Notification.permission !== "granted") return;

  const schedule = JSON.parse(localStorage.getItem("ams_notif_schedule") || "{}");
  const now = new Date();
  const today = now.toDateString();
  const lastFired = JSON.parse(localStorage.getItem("ams_notif_fired") || "{}");

  // Morning readiness — fire between 7:15 and 10:00
  if (schedule.morningReadiness && now.getHours() >= 7 && now.getHours() < 10) {
    const key = `readiness_${today}`;
    if (!lastFired[key]) {
      new Notification("Morning check-in 🌅", {
        body: "How are you feeling today? Log your readiness to get today's recommendation.",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "readiness",
      });
      lastFired[key] = true;
      localStorage.setItem("ams_notif_fired", JSON.stringify(lastFired));
    }
  }

  // Meal nudge — fire after 8pm if no meals logged today
  if (schedule.mealNudge && now.getHours() >= 20) {
    const key = `meal_${today}`;
    if (!lastFired[key]) {
      const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      const loggedToday = photoLog && Object.keys(photoLog).some(k => k === todayKey && photoLog[k]?.length > 0);
      if (!loggedToday) {
        new Notification("Log your meals 📋", {
          body: "You haven't logged any meals today. Track your nutrition to hit your targets.",
          icon: "/icons/icon-192.png",
          tag: "meal_nudge",
        });
      }
      lastFired[key] = true;
      localStorage.setItem("ams_notif_fired", JSON.stringify(lastFired));
    }
  }

  // Weekly summary — Sunday after 8pm
  if (schedule.weeklySummary && now.getDay() === 0 && now.getHours() >= 20) {
    const weekKey = `week_${today}`;
    if (!lastFired[weekKey]) {
      new Notification("Weekly summary ready 📊", {
        body: "Your week is done. Head to the WEEK tab for your AI-generated summary.",
        icon: "/icons/icon-192.png",
        tag: "weekly_summary",
      });
      lastFired[weekKey] = true;
      localStorage.setItem("ams_notif_fired", JSON.stringify(lastFired));
    }
  }
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState(getSettings);
  const [permission, setPermission] = useState(Notification?.permission || "unsupported");
  const [enabling, setEnabling] = useState(false);

  const supported = "Notification" in window;

  async function enable() {
    setEnabling(true);
    const result = await requestPermission();
    setPermission(result);
    if (result === "granted") {
      const newSettings = { ...settings, enabled: true };
      setSettings(newSettings);
      saveSettings(newSettings);
      scheduleNotifications(newSettings);
    }
    setEnabling(false);
  }

  function updateSetting(key, value) {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
    if (newSettings.enabled) scheduleNotifications(newSettings);
  }

  function disable() {
    const newSettings = { ...settings, enabled: false };
    setSettings(newSettings);
    saveSettings(newSettings);
  }

  const NOTIFS = [
    { key: "morningReadiness", label: "Morning check-in", desc: "Daily at 7:30am — prompts you to log readiness", icon: "🌅" },
    { key: "mealNudge",        label: "Meal reminder",    desc: "8pm if you haven't logged meals today",        icon: "📋" },
    { key: "weeklySummary",    label: "Weekly summary",   desc: "Sunday at 8pm — time to review your week",    icon: "📊" },
  ];

  return (
    <div style={{ padding: "16px 14px", fontFamily: "'Courier New', monospace", color: "#e2e8f0" }}>
      <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "14px" }}>NOTIFICATIONS</div>

      {!supported && (
        <div style={{ fontSize: "11px", color: "#f97316", background: "rgba(249,115,22,0.08)", border: "1px solid #f9731630", borderRadius: "7px", padding: "10px 12px" }}>
          Notifications aren't supported in this browser. Add the app to your Home Screen first.
        </div>
      )}

      {supported && permission === "denied" && (
        <div style={{ fontSize: "11px", color: "#f97316", background: "rgba(249,115,22,0.08)", border: "1px solid #f9731630", borderRadius: "7px", padding: "10px 12px", marginBottom: "12px" }}>
          Notifications are blocked. Go to Settings → Safari → [this site] → Allow Notifications.
        </div>
      )}

      {supported && !settings.enabled && permission !== "denied" && (
        <button onClick={enable} disabled={enabling} style={{
          width: "100%", padding: "13px", marginBottom: "14px",
          background: "rgba(74,222,128,0.1)", border: "1px solid #4ade80",
          borderRadius: "8px", color: "#4ade80", fontSize: "12px",
          cursor: enabling ? "default" : "pointer",
          fontFamily: "'Courier New', monospace", fontWeight: "bold", letterSpacing: "2px",
        }}>{enabling ? "ENABLING…" : "🔔 ENABLE NOTIFICATIONS"}</button>
      )}

      {settings.enabled && (
        <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid #4ade8030", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "11px", color: "#4ade80" }}>🔔 Notifications active</div>
          <button onClick={disable} style={{ background: "transparent", border: "1px solid #1e293b", borderRadius: "5px", color: "#475569", fontSize: "9px", padding: "3px 10px", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>TURN OFF</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {NOTIFS.map(n => (
          <div key={n.key} style={{
            background: "rgba(255,255,255,0.02)", border: `1px solid ${settings[n.key] && settings.enabled ? "#1e3a5f" : "#1e293b"}`,
            borderRadius: "8px", padding: "11px 12px",
            opacity: settings.enabled ? 1 : 0.5,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>{n.icon}</span>
                <span style={{ fontSize: "11px", color: "#e2e8f0" }}>{n.label}</span>
              </div>
              {/* Toggle */}
              <div onClick={() => settings.enabled && updateSetting(n.key, !settings[n.key])}
                style={{
                  width: "38px", height: "22px", borderRadius: "11px",
                  background: settings[n.key] && settings.enabled ? "#4ade80" : "#1e293b",
                  position: "relative", cursor: settings.enabled ? "pointer" : "default",
                  transition: "background 0.2s", flexShrink: 0,
                }}>
                <div style={{
                  position: "absolute", top: "3px",
                  left: settings[n.key] && settings.enabled ? "19px" : "3px",
                  width: "16px", height: "16px", borderRadius: "50%",
                  background: "white", transition: "left 0.2s",
                }} />
              </div>
            </div>
            <div style={{ fontSize: "9px", color: "#334155", marginTop: "4px", paddingLeft: "24px" }}>{n.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "16px", fontSize: "9px", color: "#334155", lineHeight: 1.6 }}>
        ⚠ For notifications to work on iPhone, the app must be added to your Home Screen. Open in Safari → Share → Add to Home Screen.
      </div>
    </div>
  );
}
