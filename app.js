// app.js — Mystery tarot app logic.
import { DECK, AREAS, ZODIAC, LIFE_PATH } from "./cards.js";

const POSITIONS = ["Past", "Present", "Future"];
const HISTORY_KEY = "mystery.history.v1";
const DAILY_KEY = "mystery.daily.v1";
const HISTORY_LIMIT = 50;

// --- State ---
const state = {
  area: AREAS[0].key,
  spread: 1, // 1 = single card, 3 = past/present/future
  muted: false,
  current: null, // the active reading object
};

// --- DOM ---
const els = {
  areaSelect: document.getElementById("area-select"),
  spreadToggle: document.getElementById("spread-toggle"),
  shuffleBtn: document.getElementById("shuffle-btn"),
  drawBtn: document.getElementById("draw-btn"),
  muteBtn: document.getElementById("mute-btn"),
  deckStatus: document.getElementById("deck-status"),
  spread: document.getElementById("spread"),
  reading: document.getElementById("reading"),
  seekerName: document.getElementById("seeker-name"),
  seekerQuestion: document.getElementById("seeker-question"),
  seekerDob: document.getElementById("seeker-dob"),
  stageSeeker: document.getElementById("stage-seeker"),
  stageControls: document.getElementById("stage-controls"),
  seekerSummaryText: document.getElementById("seeker-summary-text"),
  continueBtn: document.getElementById("continue-btn"),
  skipBtn: document.getElementById("skip-btn"),
  editDetailsBtn: document.getElementById("edit-details-btn"),
  deck: document.getElementById("deck"),
  deckStack: document.getElementById("deck-stack"),
  dailyBtn: document.getElementById("daily-btn"),
  historyBtn: document.getElementById("history-btn"),
  installBtn: document.getElementById("install-btn"),
  historyDrawer: document.getElementById("history-drawer"),
  historyList: document.getElementById("history-list"),
  historyEmpty: document.getElementById("history-empty"),
  historyClear: document.getElementById("history-clear"),
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- Safe localStorage helpers (private browsing / quota can throw) ---
function storeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function storeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore — history simply won't persist */
  }
}

// Read the optional "about the seeker" fields. The draw never depends on
// these — they only personalise the reading when provided.
function getSeeker() {
  return {
    name: (els.seekerName.value || "").trim(),
    question: (els.seekerQuestion.value || "").trim(),
    dob: els.seekerDob.value || "", // "YYYY-MM-DD" or ""
  };
}

// --- Birthdate insight (zodiac + numerology) ---
function zodiacFor(month, day) {
  // ZODIAC is ordered by start date; find the latest sign whose start
  // date is on or before the birthday. Dates before Jan 20 wrap to Capricorn.
  let current = ZODIAC[0]; // Capricorn (handles early-January dates)
  for (const z of ZODIAC) {
    const [m, d] = z.start;
    if (month > m || (month === m && day >= d)) current = z;
  }
  return current;
}

function lifePathFor(dob) {
  const digits = dob.replace(/\D/g, "").split("").map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  const isMaster = (n) => n === 11 || n === 22 || n === 33;
  while (sum > 9 && !isMaster(sum)) {
    sum = String(sum).split("").reduce((a, b) => a + Number(b), 0);
  }
  return sum;
}

// Returns { label, sentence } for a valid YYYY-MM-DD, or null otherwise.
function birthInsight(dob) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob || "");
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const z = zodiacFor(month, day);
  const lp = lifePathFor(dob);
  return {
    label: `${z.emoji} ${z.sign} · Life Path ${lp}`,
    sentence: `As a ${z.sign}, you are ${z.note}, walking ${LIFE_PATH[lp]}.`,
  };
}

// A working copy of the deck we can shuffle without touching the source.
let deck = [...DECK];
const cardById = new Map(DECK.map((c) => [c.id, c]));

