import { useState } from "react";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmt(d) { return `${d.getDate()} ${MONTHS[d.getMonth()]}`; }

const CATEGORIES = ["Protein", "Carbs & grains", "Vegetables & fruit", "Dairy & eggs", "Fats & oils", "Sauces & spices", "Other"];

function categorise(ingredient) {
  const i = ingredient.toLowerCase();
  if (/chicken|beef|salmon|fish|egg|protein shake|whey|casein|turkey|pork|mince|prawn|shrimp/.test(i)) return "Protein";
  if (/rice|pasta|oat|bread|toast|bagel|wrap|potato|sweet potato|quinoa|lentil|chickpea|bean|flour|granola|honey|banana|gel|carb/.test(i)) return "Carbs & grains";
  if (/broccoli|spinach|kale|salad|veg|pepper|onion|garlic|tomato|courgette|cucumber|celery|carrot|mushroom|avocado|apple|berry|fruit|greens|leek/.test(i)) return "Vegetables & fruit";
  if (/yogurt|milk|cheese|cream|butter|egg/.test(i)) return "Dairy & eggs";
  if (/olive oil|oil|nut|almond|walnut|peanut butter|seed|chia|flax/.test(i)) return "Fats & oils";
  if (/salt|pepper|paprika|turmeric|cumin|spice|sauce|soy|vinegar|herb|parsley|coriander|basil|oregano|stock|broth/.test(i)) return "Sauces & spices";
  return "Other";
}

