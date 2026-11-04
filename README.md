# NetBuddy — Secure Website (split frontend + backend)

The glassy chat interface, built so the API key can never be seen or
taken from the browser.

## How the split protects the key

```
browser ──POST /api/chat──▶  server.js ──key attached HERE──▶  OpenAI/Ollama
  │                              │
  │  only chat text + tokens     │  .env lives on YOUR machine
  │  NO key in either direction  │  only public/ is ever served
```

- `server.js` + `src/*.js` hold the key (from `.env` → process memory).
  The server **only serves files inside `public/`** — `server.js`,
  `src/` and `.env` return 404 and can never be downloaded.
- `public/app.js` contains **zero** secrets and makes exactly one
  network call: `fetch("/api/chat")` on the same server.
- Hardening: per-IP rate limiting (40/min), body-size caps, strict
  message validation, security headers (the page may only talk back to
  your own server), generic browser errors with details in your
  terminal only.
- Proof: `npm test` runs security smoke tests that fail the build if
  any secret reference ever appears in `public/`.

## Project layout

```
netbuddy-secure/
  server.js            # thin entry point: routing + listen
  src/
    config.js          # .env loading + validation (key lives here)
    persona.js         # NetBuddy system prompt (server-side)
    ai.js              # provider client (OpenAI-compatible + Ollama)
    chat.js            # POST /api/chat: validate → stream SSE
    rateLimit.js       # per-IP sliding-window limiter
    static.js          # traversal-safe static serving + headers
  public/              # EVERYTHING the browser may download
    index.html
    styles.css
    app.js             # no keys, one fetch() to /api/chat
    favicon.png
  test/
    security.test.js   # npm test — proves the split holds
  .env.example         # copy to .env, fill in your key
  package.json / README.md
```

## Setup (2 minutes)

```bash
cd netbuddy-secure
cp .env.example .env        # Windows: copy .env.example .env
# edit .env and paste your key into AI_API_KEY
node server.js
# open http://localhost:8000
```

Needs **Node.js 18+** (`node -v`). Zero dependencies — `npm install`
is not required. Run `npm test` any time to re-verify the split.

- Free local AI: `AI_PROVIDER=ollama`, `AI_BASE_URL=http://localhost:11434`,
  `AI_MODEL=llama3.1` (run `ollama serve` + `ollama pull llama3.1`).
- `GET /api/health` shows whether Server AI is configured (never the key).

## Deploying (VPS, Render, Railway…)

1. Upload everything **except** `.env` (it's git-ignored).
2. Set real environment variables in the host dashboard:
   `AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, `PORT`.
3. Run `node server.js` (or `npm start`). Put HTTPS in front
   (host TLS / reverse proxy) — never expose the key over plain HTTP
   on a network you don't trust.

## Rotating a leaked key

Revoke it at your provider, put the new one in `.env` (or the host
dashboard), restart. Nothing in the frontend changes.
