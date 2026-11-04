"use strict";

/* Security smoke tests. Run with:  npm test   (or: node --test test/)
   These prove the frontend/backend split holds:
   - public/ contains no secrets, no key handling, no server internals
   - the browser talks only to our own /api/chat
   - the server only ever serves public/
   - .env is ignored and the example ships a placeholder, not a key */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

describe("backend isolation", () => {
  it("public/ files reference no secrets or server internals", () => {
    for (const f of ["public/app.js", "public/index.html"]) {
      const t = read(f);
      assert.ok(!/AI_API_KEY|process\.env|require\(|\.env|Authorization|Bearer\s/i.test(t), f + " must not touch secrets");
    }
  });

  it("frontend calls only our own /api/chat", () => {
    const t = read("public/app.js");
    const calls = [...t.matchAll(/fetch\(([^)]*)\)/g)].map((m) => m[1]);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /\/api\/chat/);
  });

  it("server serves only public/ (plus /api/*)", () => {
    const t = read("server.js") + read("src/static.js");
    assert.ok(t.includes("publicDir"), "static root must be the public dir");
    assert.ok(t.includes("startsWith(publicDir"), "path traversal guard required");
  });

  it(".env is ignored; the example ships a placeholder, never a key", () => {
    assert.match(read(".gitignore"), /^\.env$/m);
    const ex = read(".env.example");
    assert.match(ex, /PASTE_YOUR_KEY_HERE/);
    assert.ok(!/sk-[A-Za-z0-9]/.test(ex), ".env.example must not contain a real key");
  });

  it("every backend module the server loads exists", () => {
    for (const f of ["src/config.js", "src/persona.js", "src/ai.js", "src/chat.js", "src/rateLimit.js", "src/static.js"]) {
      assert.ok(fs.existsSync(path.join(ROOT, f)), f + " missing");
    }
  });
});
