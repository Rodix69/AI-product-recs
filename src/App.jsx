import { useState } from "react";
import { products } from "./products";
import "./App.css";

function ProductCard({ product, highlighted }) {
  return (
    <div className={`card ${highlighted ? "highlight" : ""}`}>
      <span className="tag">{product.category}</span>
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <strong>${product.price}</strong>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [recommendedIds, setRecommendedIds] = useState(null); // null = no search yet
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned an unexpected response (${res.status}).`);
      }

      if (!res.ok) throw new Error(data.error || "Request failed");
      setRecommendedIds(data.ids);
      setReason(data.reason);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setRecommendedIds(null);
    setReason("");
    setQuery("");
  }

  const visible =
    recommendedIds === null ? products : products.filter((p) => recommendedIds.includes(p.id));

  return (
    <main className="container">
      <h1>AI Product Finder</h1>
      <form onSubmit={handleSubmit} className="search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "I want a phone under $500"'
        />
        <button disabled={loading}>{loading ? "Thinking..." : "Recommend"}</button>
        {recommendedIds !== null && <button type="button" onClick={reset}>Show all</button>}
      </form>

      {error && <p className="error">{error}</p>}
      {reason && <p className="reason">{reason}</p>}
      {recommendedIds !== null && visible.length === 0 && <p>No matching products.</p>}

      <div className="grid">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} highlighted={recommendedIds !== null} />
        ))}
      </div>
    </main>
  );
}