// --- Setup ---
function populateAreas() {
  els.areaSelect.innerHTML = "";
  for (const area of AREAS) {
    const opt = document.createElement("option");
    opt.value = area.key;
    opt.textContent = `${area.icon}  ${area.label}`;
    els.areaSelect.appendChild(opt);
  }
  els.areaSelect.value = state.area;
}

// --- Fisher–Yates shuffle (in place) ---
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleDeck() {
  deck = shuffle([...DECK]);
  state.current = null;
  els.spread.innerHTML = "";
  els.reading.hidden = true;
  els.reading.innerHTML = "";
  els.deck.hidden = false; // bring the deck back into view to shuffle it
  animateDeck("is-shuffling", 600);
  setStatus(`Deck shuffled · ${deck.length} cards · draw when you're ready.`);
}

function setStatus(text) {
  els.deckStatus.textContent = text;
}

// Briefly play a deck animation class (shuffle riffle or deal lift).
function animateDeck(cls, duration) {
  if (prefersReducedMotion) return;
  els.deckStack.classList.remove(cls);
  void els.deckStack.offsetWidth; // force reflow so rapid repeats restart
  els.deckStack.classList.add(cls);
  setTimeout(() => els.deckStack.classList.remove(cls), duration);
}

// --- Stage navigation (personalization <-> controls) ---
function showControls() {
  updateSeekerSummary();
  els.stageSeeker.hidden = true;
  els.stageControls.hidden = false;
}
function showSeeker() {
  els.stageControls.hidden = true;
  els.stageSeeker.hidden = false;
}
function updateSeekerSummary() {
  const { name, question } = getSeeker();
  els.seekerSummaryText.textContent = name
    ? `Reading for ${name}`
    : question
      ? "Reading your question"
      : "Anonymous reading";
}

// ---------------------------------------------------------------------------
// Reading model
// A reading is a plain object: { id, ts, kind, areaKey, spread, seeker, cards }
// where cards = [{ id, reversed }]. Everything (history, share, image) is
// derived from it, so the same renderer serves draws, daily cards and shares.
// ---------------------------------------------------------------------------
function makeReading({ kind, cards, seeker, areaKey, spread }) {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    ts: Date.now(),
    kind, // "draw" | "daily" | "shared"
    areaKey,
    spread,
    seeker,
    cards, // [{ id, reversed }]
  };
}

// Resolve a reading's card refs to full card objects: [{ card, reversed }].
function resolveCards(reading) {
  return reading.cards
    .map(({ id, reversed }) => ({ card: cardById.get(id), reversed: !!reversed }))
    .filter((c) => c.card);
}

function draw() {
  // Reshuffle each draw so repeated draws feel fresh.
  deck = shuffle([...DECK]);
  const n = state.spread;
  const cards = deck.slice(0, n).map((card) => ({
    id: card.id,
    reversed: Math.random() < 0.5,
  }));

  const reading = makeReading({
    kind: "draw",
    cards,
    seeker: getSeeker(),
    areaKey: state.area,
    spread: n,
  });

  presentReading(reading, {
    deal: true,
    speak: true,
    save: true,
    status:
      n === 1
        ? "A single card is drawn — revealing…"
        : "Three cards are drawn — revealing Past, Present, Future…",
  });
}

// Shared deal+flip+reading pipeline for draw / daily / history / shared.
function presentReading(reading, { deal = true, speak = true, save = false, status } = {}) {
  state.current = reading;
  state.area = reading.areaKey;
  state.spread = reading.spread;
  els.areaSelect.value = reading.areaKey;
  syncSpreadToggle(reading.spread);

  if (deal) {
    els.deck.hidden = false;
    animateDeck("is-dealing", 500);
  }
  const resolved = resolveCards(reading);
  renderFaceDown(resolved);
  if (deal) setTimeout(() => { els.deck.hidden = true; }, prefersReducedMotion ? 0 : 480);
  else els.deck.hidden = true;
  if (status) setStatus(status);

  if (save) saveToHistory(reading);

  flipInSequence(resolved).then(() => {
    buildReading(reading, { speak });
  });
}

