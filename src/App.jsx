import { useState, useRef, useEffect } from "react";
import { dbGet, dbSet } from "./db.js";

const RACE_DATE = new Date(2026, 9, 18);
const START_DATE = new Date(2026, 2, 28);

const phases = [
  { name: "BASE",  color: "#4ade80", start: new Date(2026,2,28), end: new Date(2026,4,25) },
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
      { meal: "Snack", food: "Greek yogurt 200g + apple + rice cake", p: 26, c: 35, f: 4 },
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
      { meal: "Lunch", food: "Large salad + grilled chicken 150g + chickpeas 120g + olive oil", p: 46, c: 45, f: 18 },
      { meal: "Snack", food: "Protein shake + handful walnuts", p: 30, c: 8, f: 18 },
      { meal: "Dinner", food: "Chicken thighs 220g + roasted veg + lentils 120g + rice 100g", p: 50, c: 55, f: 15 },
      { meal: "Evening", food: "Greek yogurt 200g", p: 24, c: 8, f: 4 },
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
      { meal: "Evening", food: "Greek yogurt 150g", p: 20, c: 5, f: 3 },
    ]
  },
  longrun: {
    label: "Long Run Day", color: "#a78bfa", kcal: 3800, protein: 160, carbs: 520, fat: 85,
    note: "Burns ~4,500–5,000 kcal (29km = ~2,600 kcal run alone at 90kg). Eat big. This is your highest carb day.",
    meals: [
      { meal: "Breakfast (90 min pre)", food: "Oats 150g + 2 bananas + honey + 2 eggs", p: 38, c: 165, f: 14 },
      { meal: "During run", food: "PH Carb 30/90 gels every 40 min + PH 1500 (see fueling tab)", p: 4, c: 90, f: 2 },
      { meal: "Post-run (within 30 min)", food: "Chocolate milk 500ml + banana + protein shake", p: 40, c: 80, f: 10 },
      { meal: "Lunch", food: "Rice 300g cooked + chicken 200g + roasted veg + olive oil", p: 55, c: 100, f: 16 },
      { meal: "Snack", food: "Bagel + peanut butter + Greek yogurt 150g", p: 28, c: 55, f: 18 },
      { meal: "Dinner", food: "Salmon 200g + large pasta 150g dry + veg + olive oil", p: 48, c: 95, f: 22 },
      { meal: "Evening", food: "Casein shake or Greek yogurt 200g", p: 26, c: 10, f: 4 },
    ]
  },
  preload: {
    label: "Pre-Long Run Day (Carb Load)", color: "#c084fc", kcal: 2900, protein: 155, carbs: 420, fat: 70,
    note: "Tomorrow is a long run. Load carbs tonight — especially dinner. Reduce fat and fibre so your gut is clear.",
    meals: [
      { meal: "Breakfast", food: "Oats 100g + banana + honey + Greek yogurt 150g", p: 30, c: 115, f: 8 },
      { meal: "Lunch", food: "Rice 250g cooked + chicken 180g + veg (low fibre)", p: 50, c: 90, f: 8 },
      { meal: "Snack", food: "Rice cakes x3 + jam + banana", p: 5, c: 65, f: 1 },
      { meal: "Dinner ⭐", food: "LARGE pasta 200g dry + tomato sauce + lean chicken 150g. This is your most important meal.", p: 48, c: 130, f: 10 },
      { meal: "Evening", food: "Greek yogurt 200g + honey + granola 50g", p: 22, c: 55, f: 8 },
    ]
  },
};


// Scale static meal macros proportionally to match dynamic day targets
function scaleMeals(meals, targetP, targetC, targetF) {
  const totalP = meals.reduce((s, m) => s + m.p, 0);
  const totalC = meals.reduce((s, m) => s + m.c, 0);
  const totalF = meals.reduce((s, m) => s + m.f, 0);
  if (!totalP || !totalC || !totalF) return meals;
  const scaleP = targetP / totalP;
  const scaleC = targetC / totalC;
  const scaleF = targetF / totalF;
  return meals.map(m => ({
    ...m,
    p: Math.round(m.p * scaleP),
    c: Math.round(m.c * scaleC),
    f: Math.round(m.f * scaleF),
  }));
}


const fuelingPlans = {
  easy_long: {
    color: "#38bdf8", label: "Light Fueling",
    steps: [
      { time: "Night before", action: "PH 1000 tablet in 500ml water before bed" },
      { time: "30 min pre-run", action: "500ml water + PH 1000 tablet" },
      { time: "During", action: "Carry 500ml PH 1000, sip every 15 min" },
      { time: "Post-run", action: "500ml water + PH 1000 to rehydrate" },
    ],
    note: "You sweat a lot — even easy runs over 60 min need electrolytes, especially in summer."
  },
  tempo: {
    color: "#fb923c", label: "Tempo Fueling",
    steps: [
      { time: "Night before", action: "PH 1000 tablet in 500ml water" },
      { time: "60 min pre", action: "Oats + banana" },
      { time: "15 min pre", action: "500ml water + PH 1500 tablet — go straight to 1500, heavy sweater" },
      { time: "During", action: "500ml PH 1500 on hand. Sip every 10–15 min. No gel needed for 10km." },
      { time: "Post-run", action: "PH 1000 in 500ml within 30 min + protein meal" },
    ],
    note: "PH 1500 for tempo — your high sweat rate means you need max sodium even on shorter hard sessions."
  },
  intervals: {
    color: "#fb923c", label: "Interval Fueling",
    steps: [
      { time: "Night before", action: "PH 1000 tablet in 500ml water" },
      { time: "60 min pre", action: "Carb-rich meal — oats, banana, toast" },
      { time: "15 min pre", action: "500ml water + PH 1500 tablet" },
      { time: "During", action: "Bottle of PH 1500 nearby. Sip between reps, not during." },
      { time: "Post", action: "PH 1000 + protein shake within 30 min" },
    ],
    note: "Short but brutal. Pre-hydrate well — you will sweat heavily in a short window."
  },
  long_base: {
    color: "#a78bfa", label: "Long Run Fueling (Base Phase)",
    steps: [
      { time: "Night before", action: "PH 1500 in 500ml water + carb-heavy dinner" },
      { time: "Morning", action: "Oats 100g + banana + 2 eggs. Eat 90 min before start." },
      { time: "15 min pre", action: "500ml PH 1500 tablet" },
      { time: "45 min in", action: "First PH Carb 30 gel. Small, easy to take, won't spike your stomach." },
      { time: "Every 45 min after", action: "PH Carb 30 gel + 200–300ml PH 1500. Steady and consistent." },
      { time: "Post-run", action: "PH 1500 in 500ml immediately + recovery meal within 45 min" },
    ],
    note: "Carry at least 750ml–1L. PH Carb 30 gels are ideal for base — light on the stomach as your gut adapts. Plan a refill route.",
  },
  long_build: {
    color: "#a78bfa", label: "Long Run Fueling (Build Phase)",
    steps: [
      { time: "Night before", action: "PH 1500 + carb load dinner (pasta/rice). 500ml water." },
      { time: "Morning", action: "Oats 120g + banana + honey + 2 eggs. 90 min before start." },
      { time: "15 min pre", action: "500ml PH 1500 + small banana" },
      { time: "30 min in", action: "First PH Carb 30 gel. Start early — don't wait until you feel it." },
      { time: "Every 40 min", action: "PH Carb 30 gel + 250ml PH 1500. Alternate bottles with plain water." },
      { time: "Last 5km pace section", action: "No gel — just water. Focus on running the pace." },
      { time: "Post-run", action: "PH 1500 + chocolate milk or protein shake + carbs within 30 min" },
    ],
    note: "You need 3–4 PH Carb 30 gels for 26–30km. Start introducing PH Carb 90 in later Build weeks to test your gut tolerance."
  },
  long_peak: {
    color: "#a78bfa", label: "Long Run Fueling (Peak Phase)",
    steps: [
      { time: "2 days before", action: "Increase carb intake. PH 1000 daily." },
      { time: "Night before", action: "Full carb load. PH 1500 in 750ml water before bed." },
      { time: "Morning", action: "Oats 150g + 2 bananas + honey. 90–120 min before." },
      { time: "15 min pre", action: "750ml PH 1500 + PH Caffeine Gel (100mg) — only if you've tested it before" },
      { time: "Every 35–40 min", action: "Alternate: PH Carb 30 (easy on stomach) and PH Carb 90 (big carb hit at km 20+). Chase with 200ml PH 1500." },
      { time: "Marathon pace section", action: "Gel at start of MP section. Run your race-day rhythm." },
      { time: "Post-run", action: "PH 1500 immediately + full recovery meal within 45 min" },
    ],
    note: "Race rehearsal. Use PH Carb 30 early, introduce PH Carb 90 from the halfway point, test PH Caffeine Gel at the end. Zero new products on race day."
  },
  marathon_pace: {
    color: "#f97316", label: "Marathon Pace Run Fueling",
    steps: [
      { time: "Night before", action: "PH 1500 in 500ml + pasta or rice dinner" },
      { time: "Morning", action: "Oats 100g + banana. 90 min before." },
      { time: "15 min pre", action: "500ml PH 1500" },
      { time: "Before pace section", action: "PH Carb 30 gel just before switching to 5:41/km" },
      { time: "During pace section", action: "PH Carb 30 every 45 min + 250ml PH 1500. Practice the exact race routine." },
      { time: "Post", action: "PH 1500 + protein meal" },
    ],
    note: "Practice drinking at marathon pace now — it feels different. Don\'t leave this skill to race day."
  },
  race: {
    color: "#818cf8", label: "Race Day — Amsterdam Marathon",
    steps: [
      { time: "2 days before", action: "Carb loading starts. PH 1000 daily. Reduce fibre and fat." },
      { time: "Night before", action: "PH 1500 in 750ml water + big pasta dinner. Early bed." },
      { time: "Race morning", action: "Oats 150g + 2 bananas + honey. 3 hours before gun." },
      { time: "90 min pre", action: "500ml PH 1500 tablet" },
      { time: "15 min pre", action: "PH Caffeine Gel (100mg caffeine) + 200ml water" },
      { time: "km 8", action: "PH Carb 30 gel. Do not wait until you need it." },
      { time: "Every 8km after", action: "Alternate PH Carb 30 and PH Carb 90. Chase every gel with water at aid stations. Carry PH 1500 tabs in pocket." },
      { time: "km 30", action: "PH Caffeine Gel if you have one left. This is where races are won." },
      { time: "Finish", action: "PH 1500 immediately. Sit. Eat within 30 min." },
    ],
    note: "Nothing new on race day. PH Carb 30 for early km, PH Carb 90 from km 20+, PH Caffeine Gel at km 30. All must be tested in Peak training."
  },
};

