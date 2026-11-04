/* NetBuddy frontend. Talks ONLY to our own backend (same origin, /api/chat).
   No API keys anywhere in this file. Offline demo answers included as fallback. */
"use strict";

const chatCtn = document.getElementById("chatCtn");
const scrollEl = document.getElementById("scrollEl");
const emptyChat = document.getElementById("emptyChat");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const stopBtn = document.getElementById("stopBtn");
const levelSelect = document.getElementById("levelSelect");
const modeSelect = document.getElementById("modeSelect");
const newChatBtn = document.getElementById("newChatBtn");
const searchInput = document.getElementById("searchInput");
const topicsNav = document.getElementById("topicsNav");
const suggestRow = document.getElementById("suggestRow");
const recentList = document.getElementById("recentList");
const recentGrid = document.getElementById("recentGrid");
const backendHint = document.getElementById("backendHint");
const greetEl = document.getElementById("greetEl");
const menuBtn = document.getElementById("menuBtn");
const sideCloseBtn = document.getElementById("sideCloseBtn");

const BOT_NAME = "NetBuddy";

function setNavOpen(open) {
  document.body.classList.toggle("navOpen", open);
  menuBtn.setAttribute("aria-expanded", String(open));
}

const ICON_PATHS = {
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  swap: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
  award: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  refresh: '<polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 15 22 11 13 2 9 2 22 15"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
};
function icon(n) {
  return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON_PATHS[n] || "") + "</svg>";
}
(function decorateStatic() {
  const put = (id, name, label) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = icon(name);
    if (label) el.appendChild(document.createTextNode(label));
  };
  put("newChatBtn", "chat", "New chat");
  put("menuBtn", "menu", "");
  put("sideCloseBtn", "x", "");
  put("stopBtn", "stop", "");
  put("sendBtn", "send", "Send");
  put("subnetCloseBtn", "x", "");
  put("subnetToolBtn", "grid", "Subnet calculator");
  put("subnetTitle", "grid", "Subnet calculator");
  const foot = document.getElementById("sideFoot");
  if (foot) foot.innerHTML = icon("lock") + foot.innerHTML;
})();
let messages = []; // {role, content}
let currentChatId = null;
let aborter = null;

levelSelect.value = localStorage.getItem("netbuddy.level") || "beginner";
modeSelect.value = localStorage.getItem("netbuddy.mode") || "server";
levelSelect.onchange = () => localStorage.setItem("netbuddy.level", levelSelect.value);
modeSelect.onchange = () => { localStorage.setItem("netbuddy.mode", modeSelect.value); updateHint(); };

(function greet() {
  const h = new Date().getHours();
  greetEl.textContent = h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
})();

function updateHint() {
  const msg = modeSelect.value === "server"
    ? "Server AI — your key stays on the server, never in this page."
    : "Offline demo — built-in networking notes, no internet needed.";
  backendHint.innerHTML = icon("lock");
  backendHint.appendChild(document.createTextNode(msg));
}
updateHint();

/* ---------------- topics & suggestions ---------------- */
const TOPICS = [
  ["globe", "OSI model", "Explain the OSI model simply"],
  ["swap", "TCP vs UDP", "TCP vs UDP — what's the difference?"],
  ["book", "DNS & DHCP", "How does DNS work?"],
  ["grid", "Subnetting", "Teach me subnetting with an example"],
  ["share", "Router vs switch", "Router vs switch vs access point?"],
  ["wifi", "Fix slow WiFi", "My WiFi is slow — how do I troubleshoot?"],
  ["award", "CCNA plan", "Make me a 2-week CCNA study plan"],
  ["refresh", "NAT explained", "What is NAT and why do we need it?"]
];
for (const trio of TOPICS) {
  const b = document.createElement("button");
  b.innerHTML = icon(trio[0]);
  b.appendChild(document.createTextNode(trio[1]));
  b.onclick = () => { startChatIfNeeded(); msgInput.value = trio[2]; sendMessage(); setNavOpen(false); };
  topicsNav.appendChild(b);
}
const SUGGESTIONS = [["layers", "Explain OSI simply"], ["grid", "Subnet my network"], ["wifi", "Fix my WiFi"], ["award", "CCNA study plan"]];
const SUGGEST_Q = {
  "Explain OSI simply": "Explain the OSI model simply",
  "Subnet my network": "Teach me subnetting with an example",
  "Fix my WiFi": "My WiFi is slow — how do I troubleshoot?",
  "CCNA study plan": "Make me a 2-week CCNA study plan"
};
for (const pair of SUGGESTIONS) {
  const b = document.createElement("button");
  b.innerHTML = icon(pair[0]);
  b.appendChild(document.createTextNode(pair[1]));
  b.onclick = () => { startChatIfNeeded(); msgInput.value = SUGGEST_Q[pair[1]]; sendMessage(); };
  suggestRow.appendChild(b);
}

