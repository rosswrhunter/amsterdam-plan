import { useState } from "react";

const DISLIKED = ["cottage cheese"];

const macroData = {
  hard:    { label: "Hard Training Day",           kcal: 2800, protein: 155, carbs: 355, fat: 80,  color: "#f97316" },
  easy:    { label: "Easy Run Day",                kcal: 2400, protein: 155, carbs: 255, fat: 78,  color: "#60a5fa" },
  active:  { label: "Pilates / Strength Day",      kcal: 2200, protein: 155, carbs: 195, fat: 80,  color: "#4ade80" },
  rest:    { label: "Rest Day",                    kcal: 2000, protein: 155, carbs: 140, fat: 75,  color: "#818cf8" },
  longrun: { label: "Long Run Day",                kcal: 3800, protein: 160, carbs: 520, fat: 85,  color: "#a78bfa" },
  preload: { label: "Pre-Long Run (Carb Load)",    kcal: 2900, protein: 155, carbs: 420, fat: 70,  color: "#c084fc" },
};

const MEALS = ["Breakfast", "Pre-run snack", "Lunch", "Afternoon snack", "Dinner", "Evening snack"];

function buildPrompt(macroDay, mode, singleMeal) {
  const m = macroData[macroDay];
  const avoidStr = DISLIKED.join(", ");
  const modeInstr = mode === "full"
    ? `Generate a full day meal plan with 5–6 meals (Breakfast, Pre-run snack if applicable, Lunch, Afternoon snack, Dinner, Evening snack).`
    : `Generate 3 recipe options for: ${singleMeal}.`;

  return `You are a sports nutritionist creating recipes for Ross Hunter, a 39yo male marathon runner (90kg, Amsterdam Marathon 2026 goal sub-4:00).

Day type: ${m.label}
Daily targets: ${m.kcal} kcal | Protein: ${m.protein}g | Carbs: ${m.carbs}g | Fat: ${m.fat}g

${modeInstr}

IMPORTANT RULES:
- Do NOT use any of these ingredients: ${avoidStr}
- Each recipe must be practical, quick to make (under 30 min unless stated)
- Optimised for athletic performance and body recomposition
- Tasty and satisfying — not bland "diet food"
- Include exact quantities in grams or ml

Respond ONLY with valid JSON (no markdown, no backticks, no preamble) in this exact format:

${mode === "full" ? `{
  "meals": [
    {
      "meal": "Breakfast",
      "name": "Recipe name",
      "time": "5 min",
      "macros": { "kcal": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "ingredients": ["200g ingredient", "1 tbsp ingredient"],
      "method": ["Step 1", "Step 2"]
    }
  ]
}` : `{
  "options": [
    {
      "name": "Recipe name",
      "time": "10 min",
      "macros": { "kcal": 0, "protein": 0, "carbs": 0, "fat": 0 },
      "ingredients": ["200g ingredient", "1 tbsp ingredient"],
      "method": ["Step 1", "Step 2"]
    }
  ]
}`}`;
}

function RecipeCard({ recipe, color, onSwap, swapping }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${open ? color : "#1e293b"}`,
      borderRadius: "10px", marginBottom: "8px", overflow: "hidden",
    }}>
      {/* Header row */}
      <div onClick={() => setOpen(o => !o)} style={{
        padding: "11px 13px", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "12px", fontWeight: "bold", color: "#e2e8f0" }}>{recipe.name}</div>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "9px", color: "#475569" }}>⏱ {recipe.time}</span>
            <span style={{ fontSize: "9px", color: "#4ade80" }}>{recipe.macros.kcal} kcal</span>
            <span style={{ fontSize: "9px", color: "#60a5fa" }}>P:{recipe.macros.protein}g</span>
            <span style={{ fontSize: "9px", color: "#facc15" }}>C:{recipe.macros.carbs}g</span>
            <span style={{ fontSize: "9px", color: "#f97316" }}>F:{recipe.macros.fat}g</span>
          </div>
        </div>
        <span style={{ fontSize: "10px", color: "#334155", flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ padding: "0 13px 13px", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginTop: "10px", marginBottom: "5px" }}>INGREDIENTS</div>
          {recipe.ingredients.map((ing, i) => (
            <div key={i} style={{ fontSize: "11px", color: "#94a3b8", padding: "3px 0", borderBottom: "1px solid #0f172a" }}>• {ing}</div>
          ))}
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginTop: "10px", marginBottom: "5px" }}>METHOD</div>
          {recipe.method.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "5px" }}>
              <span style={{ fontSize: "10px", color: color, fontWeight: "bold", minWidth: "16px" }}>{i+1}.</span>
              <span style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MealSection({ meal, options, color, onSwap, swapping }) {
  return (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "10px", color, letterSpacing: "2px" }}>{meal.meal?.toUpperCase() || "OPTIONS"}</div>
        {onSwap && (
          <button onClick={onSwap} disabled={swapping} style={{
            padding: "3px 10px", background: "transparent",
            border: `1px solid ${color}40`, borderRadius: "5px",
            color: swapping ? "#334155" : color, fontSize: "9px",
            cursor: swapping ? "default" : "pointer",
            fontFamily: "'Courier New', monospace", letterSpacing: "1px",
          }}>
            {swapping ? "…" : "↻ SWAP"}
          </button>
        )}
      </div>
      {/* Full day: single recipe per meal */}
      {meal.name && <RecipeCard recipe={meal} color={color} />}
      {/* Single meal: 3 options */}
      {options && options.map((opt, i) => <RecipeCard key={i} recipe={opt} color={color} />)}
    </div>
  );
}

export default function Recipes({ allDays }) {
  const [macroDay, setMacroDay] = useState("easy");
  const [mode, setMode] = useState("full");
  const [singleMeal, setSingleMeal] = useState("Breakfast");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [swappingMeal, setSwappingMeal] = useState(null);

  async function callAI(prompt) {
    const apiKey = localStorage.getItem("oai_key");
    if (!apiKey) throw new Error("No OpenAI key — add it in the Coach tab first.");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.choices?.[0]?.message?.content || "";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  }

  async function generate(overrideMacroDay, overrideMode, overrideMeal) {
    const md = overrideMacroDay || macroDay;
    const mo = overrideMode || mode;
    const sm = overrideMeal || singleMeal;
    setLoading(true);
    setError(null);
    try {
      const parsed = await callAI(buildPrompt(md, mo, sm));
      setResult({ type: mo, data: parsed, macroDay: md });
    } catch (e) {
      setError(e.message || "Failed to generate recipes. Try again.");
    }
    setLoading(false);
  }

  async function swapMeal(mealName) {
    setSwappingMeal(mealName);
    try {
      const parsed = await callAI(buildPrompt(result.macroDay, "single", mealName));
      // Replace that meal in the existing full-day result
      setResult(prev => ({
        ...prev,
        data: {
          meals: prev.data.meals.map(m =>
            m.meal === mealName ? { ...parsed.options[0], meal: mealName } : m
          )
        }
      }));
    } catch (e) { /* silent */ }
    setSwappingMeal(null);
  }

  const m = macroData[macroDay];

  return (
    <div style={{ padding: "16px 14px 80px", fontFamily: "'Courier New', monospace", color: "#e2e8f0" }}>

      {/* Header */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "3px" }}>RECIPE GENERATOR</div>
        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>AI-powered, tailored to your macros</div>
      </div>

      {/* Day type selector */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "7px" }}>DAY TYPE</div>
        <div style={{ display: "flex", gap: "5px", overflowX: "auto", paddingBottom: "2px", WebkitOverflowScrolling: "touch" }}>
          {Object.entries(macroData).map(([key, val]) => (
            <button key={key} onClick={() => { setMacroDay(key); setResult(null); }} style={{
              padding: "6px 11px", border: `1px solid ${macroDay === key ? val.color : "#1e293b"}`,
              borderRadius: "6px", background: macroDay === key ? `${val.color}18` : "transparent",
              color: macroDay === key ? val.color : "#475569", cursor: "pointer",
              fontSize: "9px", letterSpacing: "1.5px", fontFamily: "'Courier New', monospace",
              flexShrink: 0, whiteSpace: "nowrap",
            }}>{key.toUpperCase()}</button>
          ))}
        </div>
        <div style={{ fontSize: "10px", color: "#334155", marginTop: "6px" }}>
          {m.kcal.toLocaleString()} kcal · P:{m.protein}g · C:{m.carbs}g · F:{m.fat}g
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "7px" }}>GENERATE</div>
        <div style={{ display: "flex", gap: "5px" }}>
          {[["full", "Full Day Plan"], ["single", "Single Meal"]].map(([val, label]) => (
            <button key={val} onClick={() => { setMode(val); setResult(null); }} style={{
              flex: 1, padding: "8px", border: `1px solid ${mode === val ? m.color : "#1e293b"}`,
              borderRadius: "6px", background: mode === val ? `${m.color}18` : "transparent",
              color: mode === val ? m.color : "#475569", cursor: "pointer",
              fontSize: "10px", fontFamily: "'Courier New', monospace",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Single meal picker */}
      {mode === "single" && (
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "7px" }}>WHICH MEAL</div>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
            {MEALS.map(meal => (
              <button key={meal} onClick={() => { setSingleMeal(meal); setResult(null); }} style={{
                padding: "5px 10px", border: `1px solid ${singleMeal === meal ? m.color : "#1e293b"}`,
                borderRadius: "6px", background: singleMeal === meal ? `${m.color}18` : "transparent",
                color: singleMeal === meal ? m.color : "#475569", cursor: "pointer",
                fontSize: "9px", fontFamily: "'Courier New', monospace", letterSpacing: "1px",
              }}>{meal}</button>
            ))}
          </div>
        </div>
      )}

      {/* Generate button */}
      <button onClick={() => generate()} disabled={loading} style={{
        width: "100%", padding: "13px",
        background: loading ? "rgba(255,255,255,0.03)" : `${m.color}18`,
        border: `1px solid ${loading ? "#1e293b" : m.color}`,
        borderRadius: "8px", color: loading ? "#334155" : m.color,
        fontSize: "12px", letterSpacing: "2px", cursor: loading ? "default" : "pointer",
        fontFamily: "'Courier New', monospace", fontWeight: "bold", marginBottom: "18px",
        transition: "all 0.2s",
      }}>
        {loading ? "GENERATING…" : "✦ GENERATE RECIPES"}
      </button>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid #ef444430", borderRadius: "8px", padding: "12px", marginBottom: "14px", fontSize: "11px", color: "#ef4444" }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div>
          <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "12px" }}>
            {result.type === "full" ? "FULL DAY PLAN" : `3 OPTIONS · ${singleMeal.toUpperCase()}`}
          </div>

          {result.type === "full" && result.data.meals?.map((meal, i) => (
            <MealSection
              key={i}
              meal={meal}
              options={null}
              color={m.color}
              onSwap={() => swapMeal(meal.meal)}
              swapping={swappingMeal === meal.meal}
            />
          ))}

          {result.type === "single" && (
            <MealSection
              meal={{}}
              options={result.data.options}
              color={m.color}
            />
          )}
        </div>
      )}
    </div>
  );
}