export default function ShoppingList({ allDays }) {
  const today = new Date(); today.setHours(0,0,0,0);

  // Default: today + next 6 days
  const [startIdx, setStartIdx] = useState(() => {
    const idx = allDays.findIndex(d => { const d2 = new Date(d.date); d2.setHours(0,0,0,0); return d2.getTime() === today.getTime(); });
    return Math.max(0, idx);
  });
  const [numDays, setNumDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(null); // { category: [{name, checked}] }
  const [ticked, setTicked] = useState(new Set());

  const selectedDays = allDays.slice(startIdx, startIdx + numDays);
  const startDay = selectedDays[0]?.date;
  const endDay = selectedDays[selectedDays.length - 1]?.date;

  // Collect all meal foods for selected days
  function getMealFoods() {
    const foods = [];
    selectedDays.forEach(day => {
      const macroDay = day.macroDay;
      const macroMap = {
        hard:    ["Oats 100g", "Banana x2", "Eggs x2", "Greek yogurt 150g", "Rice cakes x2", "Honey", "Rice 250g", "Chicken breast 180g", "Mixed veg", "Apple", "Salmon 180g", "Sweet potato (large)", "Green veg"],
        easy:    ["Eggs x3", "Wholegrain bread", "Fruit", "Greek yogurt 100g", "Chicken breast 150g", "Quinoa 180g", "Salad leaves", "Olive oil", "Almonds", "Protein shake", "Lean beef 180g", "Roasted veg", "Rice 150g", "Greek yogurt 150g"],
        active:  ["Eggs x3", "Smoked salmon", "Avocado", "Greens", "Grilled chicken 150g", "Chickpeas 120g", "Olive oil", "Protein shake", "Walnuts", "Chicken thighs 220g", "Lentils 120g", "Rice 100g", "Greek yogurt 200g"],
        rest:    ["Greek yogurt 200g", "Berries", "Eggs x3", "Grilled chicken 180g", "Chickpeas 80g", "Protein shake", "Celery", "Cucumber", "White fish 220g", "Broccoli", "Sweet potato (medium)", "Greek yogurt 150g"],
        longrun: ["Oats 150g", "Banana x2", "Honey", "Eggs x2", "PH Carb gels x3", "Chocolate milk 500ml", "Protein shake", "Rice 300g", "Chicken breast 200g", "Roasted veg", "Bagel", "Peanut butter", "Salmon 200g", "Pasta 150g dry", "Greek yogurt 200g"],
        preload: ["Oats 100g", "Banana", "Honey", "Greek yogurt 150g", "Rice 250g", "Chicken breast 180g", "Low-fibre veg", "Rice cakes x3", "Jam", "Pasta 200g dry", "Tomato sauce", "Lean chicken 150g", "Granola 50g"],
      };
      (macroMap[macroDay] || macroMap.easy).forEach(f => foods.push(f));
    });
    return foods;
  }

  async function generateList() {
    const apiKey = localStorage.getItem("oai_key");
    if (!apiKey) return;
    setLoading(true);
    setTicked(new Set());

    const mealFoods = getMealFoods();
    const dayTypes = selectedDays.map(d => `${DAYS[d.date.getDay()]} ${fmt(d.date)}: ${d.type}${d.km ? ` (${d.km}km)` : ""}`).join("\n");

    const prompt = `Create a consolidated shopping list for Ross Hunter's marathon training meals for ${numDays} days.

Training days:
${dayTypes}

Base ingredients needed (may have duplicates to consolidate):
${mealFoods.join(", ")}

Instructions:
- Consolidate duplicates (e.g. multiple "chicken breast" entries → one total quantity)
- Add realistic quantities for ${numDays} days
- Categorise every item into one of: ${CATEGORIES.join(", ")}
- Include only real grocery items (skip "protein shake" unless specifying a tub)
- Make quantities practical (e.g. "Chicken breast 1.2kg" not "Chicken breast 180g x6")
- No cottage cheese, no feta, no tuna

Return ONLY valid JSON, no markdown:
{
  "categories": {
    "Protein": ["Chicken breast 1.2kg", "Salmon fillets 400g"],
    "Carbs & grains": ["Oats 500g", "Rice 1kg"],
    "Vegetables & fruit": ["Bananas x8", "Sweet potatoes x4"],
    "Dairy & eggs": ["Eggs x18", "Greek yogurt 4x500g"],
    "Fats & oils": ["Olive oil 500ml", "Almonds 200g"],
    "Sauces & spices": ["Smoked paprika", "Chicken stock"],
    "Other": []
  }
}`;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o", max_tokens: 1500,
          messages: [
            { role: "system", content: "You are a JSON API. Respond only with a valid JSON object, no markdown, no explanation." },
            { role: "user", content: prompt }
          ]
        }),
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "";
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setItems(parsed.categories);
    } catch (e) {
      alert("Failed to generate list. Try again.");
    }
    setLoading(false);
  }

  function toggleItem(cat, idx) {
    const key = `${cat}:${idx}`;
    setTicked(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function exportList() {
    if (!items) return;
    const lines = ["🛒 SHOPPING LIST", `${fmt(startDay)} – ${fmt(endDay)}`, ""];
    Object.entries(items).forEach(([cat, catItems]) => {
      const unticked = catItems.filter((_, i) => !ticked.has(`${cat}:${i}`));
      if (unticked.length === 0) return;
      lines.push(`── ${cat.toUpperCase()} ──`);
      unticked.forEach(item => lines.push(`□ ${item}`));
      lines.push("");
    });
    lines.push("Generated by Amsterdam Marathon Plan");

    const text = lines.join("\n");

    if (navigator.share) {
      navigator.share({ title: "Shopping List", text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text);
      alert("Copied to clipboard!");
    }
  }

  const totalItems = items ? Object.values(items).reduce((s, arr) => s + arr.length, 0) : 0;
  const tickedCount = ticked.size;
  const remaining = totalItems - tickedCount;

  return (
    <div style={{ padding: "16px 14px 80px", fontFamily: "'Courier New', monospace", color: "#e2e8f0" }}>

      {/* Header */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "10px", color: "#475569", letterSpacing: "3px" }}>SHOPPING LIST</div>
        <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>Generate from your meal plan</div>
      </div>

      {/* Day range selector */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "7px" }}>START DAY</div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button onClick={() => setStartIdx(i => Math.max(0, i - 1))} style={{ padding: "6px 12px", background: "transparent", border: "1px solid #1e293b", borderRadius: "6px", color: "#475569", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>‹</button>
          <div style={{ flex: 1, textAlign: "center", fontSize: "12px", color: "#e2e8f0" }}>
            {startDay ? fmt(startDay) : "—"}
            {startDay && <span style={{ fontSize: "9px", color: "#475569", marginLeft: "6px" }}>{DAYS[startDay.getDay()]}</span>}
          </div>
          <button onClick={() => setStartIdx(i => Math.min(allDays.length - 1, i + 1))} style={{ padding: "6px 12px", background: "transparent", border: "1px solid #1e293b", borderRadius: "6px", color: "#475569", cursor: "pointer", fontFamily: "'Courier New', monospace" }}>›</button>
        </div>
      </div>

      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "9px", color: "#475569", letterSpacing: "2px", marginBottom: "7px" }}>NUMBER OF DAYS</div>
        <div style={{ display: "flex", gap: "6px" }}>
          {[3, 5, 7, 10, 14].map(n => (
            <button key={n} onClick={() => setNumDays(n)} style={{
              flex: 1, padding: "8px 4px",
              border: `1px solid ${numDays === n ? "#4ade80" : "#1e293b"}`,
              borderRadius: "6px", background: numDays === n ? "rgba(74,222,128,0.12)" : "transparent",
              color: numDays === n ? "#4ade80" : "#475569", cursor: "pointer",
              fontFamily: "'Courier New', monospace", fontSize: "11px",
            }}>{n}d</button>
          ))}
        </div>
        {startDay && endDay && (
          <div style={{ fontSize: "10px", color: "#334155", marginTop: "6px" }}>
            {fmt(startDay)} → {fmt(endDay)} · {selectedDays.length} days · {selectedDays.reduce((s,d) => s + (d.km||0), 0)}km planned
          </div>
        )}
      </div>

      <button onClick={generateList} disabled={loading} style={{
        width: "100%", padding: "13px",
        background: loading ? "rgba(255,255,255,0.02)" : "rgba(74,222,128,0.1)",
        border: `1px solid ${loading ? "#1e293b" : "#4ade80"}`,
        borderRadius: "8px", color: loading ? "#334155" : "#4ade80",
        fontSize: "12px", letterSpacing: "2px", cursor: loading ? "default" : "pointer",
        fontFamily: "'Courier New', monospace", fontWeight: "bold", marginBottom: "16px",
      }}>
        {loading ? "GENERATING LIST…" : "🛒 GENERATE SHOPPING LIST"}
      </button>

      {items && (
        <div>
          {/* Progress + export */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ fontSize: "10px", color: "#475569" }}>
              {tickedCount > 0 ? `${tickedCount} ticked off · ` : ""}{remaining} remaining
            </div>
            <button onClick={exportList} style={{
              padding: "7px 14px", background: "rgba(129,140,248,0.15)", border: "1px solid #818cf8",
              borderRadius: "6px", color: "#818cf8", fontSize: "10px", cursor: "pointer",
              fontFamily: "'Courier New', monospace", letterSpacing: "1px",
            }}>
              ↑ EXPORT UNTICKED
            </button>
          </div>

          {/* Categories */}
          {Object.entries(items).map(([cat, catItems]) => {
            if (!catItems?.length) return null;
            const allDone = catItems.every((_, i) => ticked.has(`${cat}:${i}`));
            return (
              <div key={cat} style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "9px", color: allDone ? "#334155" : "#475569", letterSpacing: "2px", marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
                  {cat.toUpperCase()}
                  <span style={{ color: "#1e293b" }}>{catItems.filter((_,i) => ticked.has(`${cat}:${i}`)).length}/{catItems.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {catItems.map((item, i) => {
                    const key = `${cat}:${i}`;
                    const done = ticked.has(key);
                    return (
                      <div key={i} onClick={() => toggleItem(cat, i)} style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "9px 12px", cursor: "pointer",
                        background: done ? "transparent" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${done ? "#0f172a" : "#1e293b"}`,
                        borderRadius: "6px", transition: "all 0.15s",
                      }}>
                        <div style={{
                          width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0,
                          border: `1px solid ${done ? "#4ade80" : "#334155"}`,
                          background: done ? "#4ade80" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {done && <span style={{ fontSize: "10px", color: "#000" }}>✓</span>}
                        </div>
                        <span style={{ fontSize: "12px", color: done ? "#334155" : "#94a3b8", textDecoration: done ? "line-through" : "none" }}>{item}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Export button at bottom too */}
          <button onClick={exportList} style={{
            width: "100%", padding: "13px", marginTop: "8px",
            background: "rgba(129,140,248,0.1)", border: "1px solid #818cf8",
            borderRadius: "8px", color: "#818cf8", fontSize: "12px",
            cursor: "pointer", fontFamily: "'Courier New', monospace",
            fontWeight: "bold", letterSpacing: "2px",
          }}>
            ↑ EXPORT TO NOTES / REMINDERS
          </button>
        </div>
      )}
    </div>
  );
}