/* ---------------- recent chats (local only) ---------------- */
function loadRecents() {
  try { return JSON.parse(localStorage.getItem("netbuddy.recents") || "[]"); }
  catch (e) { return []; }
}
function saveRecents(r) {
  try { localStorage.setItem("netbuddy.recents", JSON.stringify(r.slice(0, 20))); } catch (e) {}
}
function persistCurrent() {
  if (!messages.length) return;
  const recents = loadRecents();
  const firstUser = messages.find(m => m.role === "user");
  const title = (firstUser ? firstUser.content : "Chat").slice(0, 48);
  const i = recents.findIndex(r => r.id === currentChatId);
  const entry = { id: currentChatId, title, ts: Date.now(), level: levelSelect.value, messages };
  if (i >= 0) recents[i] = entry; else recents.unshift(entry);
  saveRecents(recents);
  renderRecents();
}
function renderRecents() {
  const q = (searchInput.value || "").toLowerCase();
  const recents = loadRecents().filter(r => !q || r.title.toLowerCase().includes(q));
  recentList.innerHTML = "";
  recentGrid.innerHTML = "";
  if (!recents.length) {
    recentGrid.innerHTML = '<div class="emptyNote">No chats yet — ask something below to start.</div>';
    return;
  }
  for (const r of recents) {
    const b = document.createElement("button");
    b.className = "recentItem";
    const d = new Date(r.ts).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    b.innerHTML = `<span></span><small></small>`;
    b.querySelector("span").textContent = r.title;
    b.querySelector("small").textContent = d;
    b.onclick = () => openChat(r.id);
    recentList.appendChild(b);

    const c = document.createElement("button");
    c.className = "recentCard";
    const preview = (r.messages.find(m => m.role === "assistant") || {}).content || "Networking chat";
    c.innerHTML = `<strong></strong><span></span><small></small>`;
    c.querySelector("strong").textContent = r.title;
    c.querySelector("span").textContent = String(preview).slice(0, 70) + "…";
    c.querySelector("small").textContent = d;
    c.onclick = () => openChat(r.id);
    recentGrid.appendChild(c);
  }
}
function openChat(id) {
  const r = loadRecents().find(x => x.id === id);
  if (!r) return;
  currentChatId = id;
  messages = r.messages || [];
  levelSelect.value = r.level || "beginner";
  chatCtn.innerHTML = "";
  for (const m of messages) addMsg(m.role === "user" ? "me" : "bot", renderMarkdown(m.content));
  showChat();
  document.getElementById("convSec").scrollIntoView({ behavior: "smooth", block: "start" });
  setNavOpen(false);
}
function startChatIfNeeded() {
  if (currentChatId) return;
  currentChatId = "c" + Date.now().toString(36);
}
searchInput.oninput = renderRecents;
renderRecents();
refreshPlaceholder();

/* ---------------- views ---------------- */
function refreshPlaceholder() { emptyChat.hidden = messages.length > 0; }
function showChat() { refreshPlaceholder(); }
function showHome() { renderRecents(); }

