import { products } from "../src/products.js";

const MODEL = "gemini-3.5-lite"; // if this errors, try "gemini-2.0-flash"

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { query } = req.body || {};
  if (typeof query !== "string" || !query.trim() || query.length > 300) {
    return res.status(400).json({ error: "Provide a query under 300 characters." });
  }

  const systemPrompt = `You are a product recommendation engine.
Choose ONLY from the catalog provided. Respect budget and category constraints strictly.
If nothing matches, return an empty ids array and explain why in "reason".
Keep "reason" to one short sentence.`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: "user",
              parts: [
                { text: `Catalog: ${JSON.stringify(products)}\n\nUser request: ${query}` },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                ids: { type: "ARRAY", items: { type: "INTEGER" } },
                reason: { type: "STRING" },
              },
              required: ["ids", "reason"],
            },
          },
        }),
      }
    );

    if (r.status === 429) {
      return res.status(429).json({ error: "Rate limit reached. Try again in a minute." });
    }
    if (!r.ok) {
      const detail = await r.text();
      console.error("Gemini error", r.status, detail);
      return res.status(502).json({ error: `AI service error (${r.status})` });
    }

    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text);

    // Validate: keep only IDs that really exist in our catalog
    const valid = new Set(products.map((p) => p.id));
    const ids = (Array.isArray(parsed.ids) ? parsed.ids : []).filter((id) => valid.has(id));

    return res.status(200).json({ ids, reason: parsed.reason || "" });
  } catch (e) {
    console.error("Handler crashed:", e);
    return res.status(500).json({ error: "Something went wrong" });
  }
}