function FuelingPanel({ fueling }) {
  if (!fueling) return null;
  const f = fuelingPlans[fueling];
  if (!f) return null;
  return (
    <div style={{ marginTop: "10px" }}>
      <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "6px" }}>💧 PRECISION HYDRATION FUELING</div>
      <div style={{ background: `${f.color}10`, border: `1px solid ${f.color}25`, borderRadius: "8px", padding: "10px 12px" }}>
        <div style={{ fontSize: "9px", color: f.color, letterSpacing: "2px", marginBottom: "8px" }}>{f.label.toUpperCase()}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "8px" }}>
          {f.steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: "8px" }}>
              <div style={{ fontSize: "9px", color: f.color, minWidth: "90px", paddingTop: "1px", flexShrink: 0 }}>{s.time}</div>
              <div style={{ fontSize: "10px", color: "#94a3b8", lineHeight: 1.4 }}>{s.action}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "9px", color: "#64748b", borderTop: `1px solid ${f.color}20`, paddingTop: "7px", lineHeight: 1.5 }}>
          ⚡ {f.note}
        </div>
      </div>
    </div>
  );
}

function MacroBar({ value, max, color }) {
  return (
    <div style={{ background: "#1e293b", borderRadius: "3px", height: "5px", flex: 1 }}>
      <div style={{ background: color, borderRadius: "3px", height: "5px", width: `${Math.min(100,(value/max)*100)}%` }} />
    </div>
  );
}

// Robustly extract JSON from AI response — handles trailing commas, truncation, extra text
function safeParseJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(cleaned); } catch {}
  // Try extracting the first {...} block
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
    // Remove trailing commas before } or ]
    const fixed = match[0].replace(/,\s*([}\]])/g, "$1");
    try { return JSON.parse(fixed); } catch {}
    // Attempt to close unclosed JSON by appending closing braces
    let attempt = fixed;
    for (let i = 0; i < 5; i++) {
      attempt += "}";
      try { return JSON.parse(attempt); } catch {}
    }
  }
  throw new Error("Could not parse AI response as JSON");
}

const DISLIKED = ["cottage cheese", "feta", "tuna"];

async function generateDayRecipes(macroDay) {
  const m = macroData[macroDay] || macroData["hard"];
  const apiKey = localStorage.getItem("oai_key");
  if (!apiKey) throw new Error("No OpenAI key — add it in the Coach tab first.");
  const prompt = `You are a sports nutritionist creating recipes for Ross Hunter, a 39yo male marathon runner (90kg, Amsterdam Marathon 2026 goal sub-4:00).

Day type: ${m.label}
Daily targets: ${m.kcal} kcal | Protein: ${m.protein}g | Carbs: ${m.carbs}g | Fat: ${m.fat}g

Generate a full day meal plan with 5–6 meals (Breakfast, Pre-run snack if needed, Lunch, Afternoon snack, Dinner, Evening snack).

IMPORTANT:
- Do NOT use: ${DISLIKED.join(", ")}
- Quick to make (under 30 min), practical, tasty
- Exact quantities in grams/ml

Respond ONLY with valid JSON, no markdown:
{
  "meals": [
    {
      "meal": "Breakfast",
      "name": "Recipe name",
      "time": "5 min",
      "macros": { "kcal": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "ingredients": ["200g item"],
      "method": ["Step 1"]
    }
  ]
}`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.choices?.[0]?.message?.content || "";
  return safeParseJSON(text);
}

const SWAP_SUGGESTIONS = ["Asian", "Spanish", "Mexican", "Italian", "High protein", "Quick 10 min", "Greek", "Indian"];

function SwapPanel({ color, onSwap, onClose }) {
  const [prompt, setPrompt] = useState("");
  return (
    <div onClick={e => e.stopPropagation()} style={{ padding: "12px", borderTop: `1px solid ${color}30`, background: "rgba(0,0,0,0.3)" }}>
      <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "1px", marginBottom: "8px" }}>What do you fancy?</div>
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "10px" }}>
        {SWAP_SUGGESTIONS.map(s => (
          <button key={s} onClick={(e) => { e.stopPropagation(); setPrompt(p => p === s ? "" : s); }} style={{
            padding: "5px 10px", border: `1px solid ${prompt === s ? color : "#1e293b"}`,
            borderRadius: "20px", background: prompt === s ? `${color}25` : "transparent",
            color: prompt === s ? color : "#475569", fontSize: "10px", cursor: "pointer",
            fontFamily: "'Courier New', monospace",
          }}>{s}</button>
        ))}
      </div>
      <input
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onClick={e => e.stopPropagation()}
        placeholder="or type anything… e.g. leftover prawns"
        style={{
          width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)",
          border: `1px solid #1e293b`, borderRadius: "8px", color: "#e2e8f0",
          fontSize: "12px", fontFamily: "'Courier New', monospace", outline: "none",
          boxSizing: "border-box", marginBottom: "8px",
        }}
      />
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={(e) => { e.stopPropagation(); onSwap(prompt); }} style={{
          flex: 1, padding: "10px", background: `${color}25`, border: `1px solid ${color}`,
          borderRadius: "8px", color, fontSize: "12px", cursor: "pointer",
          fontFamily: "'Courier New', monospace", fontWeight: "bold", letterSpacing: "1px",
        }}>✦ GENERATE</button>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{
          padding: "10px 14px", background: "transparent", border: "1px solid #1e293b",
          borderRadius: "8px", color: "#475569", fontSize: "12px", cursor: "pointer",
        }}>✕</button>
      </div>
    </div>
  );
}