/* ---------------- markdown ---------------- */
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderMarkdown(src) {
  let h = escapeHtml(src);
  h = h.replace(/```(\w*)\n?([\s\S]*?)```/g, (m, lang, code) => `<pre><code>${code.replace(/^\n+|\n+$/g, "")}</code></pre>`);
  h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  h = h.replace(/^### (.*)$/gm, "<strong>$1</strong>");
  h = h.replace(/^## (.*)$/gm, "<strong>$1</strong>");
  const lines = h.split("\n");
  let out = "", inList = null;
  for (const line of lines) {
    const ul = line.match(/^\s*[-•] (.*)/);
    const ol = line.match(/^\s*\d+\. (.*)/);
    if (ul) {
      if (inList !== "ul") { if (inList) out += `</${inList}>`; out += "<ul>"; inList = "ul"; }
      out += `<li>${ul[1]}</li>`;
    } else if (ol) {
      if (inList !== "ol") { if (inList) out += `</${inList}>`; out += "<ol>"; inList = "ol"; }
      out += `<li>${ol[1]}</li>`;
    } else {
      if (inList) { out += `</${inList}>`; inList = null; }
      if (line.trim() === "") out += "<br>";
      else if (line.startsWith("<pre>") || line.startsWith("<ul") || line.startsWith("<ol")) out += line;
      else out += line + "<br>";
    }
  }
  if (inList) out += `</${inList}>`;
  return out;
}
function addMsg(who, html) {
  const row = document.createElement("div");
  row.className = "msgRow" + (who === "me" ? " mine" : "");
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const whoEl = document.createElement("div");
  whoEl.className = "whoEl";
  if (who === "me") { whoEl.textContent = "You"; }
  else { whoEl.innerHTML = icon("globe"); whoEl.appendChild(document.createTextNode(BOT_NAME)); }
  const body = document.createElement("div");
  body.innerHTML = html;
  bubble.appendChild(whoEl);
  bubble.appendChild(body);
  row.appendChild(bubble);
  chatCtn.appendChild(row);
  row.scrollIntoView({ behavior: "smooth", block: "end" });
  return body;
}

/* ---------------- demo answers (offline fallback) ---------------- */
function localDemoReply(q) {
  const t = " " + q.toLowerCase() + " ";
  const has = (...ws) => ws.some(w => t.includes(w));
  if (has("osi", "7 layer", "seven layer")) return `**Short answer:** the OSI model is a 7-layer map of how data travels across a network.\n\n**Analogy:** like sending a parcel — you pack it, label it, ship it, and the receiver unwraps it layer by layer.\n\n**The 7 layers:**\n- 7 Application — what you see (browser, email)\n- 6 Presentation — formatting/encryption (TLS)\n- 5 Session — connections between devices\n- 4 Transport — TCP vs UDP, ports\n- 3 Network — IP addressing and routing\n- 2 Data Link — switches, MAC addresses, Ethernet\n- 1 Physical — cables, WiFi radio, hubs\n\n**Try:** open dev tools on any webpage and check the protocol + remote address — that's layers 4 and 3 in action.\n\nWant me to quiz you on which device lives at which layer?`;
  if (has("tcp", "udp")) return `**Short answer:** TCP is reliable and ordered; UDP is fast and fire-and-forget.\n\n**Analogy:** TCP is a registered letter (acknowledged, re-sent if lost). UDP is a postcard (fast, cheap, might get lost).\n\n**Technical:**\n- **TCP** — connection first (3-way handshake), retransmits lost segments. Web, email, file transfer. Ports like \`80\`, \`443\`.\n- **UDP** — no connection, no retransmit. DNS lookups, live video, online games, VoIP.\n\n**Try:** \`ping 8.8.8.8\` and compare with loading a webpage (TCP).\n\nWant a one-line rule for when to pick each?`;
  if (has("dns")) return `**Short answer:** DNS translates names like \`example.com\` into IP addresses.\n\n**Analogy:** the phonebook of the internet — you type a name, it looks up the number.\n\n**Technical:** your device asks a resolver (often your router or \`8.8.8.8\`), which walks root → TLD → authoritative servers, then caches the answer. Records: **A** (IPv4), **AAAA** (IPv6), **CNAME** (alias), **MX** (mail).\n\n**Try:** \`nslookup example.com\` then \`nslookup example.com 8.8.8.8\`.\n\nWant me to explain DNS caching and propagation delays?`;
  if (has("dhcp")) return `**Short answer:** DHCP automatically gives your device an IP, mask, gateway and DNS.\n\n**Analogy:** a hotel front desk handing you a room key when you arrive.\n\n**Technical (DORA):** Discover → Offer → Request → ACK. Leases expire and renew. Servers/printers usually get static IPs instead.\n\n**Try:** Windows \`ipconfig /all\` (look for "DHCP Enabled" + "Lease Obtained").\n\nWant to know what happens when two devices claim the same IP?`;
  if (has("subnet", "cidr", "/24", "mask")) return `**Short answer:** subnetting splits one IP range into smaller networks using a mask like \`/24\`.\n\n**Example — \`192.168.1.0/24\`:**\n- Mask: \`255.255.255.0\` (first 24 bits = network)\n- Network: \`192.168.1.0\`, broadcast: \`192.168.1.255\`\n- Usable hosts: 254 (\`192.168.1.1\` → \`192.168.1.254\`)\n- Math: 32 − 24 = 8 host bits → 2⁸ = 256, minus network + broadcast = 254\n\n**Try the subnet calculator** (TOOLS in the sidebar) with \`10.0.0.0/16\` and \`192.168.1.128/25\`.\n\nWant me to walk through the binary math bit by bit?`;
  if (has("nat")) return `**Short answer:** NAT lets many private devices share one public IP.\n\n**Analogy:** an office with one street address — reception (the router) forwards mail to the right desk.\n\n**Technical:** home devices use private ranges (\`192.168.x.x\`, \`10.x.x.x\`). The router rewrites source IP/port on the way out and remembers the mapping so replies return correctly. Home routers use PAT (port overloading).\n\n**Try:** compare your device IP (\`ipconfig\`) with your public IP (search "what is my ip").\n\nWant the difference between NAT and a firewall?`;
  if (has("vlan")) return `**Short answer:** a VLAN splits one physical switch into multiple virtual networks.\n\n**Analogy:** one office floor divided by keycard zones.\n\n**Technical:** ports get a VLAN ID (e.g. 10 = staff, 20 = guests). Traffic between VLANs must pass a router. Trunk ports carry many VLANs tagged with 802.1Q.\n\n**Try (Cisco-style):**\n\`\`\`\nswitchport mode access\nswitchport access vlan 20\n\`\`\`\nWant a tiny 2-VLAN lab design to practice on?`;
  if (has("router", "switch", "access point", "hub", "modem")) return `**Short answer:** switch connects devices *inside* your network, router connects your network *to other* networks, access point adds WiFi.\n\n**Technical:**\n- **Switch (L2):** forwards by MAC within one LAN.\n- **Router (L3):** forwards by IP between networks; runs NAT/DHCP/firewall at home.\n- **Access point:** bridges WiFi clients onto the wired LAN.\n\n**Try:** \`tracert 8.8.8.8\` (Windows) or \`traceroute 8.8.8.8\` — hop 1 is your router.\n\nWant help reading your traceroute output?`;
  if (has("wifi", "wi-fi", "slow", "lag", "disconnect", "internet")) return `**Short answer:** troubleshoot in order — local link, then router, then internet, then DNS.\n\n**Checklist:**\n1. Wired or only WiFi affected? Test with a cable if you can.\n2. Restart: device WiFi off/on, then router (30s off).\n3. Stand near the router — 2.4 GHz reaches far, 5 GHz is faster nearby.\n4. \`ping <your-gateway>\` should be <5ms.\n5. Then \`ping 8.8.8.8\` (internet?) then \`ping google.com\` (DNS?).\n\nTell me which ping fails and I'll narrow it down further?`;
  if (has("ccna", "study", "exam", "cert")) return `**Short answer:** 2 weeks, ~1.5h/day: week 1 fundamentals, week 2 practice + labs.\n\n**Plan:**\n- Days 1–2: TCP/IP + subnetting (10 subnets a day by hand)\n- Days 3–4: VLANs, trunking, inter-VLAN routing\n- Days 5–6: static routes, OSPF concepts\n- Days 7–8: DHCP, DNS, NAT, ACLs\n- Days 9–10: wireless + security basics\n- Days 11–12: full practice exams, review every miss\n- Days 13–14: labs only (Packet Tracer / GNS3) + flashcards\n\nWant me to turn this into a day-by-day checklist with practice questions?`;
  if (has("firewall", "acl")) return `**Short answer:** a firewall filters traffic by rules — what may pass, and what gets blocked.\n\n**Analogy:** a bouncer with a guest list and a banned list. Rule order matters: first match wins. Stateful firewalls track connections so replies are allowed back.\n\nWant an example 5-rule setup for a small office?`;
  if (has("vpn")) return `**Short answer:** a VPN builds an encrypted tunnel across the internet into another network — like an armored shuttle on public roads.\n\nProtocols: WireGuard (modern, fast), OpenVPN, IPsec. "Full tunnel" sends everything through it; "split tunnel" sends only office traffic. Expect ~10–20% speed loss.\n\nWant help picking full vs split tunnel?`;
  if (has("ip address", "ipaddress", "what is an ip", "ipv4", "ipv6", "public ip", "private ip")) return `**Short answer:** an IP address is the numeric address every device needs to send and receive data.\n\n**Technical:** IPv4 looks like \`192.168.1.15\`. Private ranges (\`10.x.x.x\`, \`192.168.x.x\`) work inside your home; your router's single public IP represents you to the internet (via NAT).\n\n**Try:** \`ipconfig\` (Windows) or \`ip addr\` (Linux) to see your own address.\n\nWant the difference between static and dynamic (DHCP) addresses?`;
  if (has("ping", "traceroute", "tracert", "packet")) return `**Short answer:** \`ping\` tests reachability + speed, \`traceroute\` shows every hop.\n\n**Try:**\n- \`ping 8.8.8.8\` — internet reachability\n- \`ping google.com\` — also tests DNS\n- \`traceroute 8.8.8.8\` (\`tracert\` on Windows) — your router, ISP, and beyond\n\nHigh time on hop 1 = local WiFi problem. Failure after hop 2–3 = ISP problem.\n\nPaste your output and I'll read it with you?`;
  if (has("job", "career", "interview", "resume", "linkedin")) return `**For IT careers:** 1 tailored project beats 100 generic applications.\n\n- Put one home lab on your resume: "2-VLAN home lab with DHCP + NAT, documented on GitHub"\n- Study path: CompTIA Network+ → CCNA → one specialty (security/cloud)\n\nWant me to tie this back to networking with a lab plan for your resume?`;
  if (has("hello", "hi", "hey", "thanks", "thank")) return `Hello! You're talking to **NetBuddy**, your networking guide.\n\nPick a topic on the left, or ask anything — e.g. "Explain the OSI model simply" or "My WiFi is slow".\n\nWhat's your current level — total beginner, studying, or prepping for CCNA?`;
  return `Good question! Most networking questions come back to *addresses* (IP/MAC), *paths* (routing/switching), and *names* (DNS).\n\nTell me what you're working on (home lab? CCNA? slow WiFi?) and I'll give you a step-by-step. The **subnet calculator** in TOOLS works fully offline too.\n\nNote: I'm running on **built-in demo notes** right now. For full AI answers, switch the composer to Server AI.\n\nWhat networking topic should we tackle first?`;
}

/* ---------------- server AI (key stays server-side) ---------------- */
async function callServer(history, signal, onToken) {
  const res = await fetch("/api/chat", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history.slice(-20), level: levelSelect.value })
  });
  if (!res.ok) {
    let msg = "Server error " + res.status;
    try { const j = await res.json(); if (j && j.error) msg = j.error; } catch (e) {}
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const part of parts) {
      const line = part.trim();
      if (line.indexOf("data:") !== 0) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return out;
      try {
        const o = JSON.parse(data);
        if (o.t) { out += o.t; onToken(out); }
      } catch (e) {}
    }
  }
  return out;
}

