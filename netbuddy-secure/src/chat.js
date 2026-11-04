"use strict";

/* POST /api/chat — validates the browser's request, builds the
   server-side prompt, and streams the provider's answer back as
   normalized SSE. Error messages to the browser are generic;
   details go to this console only. */

const { sendJson, securityHeaders } = require("./static");
const { systemPrompt } = require("./persona");
const { streamProviderText } = require("./ai");

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error("body_too_large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleChat(req, res, { config, limiter }) {
  const ip = req.socket.remoteAddress || "unknown";
  if (limiter.isLimited(ip)) {
    return sendJson(res, 429, { error: "Too many requests — please wait a minute." });
  }

  let raw;
  try {
    raw = await readBody(req, config.maxBodyBytes);
  } catch (e) {
    return sendJson(res, 413, { error: "Request too large." });
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return sendJson(res, 400, { error: "Invalid JSON." });
  }

  if (!data || !Array.isArray(data.messages) || data.messages.length === 0 || data.messages.length > config.maxMessages) {
    return sendJson(res, 400, { error: `Send 1–${config.maxMessages} messages.` });
  }
  const clean = [];
  for (const m of data.messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return sendJson(res, 400, { error: "Bad message format." });
    }
    const content = m.content.slice(0, config.maxMessageChars);
    if (!content.trim()) return sendJson(res, 400, { error: "Empty message." });
    clean.push({ role: m.role, content });
  }

  if (config.provider === "openai" && !config.apiKey) {
    return sendJson(res, 503, { error: "Server AI is not configured yet. Try Offline demo." });
  }

  const payload = [{ role: "system", content: systemPrompt(data.level) }, ...clean];

  res.writeHead(200, Object.assign({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  }, securityHeaders()));

  const emit = (text) => {
    if (text) res.write("data: " + JSON.stringify({ t: text }) + "\n\n");
  };

  try {
    await streamProviderText(
      { provider: config.provider, baseUrl: config.baseUrl, model: config.model, apiKey: config.apiKey },
      payload,
      { signal: null, onToken: emit, timeoutMs: config.upstreamTimeoutMs }
    );
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("[chat]", err && err.code ? err.code : err);
    if (!res.headersSent) {
      if (err && err.code === "BAD_KEY") return sendJson(res, 502, { error: "Server key rejected — contact the site owner." });
      return sendJson(res, 502, { error: "AI provider failed — try again or use Offline demo." });
    }
    try { res.end(); } catch (e) {}
  }
}

module.exports = { handleChat };
