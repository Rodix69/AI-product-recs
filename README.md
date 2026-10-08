# AI Product Finder

A small React app that recommends products from a catalog using natural-language preferences, powered by the Google Gemini API.

Type something like **"I want a phone under $500"** and the app highlights only the products that match.

**Live demo:** https://ai-product-recs.vercel.app/

---

## Features

- Product catalog displayed as a responsive card grid
- Natural-language search ("budget laptop for students", "noise cancelling headphones")
- AI returns product **IDs**, and the UI filters the real catalog by those IDs
- One-line explanation from the AI for each search
- Loading, error, and empty-result states
- "Show all" button to reset the view

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Backend | Vercel Serverless Function (Node.js) |
| AI | Google Gemini API (`generateContent`) |
| Hosting | Vercel |

## How It Works

```
Browser (React)  --POST {query}-->  /api/recommend  -->  Gemini API
      ^                                   |
      +----------- {ids, reason} <--------+
Browser filters the product list by ids
```

1. The user types a preference and submits the form.
2. The frontend sends `POST /api/recommend` with `{ query }`.
3. The serverless function sends the catalog and the query to Gemini and asks for structured JSON: `{ ids: number[], reason: string }`.
4. The function **validates every returned ID** against the real catalog and discards unknown ones.
5. The frontend filters the product list using the validated IDs and shows the reason.

## Design Decisions

- **API key stays on the server.** Calling Gemini directly from React would expose the key in the browser bundle. The serverless function reads it from an environment variable.
- **The model returns IDs, not product text.** This prevents the AI from inventing products. The app only ever displays items from the real catalog.
- **Structured output.** `responseMimeType: "application/json"` with a `responseSchema` makes the response shape predictable, and a low temperature (`0.2`) keeps results consistent.
- **Server-side validation.** The schema guarantees the type of the output, not that the IDs exist, so IDs are checked against the catalog before being returned.
- **Input validation.** The endpoint accepts `POST` only and rejects empty queries or queries over 300 characters, which limits abuse and cost.
- **Configurable model.** The model name comes from `GEMINI_MODEL`, so it can be changed in Vercel without touching the code.
- **Defensive response parsing.** The frontend never assumes the server returned JSON, so unexpected responses show a readable error instead of crashing.

## Project Structure

```
.
├── api/
│   └── recommend.js      # Serverless function: calls Gemini, validates IDs
├── src/
│   ├── App.jsx           # UI: search form, product grid, states
│   ├── App.css           # Styles
│   ├── main.jsx          # React entry point
│   └── products.js       # Product catalog (shared with the API)
├── index.html
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- [Vercel CLI](https://vercel.com/docs/cli): `npm install -g vercel`

### Installation

```bash
git clone <your-repo-url>
cd <your-repo-folder>
npm install
```

### Environment Variables

Create a `.env` file in the project root (it is git-ignored, so never commit it):

```
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-3.5-flash-lite
```

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Your Gemini API key |
| `GEMINI_MODEL` | No | Model ID to use. Defaults to `gemini-3.5-flash-lite` |

### Run Locally

```bash
vercel dev
```

Use `vercel dev` rather than `npm run dev`, because it also serves the `/api` function. Then open the URL shown in the terminal.

## Deployment (Vercel)

1. Push the repo to GitHub.
2. In Vercel, choose **Add New → Project** and import the repo. Vercel detects Vite automatically.
3. Under **Settings → Environment Variables**, add `GEMINI_API_KEY` and, optionally, `GEMINI_MODEL`.
4. Deploy. After changing any environment variable later, **redeploy**, since variables only apply to new deployments.

## API Reference

### `POST /api/recommend`

**Request body**

```json
{ "query": "I want a phone under $500" }
```

**Success response (200)**

```json
{
  "ids": [1, 2, 3, 5],
  "reason": "These phones are all priced under $500."
}
```

**Error responses**

| Status | Meaning |
|---|---|
| 400 | Missing, empty, or too-long query |
| 405 | Method other than POST |
| 429 | Gemini rate limit reached (free tier) |
| 502 | Gemini returned an error (the status is included in the message) |
| 500 | Unexpected server error |

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `Unexpected token 'T'... is not valid JSON` | `/api/recommend` returned a 404 page. Make sure `api/` is at the project root and is pushed to GitHub. |
| `AI service error (404)` | The model name is not available. Check `GEMINI_MODEL` and use a current model ID. |
| `AI service error (503)` | Gemini is temporarily overloaded. Wait a minute and retry. |
| `Rate limit reached` (429) | Free-tier limit hit. Wait and retry. |
| Blank page | A JavaScript error in the frontend. Open the browser console (F12) to see it. |
| Env var changes have no effect | Redeploy after changing variables in Vercel. |

## Known Limitations and Future Improvements

- **No retry or fallback.** Free-tier 503s are shown to the user. In production I would add retry with backoff and a fallback model.
- **Whole catalog is sent in the prompt.** This works for a small catalog. For thousands of products I would use embeddings and a vector search to pre-select candidates.
- **No rate limiting.** I would add per-IP limits (for example with Upstash) to protect the API quota.
- **Keyword and price fallback** filtering when the AI call fails.
- Response caching for repeated queries.
- TypeScript and automated tests (unit tests for ID validation, component tests for the UI states).
- A React error boundary so a rendering crash shows a fallback instead of a blank page.

## License

MIT