async function getReply(userText, signal, onToken) {
  if (modeSelect.value === "demo") {
    const full = localDemoReply(userText);
    const parts = full.match(/[\s\S]{1,48}/g) || [full];
    let out = "";
    for (const p of parts) {
      if (signal.aborted) throw new DOMException("aborted", "AbortError");
      out += p;
      onToken(out);
      await new Promise(r => setTimeout(r, 12));
    }
    return out;
  }
  return await callServer(messages, signal, onToken);
}

/* ---------------- chat flow ---------------- */
async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || aborter) return;
  startChatIfNeeded();
  msgInput.value = "";
  showChat();
  addMsg("me", escapeHtml(text).replace(/\n/g, "<br>"));
  messages.push({ role: "user", content: text });

  const bodyEl = addMsg("bot", "");
  bodyEl.innerHTML = '<span class="typingEl"><span></span><span></span><span></span></span>';

  sendBtn.disabled = true;
  stopBtn.hidden = false;

  try {
    aborter = new AbortController();
    const full = await getReply(text, aborter.signal, (partial) => {
      bodyEl.innerHTML = renderMarkdown(partial) + ' <span class="typingEl"><span></span><span></span><span></span></span>';
    });
    aborter = null;
    const clean = (full || "").trim() || "Sorry — I blanked for a second! Could you ask that again?";
    messages.push({ role: "assistant", content: clean });
    bodyEl.innerHTML = renderMarkdown(clean);
    persistCurrent();
  } catch (err) {
    aborter = null;
    if (err && err.name === "AbortError") {
      bodyEl.innerHTML = "<em>Stopped. Ask me something else when you're ready.</em>";
    } else if (modeSelect.value === "server") {
      const demo = localDemoReply(text);
      messages.push({ role: "assistant", content: demo });
      bodyEl.innerHTML = renderMarkdown(demo) + `<br><span style="font-size:12px;opacity:.7;">Note: ${escapeHtml(String((err && err.message) || err))} — showed the built-in answer instead.</span>`;
      persistCurrent();
    } else {
      bodyEl.innerHTML = `Hmm, something went wrong (<em>${escapeHtml(String((err && err.message) || err))}</em>). Please try again.`;
    }
  } finally {
    aborter = null;
    sendBtn.disabled = false;
    stopBtn.hidden = true;
    msgInput.focus();
  }
}

