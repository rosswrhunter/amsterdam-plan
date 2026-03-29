import { useState, useRef, useEffect } from "react";

const RACE_DATE = new Date(2026, 9, 18);
const START_DATE = new Date(2026, 2, 30);

const phases = [
  { name: "BASE",  color: "#4ade80", start: new Date(2026,2,30), end: new Date(2026,4,25) },
  { name: "BUILD", color: "#facc15", start: new Date(2026,4,26), end: new Date(2026,6,20) },
  { name: "PEAK",  color: "#f97316", start: new Date(2026,6,21), end: new Date(2026,8,14) },
  { name: "TAPER", color: "#818cf8", start: new Date(2026,8,15), end: new Date(2026,9,18) },
];

const macroData = {
  hard: {
    label: "Hard Training Day", color: "#f97316", kcal: 2800, protein: 155, carbs: 355, fat: 80,
    note: "Burns ~3,300 kcal. Carbs before & after your run.",
    meals: [
      { meal: "Breakfast", food: "Oats 100g + banana + 2 eggs + Greek yogurt 150g", p: 35, c: 105, f: 13 },
      { meal: "Pre-run", food: "2 rice cakes + honey + banana", p: 3, c: 50, f: 1 },
      { meal: "Lunch", food: "Rice 250g cooked + chicken 180g + veg", p: 52, c: 90, f: 8 },
      { meal: "Snack", food: "Cottage cheese 200g + apple + rice cake", p: 26, c: 35, f: 4 },
      { meal: "Dinner", food: "Salmon 180g + large sweet potato + green veg", p: 44, c: 55, f: 20 },
      { meal: "Evening", food: "Greek yogurt 200g or casein shake", p: 24, c: 15, f: 5 },
    ]
  },
  easy: {
    label: "Easy Run Day", color: "#60a5fa", kcal: 2400, protein: 155, carbs: 255, fat: 78,
    note: "Burns ~2,900 kcal. Moderate carbs, whole foods.",
    meals: [
      { meal: "Breakfast", food: "3 eggs + wholegrain toast x2 + fruit + yogurt 100g", p: 33, c: 60, f: 15 },
      { meal: "Lunch", food: "Chicken 150g + quinoa 180g cooked + salad + olive oil", p: 48, c: 70, f: 18 },
      { meal: "Snack", food: "Almonds + protein shake", p: 30, c: 10, f: 15 },
      { meal: "Dinner", food: "Lean beef 180g + roasted veg + rice 150g cooked", p: 46, c: 65, f: 16 },
      { meal: "Evening", food: "Greek yogurt 150g", p: 15, c: 10, f: 4 },
    ]
  },
  active: {
    label: "Pilates / Strength Day", color: "#4ade80", kcal: 2200, protein: 155, carbs: 195, fat: 80,
    note: "Burns ~2,700 kcal. Lower carbs, high protein, lots of veg.",
    meals: [
      { meal: "Breakfast", food: "3 eggs + smoked salmon + avocado ½ + greens", p: 35, c: 5, f: 22 },
      { meal: "Lunch", food: "Large salad + tuna 180g + chickpeas 120g + olive oil", p: 46, c: 45, f: 18 },
      { meal: "Snack", food: "Protein shake + handful walnuts", p: 30, c: 8, f: 18 },
      { meal: "Dinner", food: "Chicken thighs 220g + roasted veg + lentils 120g + rice 100g", p: 50, c: 55, f: 15 },
      { meal: "Evening", food: "Cottage cheese 200g", p: 24, c: 8, f: 4 },
    ]
  },
  rest: {
    label: "Rest Day", color: "#818cf8", kcal: 2000, protein: 155, carbs: 140, fat: 75,
    note: "Burns ~2,500 kcal (dog walks help!). Keep carbs low, protein high.",
    meals: [
      { meal: "Breakfast", food: "Greek yogurt 200g + berries + 3 boiled eggs", p: 38, c: 25, f: 14 },
      { meal: "Lunch", food: "Large salad + grilled chicken 180g + chickpeas 80g + olive oil", p: 48, c: 30, f: 18 },
      { meal: "Snack", food: "Protein shake + celery/cucumber", p: 25, c: 5, f: 3 },
      { meal: "Dinner", food: "White fish 220g + steamed broccoli + medium sweet potato", p: 48, c: 35, f: 8 },
      { meal: "Evening", food: "Cottage cheese 150g", p: 20, c: 5, f: 3 },
    ]
  }
};

function MacroBar({ value, max, color }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: "3px", height: "5px", flex: 1 }}>
      <div style={{ background: color, borderRadius: "3px", height: "5px", width: `${Math.min(100,(value/max)*100)}%` }} />
    </div>
  );
}