// --- Rendering ---
function renderFaceDown(drawn) {
  els.spread.innerHTML = "";
  els.reading.hidden = true;
  els.reading.innerHTML = "";

  drawn.forEach(({ card, reversed }, i) => {
    const slot = document.createElement("div");
    slot.className = "card-slot";

    const position = document.createElement("div");
    position.className = "card-slot__position";
    position.textContent = drawn.length === 3 ? POSITIONS[i] : "";
    slot.appendChild(position);

    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.dataset.index = String(i);

    const inner = document.createElement("div");
    inner.className = "card__inner";

    const back = document.createElement("div");
    back.className = "card__face card__back";

    const front = document.createElement("div");
    front.className = "card__face card__front" + (reversed ? " is-reversed" : "");
    const img = document.createElement("img");
    img.className = "card__art";
    img.src = cardImage(card);
    img.alt = `${card.name}${reversed ? ", reversed" : ""}`;
    img.loading = "lazy";
    // If the artwork can't load, fall back to the emoji/name layout.
    img.addEventListener("error", () => {
      front.classList.add("card__front--fallback");
      front.innerHTML = `
        <div class="card__symbol">${card.symbol}</div>
        <div class="card__number">${romanOrNumber(card.number)}</div>
        <h3 class="card__name">${card.name}</h3>
        <div class="card__orientation">${reversed ? "Reversed" : "Upright"}</div>
      `;
    });
    front.appendChild(img);

    inner.appendChild(back);
    inner.appendChild(front);
    cardEl.appendChild(inner);
    slot.appendChild(cardEl);
    els.spread.appendChild(slot);
  });
}

function flipInSequence(drawn) {
  const cards = [...els.spread.querySelectorAll(".card")];
  const gap = prefersReducedMotion ? 80 : 450;

  return new Promise((resolve) => {
    cards.forEach((cardEl, i) => {
      setTimeout(() => {
        cardEl.classList.add("is-flipped");
        if (i === cards.length - 1) {
          setTimeout(resolve, prefersReducedMotion ? 60 : 700);
        }
      }, i * gap);
    });
    if (cards.length === 0) resolve();
  });
}

// Card artwork: Rider–Waite–Smith scans live in ./cards/<id>.jpg.
function cardImage(card) {
  return card.image || `./cards/${card.id}.jpg`;
}

function romanOrNumber(n) {
  const romans = [
    "0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI",
  ];
  return romans[n] ?? String(n);
}