function StaticMealCard({ meal, color, onSwap, swapping, kept, onToggleKeep, onLog, logEntry }) {
  const [open, setOpen] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showLog, setShowLog] = useState(false);
  return (
    <div style={{ background: kept ? `${color}08` : "rgba(255,255,255,0.02)", border: `1px solid ${kept ? color + "60" : (open || showSwap) ? color : "#1e293b"}`, borderRadius: "6px", marginBottom: "4px", overflow: "hidden" }}>
      <div onClick={(e) => { e.stopPropagation(); if (!showSwap) setOpen(o => !o); }} style={{ padding: "8px 10px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button onClick={(e) => { e.stopPropagation(); onToggleKeep && onToggleKeep(); }} style={{
            background: kept ? color : "transparent", border: `1px solid ${kept ? color : "#334155"}`,
            borderRadius: "3px", color: kept ? "#000" : "#334155", fontSize: "9px",
            cursor: "pointer", padding: "1px 5px", fontFamily: "'Courier New', monospace", lineHeight: 1.4, flexShrink: 0,
          }}>{kept ? "🔒" : "🔓"}</button>
          <span style={{ fontSize: "9px", color: kept ? color : "#94a3b8", letterSpacing: "1px" }}>{meal.meal.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "9px", color: "#475569" }}>{Math.round(meal.p*4 + meal.c*4 + meal.f*9)} kcal · P:{meal.p} C:{meal.c} F:{meal.f}</span>
          {!kept && (
            swapping
              ? <span style={{ fontSize: "10px", color: "#475569" }}>…</span>
              : <>
                  <button onClick={(e) => { e.stopPropagation(); setShowSwap(s => !s); setShowLog(false); }} style={{
                    background: showSwap ? `${color}20` : "transparent", border: `1px solid ${color}40`, borderRadius: "4px",
                    color, fontSize: "10px", cursor: "pointer", padding: "1px 6px",
                    fontFamily: "'Courier New', monospace", lineHeight: 1.4,
                  }}>↻</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowLog(s => !s); setShowSwap(false); }} style={{
                    background: showLog ? "rgba(74,222,128,0.15)" : logEntry ? "rgba(74,222,128,0.08)" : "transparent",
                    border: `1px solid ${logEntry ? "#4ade8060" : showLog ? "#4ade80" : "#1e293b"}`, borderRadius: "4px",
                    color: logEntry ? "#4ade80" : "#475569", fontSize: "10px", cursor: "pointer", padding: "1px 6px",
                    fontFamily: "'Courier New', monospace", lineHeight: 1.4,
                  }}>{logEntry ? "✓" : "📋"}</button>
                </>
          )}
          <span style={{ fontSize: "10px", color: "#334155" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {showSwap && <SwapPanel color={color} onSwap={(p) => { onSwap && onSwap(p); setShowSwap(false); }} onClose={() => setShowSwap(false)} />}
      {showLog && <MealLogPanel mealName={meal.meal} entry={logEntry} color={color} plannedMeal={meal} onSave={(e) => { onLog && onLog(e); if (e) setShowLog(false); }} onClose={() => setShowLog(false)} />}
      {open && (
        <div style={{ padding: "0 10px 10px", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.6, marginTop: "8px" }}>{meal.food}</div>
          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            {[["P", meal.p, "#60a5fa"], ["C", meal.c, "#facc15"], ["F", meal.f, "#f97316"]].map(([label, val, col]) => (
              <div key={label} style={{ background: `${col}12`, border: `1px solid ${col}30`, borderRadius: "5px", padding: "4px 8px", textAlign: "center" }}>
                <div style={{ fontSize: "8px", color: "#475569" }}>{label}</div>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: col }}>{val}g</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecipeCard({ recipe, color, mealLabel, onSwap, swapping, kept, onToggleKeep, onLog, logEntry }) {
  const [open, setOpen] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showLog, setShowLog] = useState(false);
  return (
    <div style={{ background: kept ? `${color}08` : "rgba(255,255,255,0.02)", border: `1px solid ${kept ? color + "60" : (open || showSwap) ? color : "#1e293b"}`, borderRadius: "6px", marginBottom: "4px", overflow: "hidden" }}>
      <div onClick={(e) => { e.stopPropagation(); if (!showSwap) setOpen(o => !o); }} style={{ padding: "8px 10px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
        <div style={{ flex: 1 }}>
          {mealLabel && <div style={{ fontSize: "9px", color, letterSpacing: "1px", marginBottom: "2px" }}>{mealLabel.toUpperCase()}</div>}
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#e2e8f0" }}>{recipe.name}</div>
          <div style={{ display: "flex", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "9px", color: "#475569" }}>⏱ {recipe.time}</span>
            <span style={{ fontSize: "9px", color: "#4ade80" }}>{recipe.macros?.kcal} kcal</span>
            <span style={{ fontSize: "9px", color: "#60a5fa" }}>P:{recipe.macros?.protein}g</span>
            <span style={{ fontSize: "9px", color: "#facc15" }}>C:{recipe.macros?.carbs}g</span>
            <span style={{ fontSize: "9px", color: "#f97316" }}>F:{recipe.macros?.fat}g</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <button onClick={(e) => { e.stopPropagation(); onToggleKeep && onToggleKeep(); }} style={{
            background: kept ? color : "transparent", border: `1px solid ${kept ? color : "#334155"}`,
            borderRadius: "3px", color: kept ? "#000" : "#334155", fontSize: "9px",
            cursor: "pointer", padding: "1px 5px", fontFamily: "'Courier New', monospace", lineHeight: 1.4,
          }}>{kept ? "🔒" : "🔓"}</button>
          {onSwap && !kept && (
            swapping
              ? <span style={{ fontSize: "10px", color: "#475569" }}>…</span>
              : <>
                  <button onClick={(e) => { e.stopPropagation(); setShowSwap(s => !s); setShowLog(false); }} style={{
                    background: showSwap ? `${color}20` : "transparent", border: `1px solid ${color}40`, borderRadius: "4px",
                    color, fontSize: "10px", cursor: "pointer", padding: "1px 6px",
                    fontFamily: "'Courier New', monospace", lineHeight: 1.4,
                  }}>↻</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowLog(s => !s); setShowSwap(false); }} style={{
                    background: showLog ? "rgba(74,222,128,0.15)" : logEntry ? "rgba(74,222,128,0.08)" : "transparent",
                    border: `1px solid ${logEntry ? "#4ade8060" : showLog ? "#4ade80" : "#1e293b"}`, borderRadius: "4px",
                    color: logEntry ? "#4ade80" : "#475569", fontSize: "10px", cursor: "pointer", padding: "1px 6px",
                    fontFamily: "'Courier New', monospace", lineHeight: 1.4,
                  }}>{logEntry ? "✓" : "📋"}</button>
                </>
          )}
          <span style={{ fontSize: "10px", color: "#334155" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {showSwap && <SwapPanel color={color} onSwap={(p) => { onSwap && onSwap(p); setShowSwap(false); }} onClose={() => setShowSwap(false)} />}
      {showLog && <MealLogPanel mealName={mealLabel || "Meal"} entry={logEntry} color={color} plannedMeal={recipe} onSave={(e) => { onLog && onLog(e); if (e) setShowLog(false); }} onClose={() => setShowLog(false)} />}
      {open && (
        <div style={{ padding: "0 11px 11px", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", margin: "8px 0 4px" }}>INGREDIENTS</div>
          {recipe.ingredients?.map((ing, i) => <div key={i} style={{ fontSize: "10px", color: "#94a3b8", padding: "2px 0" }}>• {ing}</div>)}
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", margin: "8px 0 4px" }}>METHOD</div>
          {recipe.method?.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: "7px", marginBottom: "4px" }}>
              <span style={{ fontSize: "10px", color, fontWeight: "bold", minWidth: "14px" }}>{i+1}.</span>
              <span style={{ fontSize: "10px", color: "#94a3b8", lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Shared AI macro analyser — used by both meal log and extras
async function analyseMacros({ text, imageB64, mealName }) {
  const apiKey = localStorage.getItem("oai_key");
  if (!apiKey) throw new Error("No OpenAI key — add it in Coach tab.");

  const isPhoto = !!imageB64;
  const prompt = isPhoto
    ? `Analyse this meal photo and estimate macros for a 90kg male marathon runner.\nMeal: ${mealName || "unknown"}.\nReturn ONLY valid JSON:\n{"description":"what you see","kcal":0,"protein":0,"carbs":0,"fat":0,"confidence":"high/medium/low","notes":""}`
    : `Calculate macros for: "${text}"\nFor a 90kg male marathon runner. Be precise with quantities.\nReturn ONLY valid JSON:\n{"description":"${text}","kcal":0,"protein":0,"carbs":0,"fat":0,"confidence":"high/medium/low","notes":""}`;

  const msgContent = isPhoto
    ? [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}`, detail: "high" } }]
    : prompt;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o", max_tokens: 300,
      messages: [
        { role: "system", content: "You are a JSON API. Return only a raw JSON object, no markdown." },
        { role: "user", content: msgContent }
      ]
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return safeParseJSON(data.choices?.[0]?.message?.content || "");
}

// Inline log panel that opens inside each meal card
function MealLogPanel({ mealName, entry, onSave, onClose, color, plannedMeal }) {
  const [mode, setMode] = useState(plannedMeal ? "planned" : "text");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function logPlanned() {
    const p = plannedMeal?.p ?? plannedMeal?.macros?.protein ?? 0;
    const c = plannedMeal?.c ?? plannedMeal?.macros?.carbs ?? 0;
    const f = plannedMeal?.f ?? plannedMeal?.macros?.fat ?? 0;
    const food = plannedMeal?.food || plannedMeal?.name || mealName;
    onSave({
      meal: mealName, source: "planned",
      description: food,
      kcal: Math.round(p*4 + c*4 + f*9),
      protein: p, carbs: c, fat: f,
      confidence: "high",
      timestamp: Date.now(),
    });
  }

  async function submitText() {
    if (!input.trim()) return;
    setLoading(true); setError(null);
    try {
      const result = await analyseMacros({ text: input, mealName });
      onSave({ ...result, meal: mealName, source: "text", input, timestamp: Date.now() });
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  async function submitPhoto(file) {
    setLoading(true); setError(null);
    const b64 = await new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result.split(",")[1]); r.readAsDataURL(file); });
    try {
      const result = await analyseMacros({ imageB64: b64, mealName });
      onSave({ ...result, meal: mealName, source: "photo", preview: `data:image/jpeg;base64,${b64}`, timestamp: Date.now() });
    } catch(e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ padding: "12px", borderTop: `1px solid ${color}30`, background: "rgba(0,0,0,0.3)" }}>
      {/* If already logged, show entry */}
      {entry && (
        <div style={{ marginBottom: "10px", background: "rgba(255,255,255,0.03)", border: `1px solid ${color}30`, borderRadius: "7px", padding: "8px 10px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            {entry.preview && <img src={entry.preview} alt="" style={{ width: "44px", height: "44px", borderRadius: "5px", objectFit: "cover", flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "10px", color: "#94a3b8", lineHeight: 1.4, marginBottom: "4px" }}>{entry.description || entry.input}</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "9px", color: "#4ade80" }}>{entry.kcal} kcal</span>
                <span style={{ fontSize: "9px", color: "#60a5fa" }}>P:{entry.protein}g</span>
                <span style={{ fontSize: "9px", color: "#facc15" }}>C:{entry.carbs}g</span>
                <span style={{ fontSize: "9px", color: "#f97316" }}>F:{entry.fat}g</span>
              </div>
            </div>
            <button onClick={() => onSave(null)} style={{ background: "transparent", border: "none", color: "#334155", cursor: "pointer", fontSize: "13px", padding: "0", flexShrink: 0 }}>✕</button>
          </div>
          <button onClick={() => onSave(null)} style={{ marginTop: "8px", width: "100%", padding: "6px", background: "transparent", border: "1px solid #1e293b", borderRadius: "5px", color: "#475569", fontSize: "9px", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: "1px" }}>↻ RE-LOG</button>
        </div>
      )}

      {!entry && (
        <>
          {/* 3 options in a row */}
          <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
            {[
              ["planned", "✓ Had this"],
              ["text",    "✏️ Type"],
              ["photo",   "📷 Photo"],
            ].map(([m, label]) => {
              if (m === "planned" && !plannedMeal) return null;
              const isActive = mode === m;
              return (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: "9px 4px",
                  border: `1px solid ${isActive ? color : "#1e293b"}`,
                  borderRadius: "7px", background: isActive ? `${color}18` : "transparent",
                  color: isActive ? color : "#475569", fontSize: "10px", cursor: "pointer",
                  fontFamily: "'Courier New', monospace", fontWeight: isActive ? "bold" : "normal",
                }}>{label}</button>
              );
            })}
          </div>

          {mode === "planned" && plannedMeal && (
            <button onClick={logPlanned} style={{
              width: "100%", padding: "11px", background: `${color}18`,
              border: `1px solid ${color}`, borderRadius: "7px", color,
              fontSize: "12px", cursor: "pointer", fontFamily: "'Courier New', monospace", fontWeight: "bold",
            }}>✓ Log planned meal</button>
          )}

          {mode === "text" && (            <>
              <textarea value={input} onChange={e => setInput(e.target.value)} onClick={e => e.stopPropagation()}
                placeholder={"e.g. 100g oats, 200ml oat milk, 1 banana, 1 tbsp honey"}
                style={{ width: "100%", padding: "9px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b", borderRadius: "7px", color: "#e2e8f0", fontSize: "11px", fontFamily: "'Courier New', monospace", resize: "none", height: "70px", boxSizing: "border-box", outline: "none", marginBottom: "8px" }}
              />
              <button onClick={submitText} disabled={loading || !input.trim()} style={{
                width: "100%", padding: "10px", background: loading ? "rgba(255,255,255,0.02)" : `${color}18`,
                border: `1px solid ${loading ? "#1e293b" : color}`, borderRadius: "7px",
                color: loading ? "#334155" : color, fontSize: "11px", cursor: loading ? "default" : "pointer",
                fontFamily: "'Courier New', monospace", fontWeight: "bold",
              }}>{loading ? "CALCULATING…" : "✦ CALCULATE MACROS"}</button>
            </>
          )}

          {mode === "photo" && (
            <label style={{ display: "block", border: `1px dashed ${color}40`, borderRadius: "8px", padding: "20px", textAlign: "center", cursor: loading ? "default" : "pointer" }}>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) submitPhoto(e.target.files[0]); e.target.value = ""; }} disabled={loading} />
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>{loading ? "⏳" : "📷"}</div>
              <div style={{ fontSize: "11px", color: "#475569" }}>{loading ? "Analysing…" : "Tap to take or upload photo"}</div>
            </label>
          )}
        </>
      )}

      {error && <div style={{ marginTop: "8px", fontSize: "10px", color: "#ef4444" }}>⚠ {error}</div>}
      <button onClick={onClose} style={{ marginTop: "8px", width: "100%", padding: "7px", background: "transparent", border: "1px solid #0f172a", borderRadius: "5px", color: "#334155", fontSize: "9px", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>CLOSE</button>
    </div>
  );
}

// Day-level actual vs target summary + extras logger
function DayLogger({ photoLog, onSave, targets, color }) {
  const [showExtras, setShowExtras] = useState(false);
  const [extraInput, setExtraInput] = useState("");
  const [extraLoading, setExtraLoading] = useState(false);

  const mealEntries = photoLog.filter(e => e.meal !== "__extra__");
  const extraEntries = photoLog.filter(e => e.meal === "__extra__");

  const total = photoLog.reduce((s, e) => ({
    kcal: s.kcal + (e.kcal || 0), protein: s.protein + (e.protein || 0),
    carbs: s.carbs + (e.carbs || 0), fat: s.fat + (e.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  async function addExtra() {
    if (!extraInput.trim()) return;
    setExtraLoading(true);
    try {
      const result = await analyseMacros({ text: extraInput, mealName: "Extra" });
      onSave([...photoLog, { ...result, meal: "__extra__", input: extraInput, timestamp: Date.now() }]);
      setExtraInput("");
    } catch(e) {}
    setExtraLoading(false);
  }

  async function addExtraPhoto(file) {
    setExtraLoading(true);
    const b64 = await new Promise(res => { const r = new FileReader(); r.onload = ev => res(ev.target.result.split(",")[1]); r.readAsDataURL(file); });
    try {
      const result = await analyseMacros({ imageB64: b64, mealName: "Extra" });
      onSave([...photoLog, { ...result, meal: "__extra__", preview: `data:image/jpeg;base64,${b64}`, timestamp: Date.now() }]);
    } catch(e) {}
    setExtraLoading(false);
  }

  const logged = photoLog.length > 0;

  return (
    <div style={{ marginTop: "14px", borderTop: `1px solid ${color}20`, paddingTop: "12px" }}>
      {/* Extras */}
      <div style={{ marginTop: "12px" }}>
        <button onClick={() => setShowExtras(s => !s)} style={{
          width: "100%", padding: "8px", background: "transparent",
          border: `1px dashed ${showExtras ? color + "50" : "#1e293b"}`, borderRadius: "7px",
          color: showExtras ? color : "#475569", fontSize: "10px", cursor: "pointer",
          fontFamily: "'Courier New', monospace", letterSpacing: "1px",
        }}>
          {showExtras ? "▲" : "+"} EXTRAS {extraEntries.length > 0 ? `(${extraEntries.length})` : "— wine, crisps, anything off-plan"}
        </button>

        {showExtras && (
          <div style={{ marginTop: "8px" }}>
            {extraEntries.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center", padding: "6px 8px", background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: "6px", marginBottom: "4px" }}>
                {e.preview && <img src={e.preview} alt="" style={{ width: "32px", height: "32px", borderRadius: "4px", objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "10px", color: "#94a3b8" }}>{e.input || e.description}</div>
                  <div style={{ fontSize: "9px", color: "#475569" }}>{e.kcal} kcal · P:{e.protein}g C:{e.carbs}g F:{e.fat}g</div>
                </div>
                <button onClick={() => onSave(photoLog.filter((_, j) => photoLog.indexOf(e) !== j))} style={{ background: "transparent", border: "none", color: "#334155", cursor: "pointer", fontSize: "12px" }}>✕</button>
              </div>
            ))}

            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <input value={extraInput} onChange={e => setExtraInput(e.target.value)} onClick={e => e.stopPropagation()}
                placeholder="e.g. glass of wine, packet of crisps"
                style={{ flex: 1, padding: "8px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid #1e293b", borderRadius: "6px", color: "#e2e8f0", fontSize: "11px", fontFamily: "'Courier New', monospace", outline: "none" }}
              />
              <button onClick={addExtra} disabled={extraLoading || !extraInput.trim()} style={{
                padding: "8px 12px", background: "rgba(74,222,128,0.1)", border: "1px solid #4ade8060",
                borderRadius: "6px", color: "#4ade80", fontSize: "11px", cursor: "pointer", fontFamily: "'Courier New', monospace",
              }}>{extraLoading ? "…" : "+"}</button>
              <label style={{ padding: "8px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid #1e293b", borderRadius: "6px", color: "#475569", fontSize: "14px", cursor: "pointer" }}>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) addExtraPhoto(e.target.files[0]); e.target.value = ""; }} disabled={extraLoading} />
                📷
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MacroPanel({ macroDay, fueling, km, phase, recipes, loadingRecipes, recipeError, onGenerateRecipes, onSwapMeal, swappingMeal, photoLog, onSavePhotoLog, keptExternal, onKeptChange }) {
  const m = macroData[macroDay] || macroData["hard"];
  const dyn = calcDayMacros(macroDay, km, phase);
  const color = m.color;
  const kept = keptExternal || new Set();

  // Get current meal list (recipes or scaled static)
  const baseMeals = recipes ? recipes.meals : scaleMeals(m.meals, dyn.protein, dyn.carbs, dyn.fat);

  // Subtract kept meal macros from day targets to get remaining budget for unlocked meals
  const keptMeals = baseMeals.filter(meal => kept.has(meal.meal || meal.name));
  const freeMeals  = baseMeals.filter(meal => !kept.has(meal.meal || meal.name));

  const usedP = keptMeals.reduce((s, meal) => s + (meal.p ?? meal.macros?.protein ?? 0), 0);
  const usedC = keptMeals.reduce((s, meal) => s + (meal.c ?? meal.macros?.carbs  ?? 0), 0);
  const usedF = keptMeals.reduce((s, meal) => s + (meal.f ?? meal.macros?.fat    ?? 0), 0);

  const remP = Math.max(0, dyn.protein - usedP);
  const remC = Math.max(0, dyn.carbs   - usedC);
  const remF = Math.max(0, dyn.fat     - usedF);

  // Rescale free static meals to remaining budget; recipe macros get a note showing adjustment
  const rebalancedFree = recipes
    ? freeMeals.map(meal => {
        const mealKeys = freeMeals.length;
        return {
          ...meal,
          macros: {
            kcal:    meal.macros?.kcal    ?? 0,
            protein: mealKeys > 0 ? Math.round(meal.macros?.protein / Math.max(1, freeMeals.reduce((s,x)=>s+(x.macros?.protein??0),0)) * remP) : meal.macros?.protein ?? 0,
            carbs:   mealKeys > 0 ? Math.round(meal.macros?.carbs   / Math.max(1, freeMeals.reduce((s,x)=>s+(x.macros?.carbs  ??0),0)) * remC) : meal.macros?.carbs   ?? 0,
            fat:     mealKeys > 0 ? Math.round(meal.macros?.fat     / Math.max(1, freeMeals.reduce((s,x)=>s+(x.macros?.fat    ??0),0)) * remF) : meal.macros?.fat     ?? 0,
          }
        };
      })
    : scaleMeals(freeMeals, remP, remC, remF);

  // Merge kept (unchanged) + rebalanced free, preserving order
  const displayMeals = baseMeals.map(meal => {
    const mealId = meal.meal || meal.name;
    if (kept.has(mealId)) return meal;
    return rebalancedFree.find(f => (f.meal || f.name) === mealId) || meal;
  });

  function toggleKeep(mealId) {
    const next = new Set(kept);
    if (next.has(mealId)) next.delete(mealId); else next.add(mealId);
    onKeptChange && onKeptChange(next);
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ marginTop: "10px", borderTop: `1px solid ${color}30`, paddingTop: "10px" }}>
      {/* Burn vs Eat summary */}
      <div style={{ background: `${color}10`, border: `1px solid ${color}25`, borderRadius: "8px", padding: "10px 12px", marginBottom: "8px" }}>
        <div style={{ fontSize: "9px", color: color, letterSpacing: "2px", marginBottom: "10px" }}>{m.label.toUpperCase()}{km ? ` · ${km}km` : ""}</div>

        {/* Burn breakdown */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
          {[
            { label: "RUN BURN", value: dyn.runBurn > 0 ? `~${dyn.runBurn} kcal` : "—", color: color },
            { label: "RESTING", value: "~2,500 kcal", color: "#475569" },
            { label: "TOTAL BURN", value: `~${dyn.burn.toLocaleString()} kcal`, color: "#e2e8f0" },
            { label: "EAT", value: `${dyn.kcal.toLocaleString()} kcal`, color: "#4ade80" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(0,0,0,0.2)", borderRadius: "5px", padding: "5px 8px", minWidth: "80px" }}>
              <div style={{ fontSize: "8px", color: "#475569", letterSpacing: "1px" }}>{s.label}</div>
              <div style={{ fontSize: "11px", fontWeight: "bold", color: s.color, marginTop: "1px" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Macro bars — show actual vs target when meals are logged */}
        {(() => {
          const logged = (photoLog || []);
          const actual = logged.reduce((s, e) => ({
            kcal: s.kcal + (e.kcal||0), protein: s.protein + (e.protein||0),
            carbs: s.carbs + (e.carbs||0), fat: s.fat + (e.fat||0),
          }), { kcal:0, protein:0, carbs:0, fat:0 });
          const hasLogged = logged.length > 0;
          return [
            { name: "KCAL",    actual: actual.kcal,    target: dyn.kcal,    unit: "",  col: color,    max: dyn.kcal * 1.3 },
            { name: "PROTEIN", actual: actual.protein, target: dyn.protein, unit: "g", col: "#60a5fa", max: 220 },
            { name: "CARBS",   actual: actual.carbs,   target: dyn.carbs,   unit: "g", col: "#facc15", max: Math.max(dyn.carbs * 1.3, 100) },
            { name: "FAT",     actual: actual.fat,     target: dyn.fat,     unit: "g", col: "#f97316", max: 150 },
          ].map(bar => {
            const targetPct = Math.min(98, Math.round((bar.target / bar.max) * 100));
            const actualPct = Math.min(100, Math.round((bar.actual / bar.max) * 100));
            const over = hasLogged && bar.actual > bar.target * 1.1;
            const close = hasLogged && bar.actual >= bar.target * 0.85;
            const barCol = !hasLogged ? bar.col : over ? "#f97316" : close ? "#4ade80" : "#facc15";
            return (
              <div key={bar.name} style={{ marginBottom: "7px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontSize: "9px", color: "#64748b", letterSpacing: "1px" }}>{bar.name}</span>
                  <span style={{ fontSize: "10px", fontWeight: "bold", color: barCol }}>
                    {hasLogged ? <>{bar.actual}{bar.unit} <span style={{ color: "#334155", fontWeight: "normal" }}>/ {bar.target}{bar.unit}</span></> : <span style={{ color: bar.col }}>{bar.target}{bar.unit}</span>}
                  </span>
                </div>
                <div style={{ background: "#1e293b", borderRadius: "3px", height: "6px", position: "relative" }}>
                  {/* Target line */}
                  <div style={{ position: "absolute", top: "-2px", left: `${targetPct}%`, width: "2px", height: "10px", background: "#475569", borderRadius: "1px", zIndex: 2 }} />
                  {/* Actual fill */}
                  <div style={{ background: barCol, borderRadius: "3px", height: "6px", width: `${hasLogged ? actualPct : targetPct}%`, transition: "width 0.4s", opacity: hasLogged ? 1 : 0.4 }} />
                </div>
              </div>
            );
          });
        })()}
        <div style={{ fontSize: "9px", color: "#334155", marginTop: "4px", lineHeight: 1.4 }}>💡 Burns ~{dyn.burn.toLocaleString()} kcal · deficit ~{dyn.deficit} kcal · {macroDay === "longrun" || macroDay === "preload" ? "Fuel well — high volume day." : macroDay === "rest" ? "Rest day: keep carbs low, protein high." : "Whole foods, hit protein first."}</div>
      </div>

      {/* Meals */}
      <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "6px" }}>MEALS</div>
      {/* Meals — static until recipes generated, then replaced inline */}
      {kept.size > 0 && (
        <div style={{ fontSize: "9px", color: "#475569", marginBottom: "6px", letterSpacing: "1px" }}>
          🔒 {kept.size} meal{kept.size > 1 ? "s" : ""} locked · unlocked meals rebalanced to remaining budget
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {displayMeals.map((meal, i) => {
          const mealId = meal.meal || meal.name;
          const isKept = kept.has(mealId);
          const isSwapping = swappingMeal === mealId;
          const mealLogEntry = (photoLog || []).find(e => e.meal === mealId) || null;
          return recipes ? (
            <RecipeCard key={i} recipe={meal} color={color} mealLabel={meal.meal}
              onSwap={(userPrompt) => onSwapMeal && onSwapMeal(mealId, { remP, remC, remF, count: freeMeals.length }, userPrompt)}
              swapping={isSwapping} kept={isKept} onToggleKeep={() => toggleKeep(mealId)}
              logEntry={mealLogEntry}
              onLog={(entry) => {
                const updated = entry
                  ? [...(photoLog || []).filter(e => e.meal !== mealId), entry]
                  : (photoLog || []).filter(e => e.meal !== mealId);
                onSavePhotoLog && onSavePhotoLog(updated);
              }} />
          ) : (
            <StaticMealCard key={i} meal={meal} color={color}
              onSwap={(userPrompt) => onSwapMeal && onSwapMeal(mealId, { remP, remC, remF, count: freeMeals.length }, userPrompt)}
              swapping={isSwapping} kept={isKept} onToggleKeep={() => toggleKeep(mealId)}
              logEntry={mealLogEntry}
              onLog={(entry) => {
                const updated = entry
                  ? [...(photoLog || []).filter(e => e.meal !== mealId), entry]
                  : (photoLog || []).filter(e => e.meal !== mealId);
                onSavePhotoLog && onSavePhotoLog(updated);
              }} />
          );
        })}
      </div>

      {fueling && <FuelingPanel fueling={fueling} />}

      {/* Day Logger — actual vs target + extras */}
      <DayLogger
        photoLog={photoLog || []}
        onSave={onSavePhotoLog || (() => {})}
        targets={{ kcal: dyn.kcal, protein: dyn.protein, carbs: dyn.carbs, fat: dyn.fat }}
        color={color}
      />

      {/* Generate / hide button */}
      <div style={{ marginTop: "10px" }}>
        <button
          onClick={(e) => { e.stopPropagation(); onGenerateRecipes(); }}
          disabled={loadingRecipes}
          style={{
            width: "100%", padding: "9px",
            background: "transparent",
            border: `1px dashed ${loadingRecipes ? "#1e293b" : color + "50"}`,
            borderRadius: "7px", color: loadingRecipes ? "#334155" : color + "99",
            fontSize: "9px", letterSpacing: "2px", cursor: loadingRecipes ? "default" : "pointer",
            fontFamily: "'Courier New', monospace", transition: "all 0.2s",
          }}>
          {loadingRecipes ? "GENERATING RECIPES…" : recipes ? "✕ SHOW SIMPLE MEALS" : "🍳 GENERATE RECIPES"}
        </button>
        {recipeError && (
          <div onClick={e => e.stopPropagation()} style={{ marginTop: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid #ef444430", borderRadius: "6px", padding: "8px 10px", fontSize: "10px", color: "#ef4444" }}>
            ⚠ {recipeError}
          </div>
        )}
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
    return { type: "RACE DAY 🏅", detail: "Amsterdam Marathon! Start conservative 5:50/km. Race hard from 30km.", icon: "🏅", macroDay: "longrun", preferred: true, fueling: "race", km: 42 };
  }
  const dow = date.getDay();
  const progress = Math.min(weekInPhase / 7, 1);

  if (phase.name === "BASE") {
    const longKm = Math.round(18 + progress * 6);
    const easyKm = Math.round(8 + progress * 2);
    const friKm  = Math.round(6 + progress * 2);
    switch(dow) {
      case 1: return { type: "Easy Run", detail: `${easyKm}km @ 6:30–6:45/km Zone 2`, icon: "🏃", macroDay: "easy", preferred: true, fueling: easyKm >= 10 ? "easy_long" : null, km: easyKm };
      case 2: return { type: "Rest / Walk", detail: "10,000 steps. Mobility & stretching.", icon: "🚶", macroDay: "rest", preferred: false, km: 0 };
      case 3: return { type: "Tempo", detail: "10km: 2km warm up + 5km @ 5:25–5:30/km + cooldown", icon: "⚡", macroDay: "hard", preferred: true, fueling: "tempo", km: 10 };
      case 4: return { type: "Strength", detail: "Optional: 30min — glutes, single-leg, core", icon: "💪", macroDay: "active", preferred: false, km: 0 };
      case 5: return { type: "Strength + Easy", detail: `45min strength + ${friKm}km easy @ 6:40/km`, icon: "🏋️", macroDay: "preload", preferred: true, km: friKm };
      case 6: return { type: "Long Run", detail: `${longKm}km @ 6:20–6:30/km easy`, icon: "🌅", macroDay: "longrun", preferred: true, fueling: "long_base", km: longKm };
      case 0: return { type: "Reformer Pilates", detail: "Full class. Glutes, hip flexors, core.", icon: "🧘", macroDay: "active", preferred: true, km: 0 };
    }
  }
  if (phase.name === "BUILD") {
    const longKm = Math.round(26 + progress * 4);
    const easyKm = Math.round(10 + progress * 2);
    const mpKm   = Math.round(5 + progress * 3);
    const totalMp = Math.round(10 + progress * 4);
    switch(dow) {
      case 1: return { type: "Easy Run", detail: `${easyKm}km @ 6:20–6:30/km Zone 2`, icon: "🏃", macroDay: "easy", preferred: true, km: easyKm };
      case 2: return { type: "Rest / Optional", detail: "Easy 6km if Body Battery >60, otherwise rest", icon: "🚶", macroDay: "rest", preferred: false, km: 0 };
      case 3: return { type: "Threshold", detail: "14km: warm up + 3×3km @ 5:20/km (90s rest) + cooldown", icon: "⚡", macroDay: "hard", preferred: true, fueling: "tempo", km: 14 };
      case 4: return { type: "Strength", detail: "Strength — single-leg, core, glutes", icon: "💪", macroDay: "active", preferred: false, km: 0 };
      case 5: return { type: "Marathon Pace", detail: `${totalMp}km with ${mpKm}km @ 5:41/km in the middle`, icon: "🎯", macroDay: "preload", preferred: true, fueling: "marathon_pace", km: totalMp };
      case 6: return { type: "Long Run", detail: `${longKm}km @ 6:15–6:25/km, last 5km @ 5:50/km`, icon: "🌅", macroDay: "longrun", preferred: true, fueling: "long_build" };
      case 0: return { type: "Reformer Pilates", detail: "Full class. Essential after Saturday long run.", icon: "🧘", macroDay: "active", preferred: true, km: 0 };
    }
  }
  if (phase.name === "PEAK") {
    const longKm = Math.min(28 + Math.round(progress * 4), 32);
    const mpKm   = Math.round(8 + progress * 4);
    switch(dow) {
      case 1: return { type: "Easy Run", detail: "12km @ 6:20/km Zone 2", icon: "🏃", macroDay: "easy", preferred: true, km: 12 };
      case 2: return { type: "Optional Easy", detail: "8km easy or rest. Check Body Battery first.", icon: "🚶", macroDay: "rest", preferred: false, km: 0 };
      case 3: return { type: "Intervals", detail: "12km: 6×1km @ 5:05/km (2min rest) + warm up/cooldown", icon: "⚡", macroDay: "hard", preferred: true, fueling: "intervals", km: 12 };
      case 4: return { type: "Strength", detail: "40min strength. Start reducing in final weeks.", icon: "💪", macroDay: "active", preferred: false, km: 0 };
      case 5: return { type: "Tempo", detail: "16km: warm up + 10km @ 5:20/km + cooldown", icon: "🎯", macroDay: "preload", preferred: true, fueling: "tempo", km: 16 };
      case 6: return { type: "Peak Long Run", detail: `${longKm}km. Last ${mpKm}km @ 5:41/km marathon pace.`, icon: "🌅", macroDay: "longrun", preferred: true, fueling: "long_peak", km: longKm };
      case 0: return { type: "Reformer Pilates", detail: "Full class. Keeps you mobile through peak stress.", icon: "🧘", macroDay: "active", preferred: true, km: 0 };
    }
  }
  if (phase.name === "TAPER") {
    const daysToRace = Math.floor((RACE_DATE - date) / (24*60*60*1000));
    const nextDay = new Date(date); nextDay.setDate(nextDay.getDate()+1);
    const isRaceEve = nextDay.toDateString() === RACE_DATE.toDateString();
    switch(dow) {
      case 1: return { type: "Easy Run", detail: daysToRace > 14 ? "10km easy @ 6:20/km" : "8km easy. Short and relaxed.", icon: "🏃", macroDay: "easy", preferred: true, km: daysToRace > 14 ? 10 : 8 };
      case 2: return { type: "Rest", detail: "Full rest. Trust your training.", icon: "😴", macroDay: "rest", preferred: false, km: 0 };
      case 3: return { type: "Sharpener", detail: daysToRace > 14 ? "10km: warm up + 4×1km @ 5:41/km + cooldown" : "8km: warm up + 3×1km @ 5:41/km + cooldown", icon: "⚡", macroDay: "easy", preferred: true, km: daysToRace > 14 ? 10 : 8 };
      case 4: return { type: "Rest", detail: "Rest. Walk only.", icon: "😴", macroDay: "rest", preferred: false, km: 0 };
      case 5: return { type: "Easy Strides", detail: "5km easy + 4×100m strides. Stay sharp.", icon: "🏃", macroDay: "easy", preferred: true, km: 5 };
      case 6:
        if (isRaceEve) return { type: "Rest", detail: "Race eve 🍝 Pasta dinner, early sleep, bib pinned.", icon: "🍝", macroDay: "preload", preferred: true, km: 0 };
        return { type: "Long Run", detail: daysToRace > 21 ? "22km easy — last big effort" : "14km easy", icon: "🌅", macroDay: "longrun", preferred: true, km: daysToRace > 21 ? 22 : 14 };
      case 0: return { type: "Reformer Pilates", detail: "Full class. Keep the routine through taper.", icon: "🧘", macroDay: "active", preferred: true, km: 0 };
    }
  }
  return { type: "Rest", detail: "Rest", icon: "😴", macroDay: "rest", preferred: false };
}

const macroCals  = { hard: 2800, easy: 2400, active: 2200, rest: 2000, longrun: 3800, preload: 2900 };
const macroColor = { hard: "#f97316", easy: "#60a5fa", active: "#4ade80", rest: "#818cf8", longrun: "#a78bfa", preload: "#c084fc" };
// Dynamic calorie calculator based on actual planned km
// At 90kg: ~90 kcal/km easy, ~100 kcal/km tempo/intervals (higher intensity)
// Resting TDEE base: ~2200/day (excludes active calories)
// Dog walks add ~300 kcal daily regardless
export function calcDayMacros(macroDay, km, phase) {
  const base = 2200; // resting metabolic
  const walks = 300; // daily dog walks always
  const kcalPerKm = (macroDay === "hard") ? 100 : 90; // intensity factor
  const runBurn = Math.round((km || 0) * kcalPerKm);
  const totalBurn = base + walks + runBurn;

  // BASE phase (Apr–May): aggressive deficit on low-intensity days to maximise fat loss
  // BUILD/PEAK/TAPER: standard deficit — performance takes priority
  const isBase = phase === "BASE";

  let deficit = 0;
  if (macroDay === "longrun")       deficit = 200;                  // always fuel long runs
  else if (macroDay === "preload")  deficit = isBase ? 350 : 300;   // modest — eating for tomorrow
  else if (macroDay === "hard")     deficit = isBase ? 500 : 400;   // tempo OK to cut a bit more
  else if (macroDay === "easy")     deficit = isBase ? 650 : 450;   // big cut on easy days in BASE
  else if (macroDay === "active")   deficit = isBase ? 600 : 400;   // pilates/strength — cut hard
  else                              deficit = isBase ? 700 : 500;   // rest day: maximum deficit

  const eatKcal = Math.max(1800, totalBurn - deficit);

  // Protein: always 155g (620 kcal)
  const proteinG = 155;
  const proteinKcal = proteinG * 4;

  // Fat: capped at sensible levels — not a fat-loss lever, just enough for hormones/satiety
  const fatG = macroDay === "longrun" ? 85 : macroDay === "hard" ? 80 : 70;
  const fatKcal = fatG * 9;

  // Carbs: fill remaining calories after protein and fat
  const carbsKcal = Math.max(0, eatKcal - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);

  return {
    kcal: Math.round(eatKcal),
    protein: proteinG,
    carbs: carbsG,
    fat: fatG,
    burn: totalBurn,
    runBurn,
    deficit: Math.round(deficit),
  };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function generateAllDays() {
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
  const [dayRecipes, setDayRecipes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ams_recipes") || "{}"); } catch { return {}; }
  });
  const [dayKept, setDayKept] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("ams_kept") || "{}");
      // Convert arrays back to Sets
      return Object.fromEntries(Object.entries(raw).map(([k,v]) => [k, new Set(v)]));
    } catch { return {}; }
  });
  const [dayRecipeLoading, setDayRecipeLoading] = useState({});
  const [dayRecipeError, setDayRecipeError] = useState({});

  // Load from Supabase on mount
  useEffect(() => {
    dbGet("ams_recipes").then(v => { if (v) setDayRecipes(v); });
    dbGet("ams_kept").then(v => {
      if (v) setDayKept(Object.fromEntries(Object.entries(v).map(([k,a]) => [k, new Set(a)])));
    });
  }, []);

  function saveDayRecipes(updated) {
    setDayRecipes(updated);
    localStorage.setItem("ams_recipes", JSON.stringify(updated));
    dbSet("ams_recipes", updated);
  }

  function saveDayKept(updated) {
    setDayKept(updated);
    // Convert Sets to arrays for serialisation
    const serialisable = Object.fromEntries(Object.entries(updated).map(([k,s]) => [k, [...s]]));
    localStorage.setItem("ams_kept", JSON.stringify(serialisable));
    dbSet("ams_kept", serialisable);
  }
  const [daySwappingMeal, setDaySwappingMeal] = useState({}); // { dayKey: mealName }
  const [dayPhotoLog, setDayPhotoLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ams_photolog") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    dbGet("ams_photolog").then(v => { if (v) setDayPhotoLog(v); });
  }, []);
  function savePhotoLog(key, entries) {
    const updated = { ...dayPhotoLog, [key]: entries };
    setDayPhotoLog(updated);
    localStorage.setItem("ams_photolog", JSON.stringify(updated));
    dbSet("ams_photolog", updated);
  }

  // Plan overrides — keyed by dateKey, stores custom activity or null (skip)
  const [overrides, setOverrides] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ams_overrides") || "{}"); } catch { return {}; }
  });
  useEffect(() => {
    dbGet("ams_overrides").then(v => { if (v) setOverrides(v); });
  }, []);
  function saveOverride(key, value) {
    const updated = { ...overrides, [key]: value };
    setOverrides(updated);
    localStorage.setItem("ams_overrides", JSON.stringify(updated));
    dbSet("ams_overrides", updated);
  }
  function clearOverride(key) {
    const updated = { ...overrides };
    delete updated[key];
    setOverrides(updated);
    localStorage.setItem("ams_overrides", JSON.stringify(updated));
    dbSet("ams_overrides", updated);
  }

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editDay, setEditDay] = useState(null); // dayKey of long-pressed day
  const [swapSource, setSwapSource] = useState(null); // dayKey of first selected day for swap
  const [holidayWeek, setHolidayWeek] = useState(null); // week start dateKey being modified

  function dateKey(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function swapDays(keyA, keyB) {
    // Get activities for both days
    const dayA = allDays.find(d => dateKey(d.date) === keyA);
    const dayB = allDays.find(d => dateKey(d.date) === keyB);
    if (!dayA || !dayB) return;
    const actA = overrides[keyA] || { type: dayA.type, detail: dayA.detail, icon: dayA.icon, macroDay: dayA.macroDay, km: dayA.km, fueling: dayA.fueling, preferred: dayA.preferred };
    const actB = overrides[keyB] || { type: dayB.type, detail: dayB.detail, icon: dayB.icon, macroDay: dayB.macroDay, km: dayB.km, fueling: dayB.fueling, preferred: dayB.preferred };
    const updated = { ...overrides, [keyA]: actB, [keyB]: actA };
    setOverrides(updated);
    localStorage.setItem("ams_overrides", JSON.stringify(updated));
    dbSet("ams_overrides", updated);
    setSwapSource(null);
  }

  function skipDay(key) {
    saveOverride(key, { type: "Rest (adjusted)", detail: "Session moved or skipped.", icon: "😴", macroDay: "rest", km: 0, preferred: false, skipped: true });
  }

  function setHolidayWeekMode(weekDays) {
    const updated = { ...overrides };
    weekDays.forEach(d => {
      const k = dateKey(d.date);
      const isLongRun = d.type.toLowerCase().includes("long") || d.km >= 18;
      const isHard = d.macroDay === "hard" || d.macroDay === "preload";
      const isRest = !d.preferred;
      if (isRest) {
        updated[k] = { type: "Rest / Walk", detail: "Holiday rest day.", icon: "🏖️", macroDay: "rest", km: 0, preferred: false, _holidayWeek: true };
      } else if (isLongRun) {
        updated[k] = { type: "Easy Run (holiday)", detail: "8km easy — holiday week", icon: "🏖️", macroDay: "easy", km: 8, preferred: true, _holidayWeek: true };
      } else if (isHard) {
        updated[k] = { type: "Easy Run (holiday)", detail: "6km easy — holiday week", icon: "🏖️", macroDay: "easy", km: 6, preferred: true, _holidayWeek: true };
      } else {
        // Keep easy runs and pilates but tag them
        updated[k] = { ...d, detail: d.detail + " (holiday week)", _holidayWeek: true, _overridden: true };
      }
    });
    setOverrides(updated);
    localStorage.setItem("ams_overrides", JSON.stringify(updated));
    dbSet("ams_overrides", updated);
    setHolidayWeek(null);
  }

  function resetWeek(weekDays) {
    const weekKeys = new Set(weekDays.map(d => dateKey(d.date)));
    const updated = {};
    Object.entries(overrides).forEach(([k, v]) => {
      if (!weekKeys.has(k)) updated[k] = v;
    });
    setOverrides(updated);
    localStorage.setItem("ams_overrides", JSON.stringify(updated));
    dbSet("ams_overrides", updated);
  }

  const activeRef = useRef(null);

  // Find the active day: today if within plan, else first day, else race day
  const today = new Date(); today.setHours(0,0,0,0);
  const planStart = new Date(START_DATE); planStart.setHours(0,0,0,0);
  const planEnd = new Date(RACE_DATE); planEnd.setHours(0,0,0,0);
  const activeDate = today < planStart ? planStart : today > planEnd ? planEnd : today;
  const activeDateStr = activeDate.toDateString();
  const isBeforePlan = today < planStart;
  const isAfterPlan = today > planEnd;

  useEffect(() => {
    if (activeRef.current) activeRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [filter]);

  const filtered = (filter === "ALL" ? allDays : allDays.filter(d => d.phase.name === filter))
    .map(day => {
      const dk = dateKey(day.date);
      const ov = overrides[dk];
      return ov ? { ...day, ...ov, _overridden: true } : day;
    });

  const byMonth = {};
  filtered.forEach(day => {
    const key = `${day.date.getFullYear()}-${String(day.date.getMonth()).padStart(2,"0")}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(day);
  });

  // Group allDays into weeks for holiday mode
  function getWeekDays(anyDay) {
    const d = new Date(anyDay.date);
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); mon.setHours(0,0,0,0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
    return allDays.filter(x => {
      const xd = new Date(x.date); xd.setHours(12,0,0,0);
      return xd >= mon && xd <= sun;
    });
  }

  return (
    <div style={{ background: "#0a0a0f", minHeight: "100vh", fontFamily: "'Courier New', monospace", color: "#e2e8f0" }}>

      {/* Sticky sub-header — sits below the nav bar (nav = ~52px) */}
      <div style={{
        background: "#0a0a0f",
        borderBottom: "1px solid #1e293b",
        padding: "10px 14px 8px",
        position: "sticky",
        top: "52px",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "1px" }}>
            28 Mar → 18 Oct · {allDays.length} days · Tap any day for nutrition
          </div>

        </div>

        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px", WebkitOverflowScrolling: "touch" }}>
          {["ALL","BASE","BUILD","PEAK","TAPER"].map(f => {
            const ph = phases.find(p => p.name === f);
            const col = ph ? ph.color : "#94a3b8";
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "5px 12px", border: `1px solid ${filter === f ? col : "#1e293b"}`,
                borderRadius: "6px", background: filter === f ? `${col}20` : "transparent",
                color: filter === f ? col : "#475569", cursor: "pointer",
                fontSize: "10px", letterSpacing: "2px", fontFamily: "'Courier New', monospace",
                flexShrink: 0, whiteSpace: "nowrap",
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
                  const isActive  = day.date.toDateString() === activeDateStr;
                  const isRace    = day.date.toDateString() === RACE_DATE.toDateString();
                  const isOpen    = expanded === dayKey;
                  const mc        = macroColor[day.macroDay];

                  const isEditingThis = editMode && editDay === dateKey(day.date);

                  return (
                    <div key={i} ref={isActive ? activeRef : null}
                      onPointerDown={(e) => {
                        const timer = setTimeout(() => {
                          setEditMode(true);
                          setEditDay(dateKey(day.date));
                          setSwapSource(null);
                        }, 500);
                        e.currentTarget._lpTimer = timer;
                      }}
                      onPointerUp={(e) => {
                        if (e.currentTarget._lpTimer) clearTimeout(e.currentTarget._lpTimer);
                      }}
                      onPointerLeave={(e) => {
                        if (e.currentTarget._lpTimer) clearTimeout(e.currentTarget._lpTimer);
                      }}
                      onClick={() => {
                        if (editMode) return; // don't expand in edit mode
                        setExpanded(isOpen ? null : dayKey);
                      }}
                      style={{
                        background: isRace ? "rgba(129,140,248,0.12)" : isActive ? "rgba(74,222,128,0.07)" : day.preferred ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.008)",
                        border: `1px solid ${isEditingThis ? "#f97316" : isOpen ? mc : isRace ? "#818cf8" : isActive ? "#4ade8060" : day.preferred ? "#1e293b" : "#0f172a"}`,
                        borderLeft: `3px solid ${day.phase.color}`,
                        borderRadius: "8px", padding: "9px 12px",
                        cursor: "pointer", transition: "border-color 0.15s",
                      }}>

                      {/* Top row */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        {/* Date */}
                        <div style={{ minWidth: "42px" }}>
                          <div style={{ fontSize: "9px", color: isActive ? "#4ade80" : "#475569", letterSpacing: "1px" }}>{DAYS[day.date.getDay()].toUpperCase()}</div>
                          <div style={{ fontSize: "17px", fontWeight: "bold", color: isActive ? "#4ade80" : isRace ? "#818cf8" : day.preferred ? "#e2e8f0" : "#334155", lineHeight: 1.1 }}>
                            {day.date.getDate()}
                          </div>
                          {isActive && <div style={{ fontSize: "7px", color: "#4ade80", letterSpacing: "1px" }}>{isBeforePlan ? "START" : isAfterPlan ? "RACE" : "TODAY"}</div>}
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
                                {calcDayMacros(day.macroDay, day.km, day.phase?.name).kcal.toLocaleString()} kcal
                              </div>
                              <div style={{ fontSize: "10px", color: "#334155" }}>{isOpen ? "▲" : "▼"}</div>
                            </div>
                          </div>
                          <div style={{ fontSize: "10px", color: day.preferred ? "#64748b" : "#1e293b", lineHeight: 1.4, marginTop: "2px" }}>
                            {day.detail}
                          </div>
                        </div>
                      </div>

                      {/* Edit mode controls — shown on long-pressed day or swap target */}
                      {editMode && (isEditingThis || swapSource) && !isOpen && (
                        <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: "5px", marginTop: "6px", paddingTop: "6px", borderTop: "1px solid #1e293b" }}>
                          {swapSource && swapSource !== dayKey ? (
                            <button onClick={() => swapDays(swapSource, dateKey(day.date))} style={{
                              flex: 1, padding: "6px", background: "rgba(250,204,21,0.12)", border: "1px solid #facc15",
                              borderRadius: "5px", color: "#facc15", fontSize: "9px", cursor: "pointer", fontFamily: "'Courier New', monospace",
                            }}>↔ SWAP HERE</button>
                          ) : (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setEditMode(false); setEditDay(null); setSwapSource(null); }} style={{
                                flex: 1, padding: "6px", background: "transparent", border: "1px solid #f97316",
                                borderRadius: "5px", color: "#f97316", fontSize: "9px", cursor: "pointer", fontFamily: "'Courier New', monospace",
                              }}>✕ DONE</button>
                              <button onClick={() => setSwapSource(swapSource === dateKey(day.date) ? null : dateKey(day.date))} style={{
                                flex: 1, padding: "6px",
                                background: swapSource === dateKey(day.date) ? "rgba(250,204,21,0.15)" : "transparent",
                                border: `1px solid ${swapSource === dateKey(day.date) ? "#facc15" : "#1e293b"}`,
                                borderRadius: "5px", color: swapSource === dateKey(day.date) ? "#facc15" : "#475569",
                                fontSize: "9px", cursor: "pointer", fontFamily: "'Courier New', monospace",
                              }}>{swapSource === dateKey(day.date) ? "✕ CANCEL" : "⇄ SWAP"}</button>
                              <button onClick={() => {
                                const wdays = getWeekDays(day);
                                const hasOverrides = wdays.some(d => overrides[dateKey(d.date)]);
                                if (hasOverrides) resetWeek(wdays);
                                else setHolidayWeekMode(wdays);
                              }} style={{
                                flex: 1, padding: "6px", background: "transparent", border: "1px solid #1e293b",
                                borderRadius: "5px", color: "#475569", fontSize: "9px", cursor: "pointer", fontFamily: "'Courier New', monospace",
                              }}>{getWeekDays(day).some(d => overrides[dateKey(d.date)]) ? "↺ WEEK" : "🏖 WEEK"}</button>
                              <button onClick={() => skipDay(dateKey(day.date))} style={{
                                flex: 1, padding: "6px", background: "transparent", border: "1px solid #1e293b",
                                borderRadius: "5px", color: "#475569", fontSize: "9px", cursor: "pointer", fontFamily: "'Courier New', monospace",
                              }}>✕ SKIP</button>
                              {day._overridden && (
                                <button onClick={() => clearOverride(dateKey(day.date))} style={{
                                  flex: 1, padding: "6px", background: "rgba(74,222,128,0.08)", border: "1px solid #4ade8040",
                                  borderRadius: "5px", color: "#4ade80", fontSize: "9px", cursor: "pointer", fontFamily: "'Courier New', monospace",
                                }}>↺ RESET</button>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Expanded nutrition panel */}
                      {isOpen && !editMode && <MacroPanel
                        macroDay={day.macroDay}
                        fueling={day.fueling}
                        km={day.km}
                        phase={day.phase?.name}
                        recipes={dayRecipes[dayKey] || null}
                        loadingRecipes={!!dayRecipeLoading[dayKey]}
                        recipeError={dayRecipeError[dayKey] || null}
                        keptExternal={dayKept[dayKey] || null}
                        onKeptChange={(newKept) => saveDayKept({ ...dayKept, [dayKey]: newKept })}
                        photoLog={dayPhotoLog[dayKey] || []}
                        onSavePhotoLog={(entries) => savePhotoLog(dayKey, entries)}
                        onGenerateRecipes={async () => {
                          if (dayRecipes[dayKey]) {
                            saveDayRecipes({ ...dayRecipes, [dayKey]: null });
                            return;
                          }
                          setDayRecipeLoading(p => ({ ...p, [dayKey]: true }));
                          setDayRecipeError(p => ({ ...p, [dayKey]: null }));
                          try {
                            const r = await generateDayRecipes(day.macroDay);
                            saveDayRecipes({ ...dayRecipes, [dayKey]: r });
                          } catch (err) {
                            setDayRecipeError(p => ({ ...p, [dayKey]: err.message || "Failed to generate. Try again." }));
                          }
                          setDayRecipeLoading(p => ({ ...p, [dayKey]: false }));
                        }}
                        swappingMeal={daySwappingMeal[dayKey] || null}
                        onSwapMeal={async (mealName, budget, userPrompt) => {
                          setDaySwappingMeal(p => ({ ...p, [dayKey]: mealName }));
                          try {
                            const apiKey = localStorage.getItem("oai_key");
                            if (!apiKey) throw new Error("No OpenAI key");
                            const macroInfo = macroData[day.macroDay] || macroData["hard"];
                            const mealP = budget ? Math.round(budget.remP / Math.max(1, budget.count)) : Math.round(macroInfo.protein / 5);
                            const mealC = budget ? Math.round(budget.remC / Math.max(1, budget.count)) : Math.round(macroInfo.carbs   / 5);
                            const mealF = budget ? Math.round(budget.remF / Math.max(1, budget.count)) : Math.round(macroInfo.fat     / 5);
                            const cuisineNote = userPrompt ? `User request: "${userPrompt}". Build the recipe around this specifically.` : "Any cuisine, keep it interesting and varied.";
                            const prompt = `Generate a single meal recipe as JSON. No explanation, no markdown, no extra text — only the raw JSON object.\n\nMeal slot: ${mealName}\nCuisine/style: ${userPrompt || "varied, interesting"}\nFor: Ross Hunter, marathon runner, 90kg\nDay type: ${macroInfo.label}\nMacro target: P:${mealP}g C:${mealC}g F:${mealF}g\nAvoid: cottage cheese, feta, tuna\n\nReturn ONLY this JSON structure with no other text:\n{"meal":"${mealName}","name":"RECIPE NAME","time":"X min","macros":{"kcal":0,"protein":0,"carbs":0,"fat":0},"ingredients":["200g item","1 tbsp item"],"method":["Step 1","Step 2"]}`;
                            
                            async function callSwapAPI(msgs) {
                              const r = await fetch("https://api.openai.com/v1/chat/completions", {
                                method: "POST",
                                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
                                body: JSON.stringify({ model: "gpt-4o", max_tokens: 1000, messages: msgs }),
                              });
                              const d = await r.json();
                              if (d.error) throw new Error(d.error.message);
                              return d.choices?.[0]?.message?.content || "";
                            }

                            let text = await callSwapAPI([
                              { role: "system", content: "You are a JSON API. You respond with only valid JSON objects, no markdown, no explanation." },
                              { role: "user", content: prompt }
                            ]);
                            let newMeal;
                            try {
                              newMeal = safeParseJSON(text);
                            } catch {
                              // Retry with even stricter instruction
                              text = await callSwapAPI([
                                { role: "system", content: "You are a JSON API. Output ONLY a raw JSON object. No backticks, no markdown, no words before or after the JSON." },
                                { role: "user", content: prompt },
                                { role: "assistant", content: "{" },
                              ]);
                              newMeal = safeParseJSON("{" + text.replace(/^\s*\{/, ""));
                            }
                            // Force meal field to exactly match mealName so lookup always works
                            newMeal.meal = mealName;
                            const existing = dayRecipes[dayKey];
                            const baseMeals = existing ? existing.meals : (macroData[day.macroDay] || macroData["hard"]).meals.map(m => ({
                              meal: m.meal, name: m.food, time: "—",
                              macros: { kcal: (m.p*4 + m.c*4 + m.f*9), protein: m.p, carbs: m.c, fat: m.f },
                              ingredients: [m.food], method: ["Prepare as described."]
                            }));
                            saveDayRecipes({ ...dayRecipes, [dayKey]: { meals: baseMeals.map(m =>
                              (m.meal || "").toLowerCase() === mealName.toLowerCase() ? newMeal : m
                            )}});
                          } catch(err) {
                            setDayRecipeError(p => ({ ...p, [dayKey]: err.message || "Swap failed." }));
                          }
                          setDaySwappingMeal(p => ({ ...p, [dayKey]: null }));
                        }}
                      />}
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
