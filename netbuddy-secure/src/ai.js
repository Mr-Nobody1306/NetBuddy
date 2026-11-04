"use strict";

/* AI provider client. The server-held key is attached here — the only
   place it ever leaves process memory is inside this HTTPS request
   to the provider. Responses are re-emitted as our own normalized
   SSE events: `data: {"t":"token"}` … `data: [DONE]`. */

async function streamProviderText({ provider, baseUrl, model, apiKey }, messages, { signal, onToken, timeoutMs }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => { try { ctrl.abort(); } catch (e) {} }, timeoutMs);
  if (signal) {
    signal.addEventListener("abort", () => { try { ctrl.abort(); } catch (e) {} }, { once: true });
  }

  const headers = { "Content-Type": "application/json" };
  let url, body;
  if (provider === "ollama") {
    url = baseUrl + "/api/chat";
    body = { model, stream: true, messages };
  } else {
    url = baseUrl + "/chat/completions";
    if (apiKey) headers.Authorization = "Bearer " + apiKey;
    body = { model, stream: true, temperature: 0.7, messages };
  }

  let upstream;
  try {
    upstream = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal });
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === "AbortError") throw Object.assign(new Error("aborted"), { code: "ABORTED" });
    throw Object.assign(new Error("unreachable"), { code: "UNREACHABLE" });
  }
  if (!upstream.ok || !upstream.body) {
    clearTimeout(timer);
    const detail = await upstream.text().catch(() => "");
    console.error("[ai] upstream error", upstream.status, String(detail).slice(0, 300));
    if (upstream.status === 401 || upstream.status === 403) {
      throw Object.assign(new Error("bad-key"), { code: "BAD_KEY" });
    }
    throw Object.assign(new Error("http-" + upstream.status), { code: "UPSTREAM_HTTP" });
  }

  const reader = upstream.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    if (provider === "ollama") {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          try {
            const o = JSON.parse(t);
            if (o.message && o.message.content) onToken(o.message.content);
            if (o.done) { clearTimeout(timer); return; }
          } catch (e) {}
        }
      }
    } else {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          for (let line of part.split("\n")) {
            line = line.trim();
            if (line.indexOf("data:") !== 0) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") { clearTimeout(timer); return; }
            try {
              const o = JSON.parse(data);
              const piece = o.choices && o.choices[0] && o.choices[0].delta && o.choices[0].delta.content;
              if (piece) onToken(piece);
            } catch (e) {}
          }
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { streamProviderText };