function MacroPanel({ macroDay }) {
  const m = macroData[macroDay];
  return (
    <div style={{ marginTop: "10px", borderTop: `1px solid ${m.color}30`, paddingTop: "10px" }}>
      {/* Macro bars */}
      <div style={{ background: `${m.color}10`, border: `1px solid ${m.color}25`, borderRadius: "8px", padding: "10px 12px", marginBottom: "8px" }}>
        <div style={{ fontSize: "9px", color: m.color, letterSpacing: "2px", marginBottom: "8px" }}>{m.label.toUpperCase()} · {m.note}</div>
        {[
          { name: "KCAL", value: m.kcal, unit: "", max: 3000, color: m.color },
          { name: "PROTEIN", value: m.protein, unit: "g", max: 200, color: "#60a5fa" },
          { name: "CARBS", value: m.carbs, unit: "g", max: 400, color: "#facc15" },
          { name: "FAT", value: m.fat, unit: "g", max: 120, color: "#f97316" },
        ].map(bar => (
          <div key={bar.name} style={{ marginBottom: "7px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
              <span style={{ fontSize: "9px", color: "#64748b", letterSpacing: "1px" }}>{bar.name}</span>
              <span style={{ fontSize: "10px", fontWeight: "bold", color: bar.color }}>{bar.value}{bar.unit}</span>
            </div>
            <MacroBar value={bar.value} max={bar.max} color={bar.color} />
          </div>
        ))}
      </div>
      {/* Meals */}
      <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "6px" }}>MEALS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {m.meals.map(meal => (
          <div key={meal.meal} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: "6px", padding: "7px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span style={{ fontSize: "9px", color: m.color, letterSpacing: "1px" }}>{meal.meal.toUpperCase()}</span>
              <span style={{ fontSize: "9px", color: "#475569" }}>P:{meal.p} C:{meal.c} F:{meal.f}</span>
            </div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>{meal.food}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getPhase(date) {
  for (const p of phases) if (date >= p.start && date <= p.end) return p;
  return phases[phases.length - 1];
}

function getWeekInPhase(date, phase) {
  return Math.floor((date - phase.start) / (7 * 24 * 60 * 60 * 1000));
}

function getDayActivity(date, phase, weekInPhase) {
  if (date.toDateString() === RACE_DATE.toDateString()) {
    return { type: "RACE DAY 🏅", detail: "Amsterdam Marathon! Start conservative 5:50/km. Race hard from 30km.", icon: "🏅", macroDay: "hard", preferred: true };
  }
  const dow = date.getDay();
  const progress = Math.min(weekInPhase / 7, 1);

  if (phase.name === "BASE") {
    const longKm = Math.round(18 + progress * 6);
    const easyKm = Math.round(8 + progress * 2);
    const friKm  = Math.round(6 + progress * 2);
    switch(dow) {
      case 1: return { type: "Easy Run", detail: `${easyKm}km @ 6:30–6:45/km Zone 2`, icon: "🏃", macroDay: "easy", preferred: true };
      case 2: return { type: "Rest / Walk", detail: "10,000 steps. Mobility & stretching.", icon: "🚶", macroDay: "rest", preferred: false };
      case 3: return { type: "Tempo", detail: "10km: 2km warm up + 5km @ 5:25–5:30/km + cooldown", icon: "⚡", macroDay: "hard", preferred: true };
      case 4: return { type: "Strength", detail: "Optional: 30min — glutes, single-leg, core", icon: "💪", macroDay: "active", preferred: false };
      case 5: return { type: "Strength + Easy", detail: `45min strength + ${friKm}km easy @ 6:40/km`, icon: "🏋️", macroDay: "easy", preferred: true };
      case 6: return { type: "Long Run", detail: `${longKm}km @ 6:20–6:30/km easy`, icon: "🌅", macroDay: "hard", preferred: true };
      case 0: return { type: "Reformer Pilates", detail: "Full class. Glutes, hip flexors, core.", icon: "🧘", macroDay: "active", preferred: true };
    }
  }
  if (phase.name === "BUILD") {
    const longKm = Math.round(26 + progress * 4);
    const easyKm = Math.round(10 + progress * 2);
    const mpKm   = Math.round(5 + progress * 3);
    const totalMp = Math.round(10 + progress * 4);
    switch(dow) {
      case 1: return { type: "Easy Run", detail: `${easyKm}km @ 6:20–6:30/km Zone 2`, icon: "🏃", macroDay: "easy", preferred: true };
      case 2: return { type: "Rest / Optional", detail: "Easy 6km if Body Battery >60, otherwise rest", icon: "🚶", macroDay: "rest", preferred: false };
      case 3: return { type: "Threshold", detail: "14km: warm up + 3×3km @ 5:20/km (90s rest) + cooldown", icon: "⚡", macroDay: "hard", preferred: true };
      case 4: return { type: "Strength", detail: "Strength — single-leg, core, glutes", icon: "💪", macroDay: "active", preferred: false };
      case 5: return { type: "Marathon Pace", detail: `${totalMp}km with ${mpKm}km @ 5:41/km in the middle`, icon: "🎯", macroDay: "hard", preferred: true };
      case 6: return { type: "Long Run", detail: `${longKm}km @ 6:15–6:25/km, last 5km @ 5:50/km`, icon: "🌅", macroDay: "hard", preferred: true };
      case 0: return { type: "Reformer Pilates", detail: "Full class. Essential after Saturday long run.", icon: "🧘", macroDay: "active", preferred: true };
    }
  }
  if (phase.name === "PEAK") {
    const longKm = Math.min(28 + Math.round(progress * 4), 32);
    const mpKm   = Math.round(8 + progress * 4);
    switch(dow) {
      case 1: return { type: "Easy Run", detail: "12km @ 6:20/km Zone 2", icon: "🏃", macroDay: "easy", preferred: true };
      case 2: return { type: "Optional Easy", detail: "8km easy or rest. Check Body Battery first.", icon: "🚶", macroDay: "rest", preferred: false };
      case 3: return { type: "Intervals", detail: "12km: 6×1km @ 5:05/km (2min rest) + warm up/cooldown", icon: "⚡", macroDay: "hard", preferred: true };
      case 4: return { type: "Strength", detail: "40min strength. Start reducing in final weeks.", icon: "💪", macroDay: "active", preferred: false };
      case 5: return { type: "Tempo", detail: "16km: warm up + 10km @ 5:20/km + cooldown", icon: "🎯", macroDay: "hard", preferred: true };
      case 6: return { type: "Peak Long Run", detail: `${longKm}km. Last ${mpKm}km @ 5:41/km marathon pace.`, icon: "🌅", macroDay: "hard", preferred: true };
      case 0: return { type: "Reformer Pilates", detail: "Full class. Keeps you mobile through peak stress.", icon: "🧘", macroDay: "active", preferred: true };
    }
  }
  if (phase.name === "TAPER") {
    const daysToRace = Math.floor((RACE_DATE - date) / (24*60*60*1000));
    const nextDay = new Date(date); nextDay.setDate(nextDay.getDate()+1);
    const isRaceEve = nextDay.toDateString() === RACE_DATE.toDateString();
    switch(dow) {
      case 1: return { type: "Easy Run", detail: daysToRace > 14 ? "10km easy @ 6:20/km" : "8km easy. Short and relaxed.", icon: "🏃", macroDay: "easy", preferred: true };
      case 2: return { type: "Rest", detail: "Full rest. Trust your training.", icon: "😴", macroDay: "rest", preferred: false };
      case 3: return { type: "Sharpener", detail: daysToRace > 14 ? "10km: warm up + 4×1km @ 5:41/km + cooldown" : "8km: warm up + 3×1km @ 5:41/km + cooldown", icon: "⚡", macroDay: "easy", preferred: true };
      case 4: return { type: "Rest", detail: "Rest. Walk only.", icon: "😴", macroDay: "rest", preferred: false };
      case 5: return { type: "Easy Strides", detail: "5km easy + 4×100m strides. Stay sharp.", icon: "🏃", macroDay: "easy", preferred: true };
      case 6:
        if (isRaceEve) return { type: "Rest", detail: "Race eve 🍝 Pasta dinner, early sleep, bib pinned.", icon: "🍝", macroDay: "hard", preferred: true };
        return { type: "Long Run", detail: daysToRace > 21 ? "22km easy — last big effort" : "14km easy", icon: "🌅", macroDay: "hard", preferred: true };
      case 0: return { type: "Reformer Pilates", detail: "Full class. Keep the routine through taper.", icon: "🧘", macroDay: "active", preferred: true };
    }
  }
  return { type: "Rest", detail: "Rest", icon: "😴", macroDay: "rest", preferred: false };
}

const macroCals  = { hard: 2800, easy: 2400, active: 2200, rest: 2000 };
const macroColor = { hard: "#f97316", easy: "#60a5fa", active: "#4ade80", rest: "#818cf8" };
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function generateAllDays() {
  const days = [];
  const cur = new Date(START_DATE);
  while (cur <= RACE_DATE) {
    const phase = getPhase(cur);
    const wip   = getWeekInPhase(cur, phase);
    const act   = getDayActivity(new Date(cur), phase, wip);
    days.push({ date: new Date(cur), phase, ...act });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export default function DayByDayPlan() {
  const allDays = generateAllDays();
  const [filter, setFilter] = useState("ALL");
  const [expanded, setExpanded] = useState(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (startRef.current) startRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const filtered = filter === "ALL" ? allDays : allDays.filter(d => d.phase.name === filter);

  const byMonth = {};
  filtered.forEach(day => {
    const key = `${day.date.getFullYear()}-${String(day.date.getMonth()).padStart(2,"0")}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(day);
  });

  const firstDay = new Date(2026, 2, 30);

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", fontFamily: "'Courier New', monospace", color: "#e2e8f0" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)", borderBottom: "1px solid #1e293b", padding: "22px 18px 14px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ fontSize: "10px", letterSpacing: "4px", color: "#4ade80", marginBottom: "4px" }}>AMSTERDAM MARATHON 2026</div>
        <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f8fafc", letterSpacing: "-0.5px" }}>Day by Day Plan</div>
        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>30 Mar → 18 Oct · {allDays.length} days · Tap any day for nutrition</div>
        <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
          {["ALL","BASE","BUILD","PEAK","TAPER"].map(f => {
            const ph = phases.find(p => p.name === f);
            const col = ph ? ph.color : "#94a3b8";
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "5px 11px", border: `1px solid ${filter === f ? col : "#1e293b"}`,
                borderRadius: "6px", background: filter === f ? `${col}20` : "transparent",
                color: filter === f ? col : "#475569", cursor: "pointer",
                fontSize: "10px", letterSpacing: "2px", fontFamily: "'Courier New', monospace",
              }}>{f}</button>
            );
          })}
        </div>
      </div>

      {/* Day list */}
      <div style={{ padding: "14px 14px 60px" }}>
        {Object.entries(byMonth).sort().map(([key, days]) => {
          const [yr, mo] = key.split("-");
          return (
            <div key={key}>
              <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "4px", padding: "18px 0 8px", borderBottom: "1px solid #1e293b", marginBottom: "8px" }}>
                {MONTHS[parseInt(mo)].toUpperCase()} {yr}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "4px" }}>
                {days.map((day, i) => {
                  const dayKey = day.date.toDateString();
                  const isFirst   = day.date.toDateString() === firstDay.toDateString();
                  const isRace    = day.date.toDateString() === RACE_DATE.toDateString();
                  const isOpen    = expanded === dayKey;
                  const mc        = macroColor[day.macroDay];

                  return (
                    <div key={i} ref={isFirst ? startRef : null}
                      onClick={() => setExpanded(isOpen ? null : dayKey)}
                      style={{
                        background: isRace ? "rgba(129,140,248,0.12)" : isFirst ? "rgba(74,222,128,0.07)" : day.preferred ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.008)",
                        border: `1px solid ${isOpen ? mc : isRace ? "#818cf8" : isFirst ? "#4ade8060" : day.preferred ? "#1e293b" : "#0f172a"}`,
                        borderLeft: `3px solid ${day.phase.color}`,
                        borderRadius: "8px", padding: "9px 12px",
                        cursor: "pointer", transition: "border-color 0.15s",
                      }}>

                      {/* Top row */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        {/* Date */}
                        <div style={{ minWidth: "42px" }}>
                          <div style={{ fontSize: "9px", color: isFirst ? "#4ade80" : "#475569", letterSpacing: "1px" }}>{DAYS[day.date.getDay()].toUpperCase()}</div>
                          <div style={{ fontSize: "17px", fontWeight: "bold", color: isFirst ? "#4ade80" : isRace ? "#818cf8" : day.preferred ? "#e2e8f0" : "#334155", lineHeight: 1.1 }}>
                            {day.date.getDate()}
                          </div>
                          {isFirst && <div style={{ fontSize: "7px", color: "#4ade80", letterSpacing: "1px" }}>TODAY</div>}
                          {isRace  && <div style={{ fontSize: "7px", color: "#818cf8", letterSpacing: "1px" }}>RACE</div>}
                        </div>

                        {/* Icon */}
                        <div style={{ fontSize: "15px", paddingTop: "2px", minWidth: "18px" }}>{day.icon}</div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: day.preferred ? "#e2e8f0" : "#2d3748", letterSpacing: "0.3px" }}>
                              {day.type}
                              {!day.preferred && <span style={{ fontSize: "8px", color: "#1e3a5f", marginLeft: "5px" }}>OPT</span>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                              <div style={{ fontSize: "9px", color: mc, background: `${mc}18`, padding: "2px 6px", borderRadius: "4px" }}>
                                {macroCals[day.macroDay]} kcal
                              </div>
                              <div style={{ fontSize: "10px", color: "#334155" }}>{isOpen ? "▲" : "▼"}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: "10px", color: day.preferred ? "#64748b" : "#1e293b", lineHeight: 1.4, marginTop: "2px" }}>
                            {day.detail}
                          </div>
                        </div>
                      </div>

                      {/* Expanded nutrition panel */}
                      {isOpen && <MacroPanel macroDay={day.macroDay} />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