sendBtn.onclick = sendMessage;
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); startChatIfNeeded(); sendMessage(); }
});
stopBtn.onclick = () => {
  try { if (aborter) aborter.abort(); } catch (e) {}
  aborter = null;
  sendBtn.disabled = false;
  stopBtn.hidden = true;
};
newChatBtn.onclick = () => {
  try { if (aborter) aborter.abort(); } catch (e) {}
  aborter = null;
  messages = [];
  currentChatId = null;
  chatCtn.innerHTML = "";
  refreshPlaceholder();
  renderRecents();
  scrollEl.scrollTo({ top: 0, behavior: "smooth" });
  setNavOpen(false);
};
menuBtn.onclick = () => setNavOpen(!document.body.classList.contains("navOpen"));
sideCloseBtn.onclick = () => setNavOpen(false);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("navOpen")) setNavOpen(false);
});
window.NetBuddyAsk = (q) => { startChatIfNeeded(); showChat(); msgInput.value = q; sendMessage(); };

/* ---------------- subnet calculator ---------------- */
const subnetModal = document.getElementById("subnetModal");
document.getElementById("subnetToolBtn").onclick = () => { subnetModal.hidden = false; };
document.getElementById("subnetCloseBtn").onclick = () => { subnetModal.hidden = true; };
subnetModal.addEventListener("click", (e) => { if (e.target === subnetModal) subnetModal.hidden = true; });

