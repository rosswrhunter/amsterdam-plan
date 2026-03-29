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
      { meal: "Lunch", food: "Large salad + tuna 180g + chickpeas 120g + olive oil", p: 46, c: 45, f: 18 },
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


// Precision Hydration fueling plans — heavy sweater
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

const DISLIKED = ["cottage cheese"];

async function generateDayRecipes(macroDay) {
  const m = macroData[macroDay] || macroData["hard"];
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
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

function RecipeCard({ recipe, color }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${open ? color : "#1e293b"}`, borderRadius: "8px", marginBottom: "6px", overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "9px 11px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#e2e8f0" }}>{recipe.name}</div>
          <div style={{ display: "flex", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "9px", color: "#475569" }}>⏱ {recipe.time}</span>
            <span style={{ fontSize: "9px", color: "#4ade80" }}>{recipe.macros?.kcal} kcal</span>
            <span style={{ fontSize: "9px", color: "#60a5fa" }}>P:{recipe.macros?.protein}g</span>
            <span style={{ fontSize: "9px", color: "#facc15" }}>C:{recipe.macros?.carbs}g</span>
          </div>
        </div>
        <span style={{ fontSize: "10px", color: "#334155" }}>{open ? "▲" : "▼"}</span>
      </div>
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

function MacroPanel({ macroDay, fueling, km }) {
  const m = macroData[macroDay] || macroData["hard"];
  const dyn = calcDayMacros(macroDay, km);
  const color = m.color;
  const [recipes, setRecipes] = useState(null);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  return (
    <div style={{ marginTop: "10px", borderTop: `1px solid ${color}30`, paddingTop: "10px" }}>
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

        {/* Macro bars */}
        {[
          { name: "PROTEIN", value: dyn.protein, unit: "g", max: 200, color: "#60a5fa" },
          { name: "CARBS", value: dyn.carbs, unit: "g", max: 550, color: "#facc15" },
          { name: "FAT", value: dyn.fat, unit: "g", max: 130, color: "#f97316" },
        ].map(bar => (
          <div key={bar.name} style={{ marginBottom: "7px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
              <span style={{ fontSize: "9px", color: "#64748b", letterSpacing: "1px" }}>{bar.name}</span>
              <span style={{ fontSize: "10px", fontWeight: "bold", color: bar.color }}>{bar.value}{bar.unit}</span>
            </div>
            <MacroBar value={bar.value} max={bar.max} color={bar.color} />
          </div>
        ))}
        <div style={{ fontSize: "9px", color: "#334155", marginTop: "6px", lineHeight: 1.4 }}>💡 {m.note}</div>
      </div>

      {/* Meals */}
      <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "6px" }}>MEALS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {m.meals.map(meal => (
          <div key={meal.meal} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1e293b", borderRadius: "6px", padding: "7px 10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span style={{ fontSize: "9px", color, letterSpacing: "1px" }}>{meal.meal.toUpperCase()}</span>
              <span style={{ fontSize: "9px", color: "#475569" }}>P:{meal.p} C:{meal.c} F:{meal.f}</span>
            </div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>{meal.food}</div>
          </div>
        ))}
      </div>
      {fueling && <FuelingPanel fueling={fueling} />}

      {/* Recipe Generator */}
      <div style={{ marginTop: "10px" }}>
        <button
          onClick={async () => {
            if (recipes) { setRecipes(null); return; }
            setLoadingRecipes(true);
            try { const r = await generateDayRecipes(macroDay); setRecipes(r); }
            catch { /* silent */ }
            setLoadingRecipes(false);
          }}
          disabled={loadingRecipes}
          style={{
            width: "100%", padding: "10px",
            background: loadingRecipes ? "rgba(255,255,255,0.02)" : `${color}10`,
            border: `1px solid ${loadingRecipes ? "#1e293b" : color + "50"}`,
            borderRadius: "7px", color: loadingRecipes ? "#334155" : color,
            fontSize: "10px", letterSpacing: "2px", cursor: loadingRecipes ? "default" : "pointer",
            fontFamily: "'Courier New', monospace", transition: "all 0.2s",
          }}>
          {loadingRecipes ? "GENERATING RECIPES…" : recipes ? "✕ HIDE RECIPES" : "🍳 GENERATE DAY RECIPES"}
        </button>

        {recipes && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "8px" }}>AI RECIPES · {m.label.toUpperCase()}</div>
            {recipes.meals?.map((meal, i) => (
              <div key={i}>
                <div style={{ fontSize: "9px", color, letterSpacing: "1px", margin: "8px 0 4px" }}>{meal.meal?.toUpperCase()}</div>
                <RecipeCard recipe={meal} color={color} />
              </div>
            ))}
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
export function calcDayMacros(macroDay, km) {
  const base = 2200; // resting metabolic
  const walks = 300; // daily dog walks always
  const kcalPerKm = (macroDay === "hard") ? 100 : 90; // intensity factor
  const runBurn = Math.round((km || 0) * kcalPerKm);
  const totalBurn = base + walks + runBurn;

  // Deficit: 400-500 on easy/rest days, 0 deficit on long runs (fuel fully), small deficit otherwise
  let deficit = 0;
  if (macroDay === "longrun") deficit = 200; // barely deficit on long run, body needs fuel
  else if (macroDay === "preload") deficit = 300;
  else if (macroDay === "hard") deficit = 400;
  else if (macroDay === "easy") deficit = 450;
  else if (macroDay === "active") deficit = 400;
  else deficit = 500; // rest day

  const eatKcal = Math.max(1800, totalBurn - deficit);

  // Macro split: carbs scale with km, protein always 155g, fat fills rest
  const proteinG = 155;
  const proteinKcal = proteinG * 4;

  // Carbs: base 120g + 8g per km (more carbs for harder/longer sessions)
  const carbsG = Math.round(Math.min(550, 120 + (km || 0) * 8));
  const carbsKcal = carbsG * 4;

  // Fat fills remaining
  const fatKcal = Math.max(200, eatKcal - proteinKcal - carbsKcal);
  const fatG = Math.round(fatKcal / 9);

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

  const filtered = filter === "ALL" ? allDays : allDays.filter(d => d.phase.name === filter);

  const byMonth = {};
  filtered.forEach(day => {
    const key = `${day.date.getFullYear()}-${String(day.date.getMonth()).padStart(2,"0")}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(day);
  });

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
        <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "1px", marginBottom: "8px" }}>
          30 Mar → 18 Oct · {allDays.length} days · Tap any day for nutrition
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

                  return (
                    <div key={i} ref={isActive ? activeRef : null}
                      onClick={() => setExpanded(isOpen ? null : dayKey)}
                      style={{
                        background: isRace ? "rgba(129,140,248,0.12)" : isActive ? "rgba(74,222,128,0.07)" : day.preferred ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.008)",
                        border: `1px solid ${isOpen ? mc : isRace ? "#818cf8" : isActive ? "#4ade8060" : day.preferred ? "#1e293b" : "#0f172a"}`,
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
                                {calcDayMacros(day.macroDay, day.km).kcal.toLocaleString()} kcal
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
                      {isOpen && <MacroPanel macroDay={day.macroDay} fueling={day.fueling} km={day.km} />}
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
