"use strict";

/* Central configuration. The API key is read here — once, at startup —
   from the `.env` file / environment, into process memory only.
   Nothing in public/ can ever reach it. */

const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.join(__dirname, "..");

function loadDotEnv(file) {
  try {
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (v.length >= 2 && ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'"))) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch (err) {
    console.error("[config] could not read .env:", err.message);
  }
}

function loadConfig() {
  loadDotEnv(path.join(ROOT_DIR, ".env"));

  const cfg = {
    port: Number(process.env.PORT || 8000),
    provider: String(process.env.AI_PROVIDER || "openai").toLowerCase(),
    baseUrl: String(process.env.AI_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
    model: process.env.AI_MODEL || "openai/gpt-oss-120b",
    apiKey: process.env.AI_API_KEY || "",
    rootDir: ROOT_DIR,
    publicDir: path.join(ROOT_DIR, "public"),
    maxBodyBytes: 256 * 1024,
    maxMessages: 30,
    maxMessageChars: 4000,
    upstreamTimeoutMs: 90000
  };

  if (!Number.isInteger(cfg.port) || cfg.port < 1 || cfg.port > 65535) {
    throw new Error("[config] PORT must be 1-65535");
  }
  if (cfg.provider !== "openai" && cfg.provider !== "ollama") {
    throw new Error('[config] AI_PROVIDER must be "openai" or "ollama"');
  }
  if (!/^https?:\/\//.test(cfg.baseUrl)) {
    throw new Error("[config] AI_BASE_URL must start with http(s)://");
  }
  if (!cfg.model) throw new Error("[config] AI_MODEL must not be empty");

  return Object.freeze(cfg);
}

module.exports = loadConfig();