// Escape user-supplied text before inserting it into the DOM as HTML.
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// --- Reading panel ---
function buildReading(reading, { speak = true } = {}) {
  const area = AREAS.find((a) => a.key === reading.areaKey) || AREAS[0];
  const drawn = resolveCards(reading);
  const seeker = reading.seeker || { name: "", question: "", dob: "" };
  const insight = birthInsight(seeker.dob);
  const dailyTag = reading.kind === "daily" ? "Card of the Day · " : "";

  els.reading.innerHTML = "";

  const header = document.createElement("div");
  header.className = "reading__header";
  const greeting = seeker.name ? `${escapeHtml(seeker.name)}’s ` : "";
  header.innerHTML = `
    <h2 class="reading__title">${area.icon} ${dailyTag}${greeting}${area.label} reading</h2>
  `;

  const actions = document.createElement("div");
  actions.className = "reading__actions";

  const againBtn = mkButton("🔊 Read aloud again", "btn btn--ghost", () =>
    speakReading(reading)
  );
  againBtn.id = "read-again-btn";
  const linkBtn = mkButton("🔗 Copy link", "btn btn--ghost", (e) =>
    copyShareLink(reading, e.currentTarget)
  );
  linkBtn.id = "share-link-btn";
  const imgBtn = mkButton("🖼️ Save image", "btn btn--ghost", () =>
    downloadReadingImage(reading)
  );
  imgBtn.id = "save-image-btn";
  actions.append(againBtn, linkBtn, imgBtn);
  header.appendChild(actions);
  els.reading.appendChild(header);

  // Optional seeker context: their question and birth-date insight.
  if (seeker.question || insight) {
    const context = document.createElement("div");
    context.className = "reading__context";
    let html = "";
    if (seeker.question) {
      html += `<p class="reading__question">On your question: <em>“${escapeHtml(seeker.question)}”</em></p>`;
    }
    if (insight) {
      html += `<p class="reading__astro"><span class="reading__astro-label">${insight.label}</span> — ${insight.sentence}</p>`;
    }
    context.innerHTML = html;
    els.reading.appendChild(context);
  }

  drawn.forEach(({ card, reversed }, i) => {
    const orient = reversed ? "reversed" : "upright";
    const meaning = card[orient][reading.areaKey];
    const keywords = card.keywords[orient];
    const positionLabel = drawn.length === 3 ? `${POSITIONS[i]} · ` : "";

    const entry = document.createElement("div");
    entry.className = "reading__entry";
    entry.innerHTML = `
      <div class="reading__position">${positionLabel}${reversed ? "Reversed" : "Upright"}</div>
      <div class="reading__card-name">${card.symbol} ${card.name}<span class="tag">(${orient})</span></div>
      <p class="reading__keywords">${keywords}</p>
      <p class="meaning">${meaning}</p>
    `;
    els.reading.appendChild(entry);
  });

  els.reading.hidden = false;
  setStatus(
    drawn.length === 1
      ? "Your card is revealed. Reflect on its message."
      : "Your three cards are revealed across time."
  );

  if (speak) speakReading(reading);
}