function ipToInt(ip) { return ip.split(".").reduce((a, o) => (a << 8) + parseInt(o, 10), 0) >>> 0; }
function intToIp(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."); }
document.getElementById("subnetBtn").onclick = () => {
  const out = document.getElementById("subnetOut");
  const raw = document.getElementById("subnetInput").value.trim();
  const m = raw.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/);
  if (!m) { out.innerHTML = "Use form like <code>192.168.1.0/24</code>."; return; }
  const octs = m[1].split(".").map(Number);
  if (octs.some(o => o < 0 || o > 255)) { out.textContent = "Invalid IP octets."; return; }
  const cidr = m[2] === undefined ? 24 : Number(m[2]);
  if (cidr < 0 || cidr > 32) { out.textContent = "CIDR must be 0-32."; return; }
  const mask = cidr === 0 ? 0 : (0xFFFFFFFF << (32 - cidr)) >>> 0;
  const ip = ipToInt(m[1]);
  const net = (ip & mask) >>> 0;
  const bcast = (net | (~mask >>> 0)) >>> 0;
  const total = Math.pow(2, 32 - cidr);
  const usable = cidr >= 31 ? total : total - 2;
  out.innerHTML =
    `<strong>Network:</strong> <code>${intToIp(net)}/${cidr}</code><br>` +
    `<strong>Mask:</strong> <code>${intToIp(mask)}</code><br>` +
    `<strong>Range:</strong> <code>${intToIp(net)}</code> → <code>${intToIp(bcast)}</code><br>` +
    `<strong>Usable hosts:</strong> ${usable.toLocaleString()}${cidr < 31 ? ` (${intToIp(net + 1)} → ${intToIp(bcast - 1)})` : ""}`;
};