function mkButton(label, className, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

function readingToText(reading) {
  const area = AREAS.find((a) => a.key === reading.areaKey) || AREAS[0];
  const drawn = resolveCards(reading);
  const seeker = reading.seeker || {};
  const insight = birthInsight(seeker.dob);
  const parts = [];

  const lead = reading.kind === "daily" ? "your Card of the Day" : `your ${area.label} reading`;
  parts.push(seeker.name ? `${seeker.name}, here is ${lead}.` : `${capitalize(lead)}.`);
  if (seeker.question) parts.push(`You asked: ${seeker.question}.`);
  if (insight) parts.push(insight.sentence);

  drawn.forEach(({ card, reversed }, i) => {
    const orient = reversed ? "reversed" : "upright";
    const meaning = card[orient][reading.areaKey];
    const prefix = drawn.length === 3 ? `${POSITIONS[i]}: ` : "";
    parts.push(`${prefix}${card.name}, ${orient}. ${meaning}`);
  });
  return parts.join(" ");
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Speech (Web Speech API) ---
function speakReading(reading) {
  speak(readingToText(reading));
}
function speak(text) {
  if (state.muted) return;
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  utterance.pitch = 1;
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}
function toggleMute() {
  state.muted = !state.muted;
  els.muteBtn.setAttribute("aria-pressed", String(state.muted));
  els.muteBtn.textContent = state.muted ? "🔇 Muted" : "🔊 Voice on";
  if (state.muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

// ---------------------------------------------------------------------------
// Daily card — deterministic per calendar day, identical on every reload.
// ---------------------------------------------------------------------------
function todayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function drawDaily() {
  showControls();
  const key = todayKey();
  const h = hashString(key);
  const card = DECK[h % DECK.length];
  const reversed = ((h >> 5) & 1) === 1;

  const reading = makeReading({
    kind: "daily",
    cards: [{ id: card.id, reversed }],
    seeker: getSeeker(),
    areaKey: "general",
    spread: 1,
  });

  // Save to history only once per day.
  const last = storeGet(DAILY_KEY, null);
  const firstToday = !last || last.date !== key;
  if (firstToday) storeSet(DAILY_KEY, { date: key, id: card.id, reversed });

  presentReading(reading, {
    deal: true,
    speak: true,
    save: firstToday,
    status: `Your Card of the Day for ${key}.`,
  });
}

// ---------------------------------------------------------------------------
// History (localStorage journal)
// ---------------------------------------------------------------------------
function loadHistory() {
  return storeGet(HISTORY_KEY, []);
}
function saveToHistory(reading) {
  const list = loadHistory();
  list.unshift({
    id: reading.id,
    ts: reading.ts,
    kind: reading.kind,
    areaKey: reading.areaKey,
    spread: reading.spread,
    seeker: reading.seeker,
    cards: reading.cards,
  });
  storeSet(HISTORY_KEY, list.slice(0, HISTORY_LIMIT));
}
function deleteFromHistory(id) {
  storeSet(HISTORY_KEY, loadHistory().filter((r) => r.id !== id));
  renderHistory();
}
function clearHistory() {
  storeSet(HISTORY_KEY, []);
  renderHistory();
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function renderHistory() {
  const list = loadHistory();
  els.historyList.innerHTML = "";
  els.historyEmpty.hidden = list.length > 0;

  for (const r of list) {
    const area = AREAS.find((a) => a.key === r.areaKey) || AREAS[0];
    const names = r.cards
      .map((c) => (cardById.get(c.id) ? cardById.get(c.id).name : "?"))
      .join(" · ");
    const tag = r.kind === "daily" ? "🌙 Daily" : r.spread === 3 ? "Past·Present·Future" : "Single";

    const li = document.createElement("li");
    li.className = "history-item";
    li.innerHTML = `
      <button type="button" class="history-item__open" data-id="${r.id}">
        <span class="history-item__top">${area.icon} ${escapeHtml(area.label)}
          <span class="history-item__tag">${tag}</span>
        </span>
        <span class="history-item__cards">${escapeHtml(names)}</span>
        <span class="history-item__date">${formatDate(r.ts)}${r.seeker && r.seeker.name ? " · " + escapeHtml(r.seeker.name) : ""}</span>
      </button>
      <button type="button" class="history-item__del" data-del="${r.id}" aria-label="Delete reading">✕</button>
    `;
    els.historyList.appendChild(li);
  }
}

function openHistory() {
  renderHistory();
  els.historyDrawer.hidden = false;
  document.body.classList.add("drawer-open");
}
function closeHistory() {
  els.historyDrawer.hidden = true;
  document.body.classList.remove("drawer-open");
}

// Re-open a stored reading: switch back to the controls view and re-deal it.
function openReading(id) {
  const r = loadHistory().find((x) => x.id === id);
  if (!r) return;
  closeHistory();
  showControls();
  const reading = makeReading({
    kind: r.kind,
    cards: r.cards,
    seeker: r.seeker,
    areaKey: r.areaKey,
    spread: r.spread,
  });
  reading.id = r.id;
  reading.ts = r.ts;
  presentReading(reading, { deal: false, speak: false, save: false, status: "Revisiting a past reading." });
}

// ---------------------------------------------------------------------------
// Share — encode a reading into the URL and into a downloadable image.
// ---------------------------------------------------------------------------
function b64urlEncode(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(s)));
}
function encodeReading(reading) {
  const payload = {
    k: reading.kind,
    a: reading.areaKey,
    s: reading.spread,
    n: reading.seeker?.name || "",
    q: reading.seeker?.question || "",
    d: reading.seeker?.dob || "",
    c: reading.cards.map((c) => [c.id, c.reversed ? 1 : 0]),
  };
  return b64urlEncode(JSON.stringify(payload));
}
function decodeReading(code) {
  try {
    const p = JSON.parse(b64urlDecode(code));
    const cards = (p.c || [])
      .map(([id, rev]) => ({ id, reversed: !!rev }))
      .filter((c) => cardById.has(c.id));
    if (!cards.length) return null;
    return makeReading({
      kind: p.k === "daily" ? "daily" : "shared",
      cards,
      seeker: { name: p.n || "", question: p.q || "", dob: p.d || "" },
      areaKey: AREAS.some((a) => a.key === p.a) ? p.a : "general",
      spread: p.s === 3 ? 3 : 1,
    });
  } catch {
    return null;
  }
}
function shareUrl(reading) {
  const base = location.origin + location.pathname;
  return `${base}#r=${encodeReading(reading)}`;
}
async function copyShareLink(reading, btn) {
  const url = shareUrl(reading);
  const done = (ok) => {
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = ok ? "✅ Link copied" : "Copy failed";
    setTimeout(() => { btn.textContent = original; }, 1800);
  };
  try {
    await navigator.clipboard.writeText(url);
    done(true);
  } catch {
    // Fallback for browsers without clipboard permission.
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      done(true);
    } catch {
      done(false);
    }
  }
}

// --- Image export (canvas) ---
function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

async function renderReadingImage(reading) {
  const W = 1080;
  const PAD = 64;
  const inner = W - PAD * 2;
  const dpr = 2;
  const area = AREAS.find((a) => a.key === reading.areaKey) || AREAS[0];
  const drawn = resolveCards(reading);
  const seeker = reading.seeker || {};
  const insight = birthInsight(seeker.dob);
  const images = await Promise.all(drawn.map(({ card }) => loadImage(cardImage(card))));

  // Build an ordered list of items (text blocks + one artwork gallery).
  const meas = document.createElement("canvas").getContext("2d");
  const items = [];
  const pushText = (text, font, color, lh, gapAfter) => {
    meas.font = font;
    items.push({ kind: "text", lines: wrapLines(meas, text, inner), font, color, lh, gapAfter });
  };

  const greeting = seeker.name ? `${seeker.name}’s ` : "";
  const dailyTag = reading.kind === "daily" ? "Card of the Day — " : "";
  pushText(`${dailyTag}${greeting}${area.label} reading`, "600 46px Georgia, serif", "#e7c873", 56, 18);
  if (seeker.question) pushText(`“${seeker.question}”`, "italic 30px Georgia, serif", "#ece8ff", 40, 10);
  if (insight) pushText(insight.label + " — " + insight.sentence, "26px Georgia, serif", "#b6aedd", 36, 22);

  // Artwork gallery row.
  const n = drawn.length;
  const gGap = 24;
  const thumbW = Math.min(230, Math.floor((inner - gGap * (n - 1)) / n));
  const thumbH = Math.round(thumbW * 1.68);
  if (images.some(Boolean)) {
    items.push({ kind: "gallery", thumbW, thumbH, gGap, gapAfter: 28 });
  }

  drawn.forEach(({ card, reversed }, i) => {
    const orient = reversed ? "Reversed" : "Upright";
    const pos = drawn.length === 3 ? `${POSITIONS[i]} · ` : "";
    pushText(`${pos}${orient}`, "600 22px Georgia, serif", "#c9a94e", 30, 4);
    pushText(`${card.name}`, "600 34px Georgia, serif", "#ece8ff", 44, 4);
    pushText(card.keywords[reversed ? "reversed" : "upright"], "italic 24px Georgia, serif", "#b6aedd", 32, 8);
    pushText(card[reversed ? "reversed" : "upright"][reading.areaKey], "27px Georgia, serif", "#ece8ff", 38, 26);
  });
  pushText("Mystery · for reflection & entertainment", "italic 22px Georgia, serif", "#8c84b6", 30, 0);

  let H = PAD * 2;
  for (const it of items) {
    H += it.kind === "gallery" ? it.thumbH + it.gapAfter : it.lines.length * it.lh + it.gapAfter;
  }

  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#150d35");
  grad.addColorStop(1, "#0b0720");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(231,200,115,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, W - 40, H - 40);

  let y = PAD + 12;
  ctx.textBaseline = "top";
  for (const it of items) {
    if (it.kind === "gallery") {
      const rowW = it.thumbW * n + it.gGap * (n - 1);
      let x = PAD + (inner - rowW) / 2;
      drawn.forEach(({ reversed }, i) => {
        const img = images[i];
        if (img) {
          ctx.save();
          ctx.translate(x + it.thumbW / 2, y + it.thumbH / 2);
          if (reversed) ctx.rotate(Math.PI);
          ctx.drawImage(img, -it.thumbW / 2, -it.thumbH / 2, it.thumbW, it.thumbH);
          ctx.restore();
        }
        ctx.strokeStyle = "rgba(231,200,115,0.45)";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, it.thumbW, it.thumbH);
        x += it.thumbW + it.gGap;
      });
      y += it.thumbH + it.gapAfter;
    } else {
      ctx.font = it.font;
      ctx.fillStyle = it.color;
      for (const line of it.lines) {
        ctx.fillText(line, PAD, y);
        y += it.lh;
      }
      y += it.gapAfter;
    }
  }
  return canvas;
}

async function downloadReadingImage(reading) {
  try {
    const canvas = await renderReadingImage(reading);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `mystery-reading-${reading.areaKey}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    setStatus("Could not generate an image in this browser.");
  }
}

// --- Events ---
function syncSpreadToggle(n) {
  state.spread = n;
  [...els.spreadToggle.querySelectorAll(".segmented__btn")].forEach((btn) => {
    const active = Number(btn.dataset.spread) === n;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-checked", String(active));
  });
}

function bindEvents() {
  els.areaSelect.addEventListener("change", (e) => {
    state.area = e.target.value;
    // Rebuild the active reading for the new area (no re-deal, no auto-speak).
    if (state.current) {
      state.current.areaKey = state.area;
      buildReading(state.current, { speak: false });
    }
  });

  els.spreadToggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".segmented__btn");
    if (!btn) return;
    syncSpreadToggle(Number(btn.dataset.spread));
  });

  els.shuffleBtn.addEventListener("click", shuffleDeck);
  els.drawBtn.addEventListener("click", draw);
  els.muteBtn.addEventListener("click", toggleMute);

  els.continueBtn.addEventListener("click", showControls);
  els.skipBtn.addEventListener("click", () => {
    els.seekerName.value = "";
    els.seekerQuestion.value = "";
    els.seekerDob.value = "";
    showControls();
  });
  els.editDetailsBtn.addEventListener("click", showSeeker);

  els.dailyBtn.addEventListener("click", drawDaily);
  els.historyBtn.addEventListener("click", openHistory);
  els.historyClear.addEventListener("click", clearHistory);

  // Drawer: close on backdrop / close button, open a reading or delete one.
  els.historyDrawer.addEventListener("click", (e) => {
    if (e.target.dataset.close === "history") closeHistory();
    const open = e.target.closest("[data-id]");
    if (open) openReading(open.dataset.id);
    const del = e.target.closest("[data-del]");
    if (del) { e.stopPropagation(); deleteFromHistory(del.dataset.del); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.historyDrawer.hidden) closeHistory();
  });
}

// --- Progressive Web App: service worker + install prompt ---
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "http:" && location.protocol !== "https:") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {/* offline unavailable */});
  });
}
let deferredInstall = null;
function setupInstall() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstall = e;
    els.installBtn.hidden = false;
  });
  els.installBtn.addEventListener("click", async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    els.installBtn.hidden = true;
  });
  window.addEventListener("appinstalled", () => { els.installBtn.hidden = true; });
}

// If the URL carries a shared reading (#r=...), open it on load.
function loadSharedFromUrl() {
  const m = /[#&]r=([^&]+)/.exec(location.hash);
  if (!m) return false;
  const reading = decodeReading(m[1]);
  if (!reading) return false;
  showControls();
  presentReading(reading, { deal: false, speak: false, save: false, status: "A shared reading." });
  // Clear the hash so a refresh doesn't re-trigger.
  history.replaceState(null, "", location.pathname);
  return true;
}

// --- Init ---
populateAreas();
bindEvents();
registerServiceWorker();
setupInstall();
setStatus(`Deck ready · ${DECK.length} cards · tap Shuffle to begin.`);
loadSharedFromUrl();
