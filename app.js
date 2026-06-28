// app.js — Mystery tarot app logic.
import { DECK, AREAS, ZODIAC, LIFE_PATH } from "./cards.js";

const POSITIONS = ["Past", "Present", "Future"];

// --- State ---
const state = {
  area: AREAS[0].key,
  spread: 1, // 1 = single card, 3 = past/present/future
  drawn: [], // [{ card, reversed }]
  muted: false,
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
};

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
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const z = zodiacFor(month, day);
  const lp = lifePathFor(dob);
  const lpNote = LIFE_PATH[lp];
  return {
    label: `${z.emoji} ${z.sign} · Life Path ${lp}`,
    sentence: `As a ${z.sign}, you are ${z.note}, walking ${lpNote}.`,
  };
}

// A working copy of the deck we can shuffle without touching the source.
let deck = [...DECK];

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
  state.drawn = [];
  els.spread.innerHTML = "";
  els.reading.hidden = true;
  els.reading.innerHTML = "";
  setStatus(`Deck shuffled · ${deck.length} cards · draw when you're ready.`);
}

function setStatus(text) {
  els.deckStatus.textContent = text;
}

// --- Drawing ---
function drawCards(n) {
  // Draw N unique cards from the (already shuffled) deck, each with a
  // random upright/reversed orientation.
  const picks = deck.slice(0, n).map((card) => ({
    card,
    reversed: Math.random() < 0.5,
  }));
  return picks;
}

function draw() {
  // Reshuffle each draw so repeated draws feel fresh.
  deck = shuffle([...DECK]);
  const n = state.spread;
  state.drawn = drawCards(n);

  renderFaceDown(state.drawn);
  setStatus(
    n === 1
      ? "A single card is drawn — revealing…"
      : "Three cards are drawn — revealing Past, Present, Future…"
  );

  // Flip them in sequence, then build + speak the reading.
  flipInSequence(state.drawn).then(() => {
    buildReading();
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
    front.innerHTML = `
      <div class="card__symbol">${card.symbol}</div>
      <div class="card__number">${romanOrNumber(card.number)}</div>
      <h3 class="card__name">${card.name}</h3>
      <div class="card__orientation">${reversed ? "Reversed" : "Upright"}</div>
    `;

    inner.appendChild(back);
    inner.appendChild(front);
    cardEl.appendChild(inner);
    slot.appendChild(cardEl);
    els.spread.appendChild(slot);
  });
}

function flipInSequence(drawn) {
  const cards = [...els.spread.querySelectorAll(".card")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gap = reduceMotion ? 80 : 450;

  return new Promise((resolve) => {
    cards.forEach((cardEl, i) => {
      setTimeout(() => {
        cardEl.classList.add("is-flipped");
        if (i === cards.length - 1) {
          // Wait for the final flip animation to finish.
          setTimeout(resolve, reduceMotion ? 60 : 700);
        }
      }, i * gap);
    });
    if (cards.length === 0) resolve();
  });
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
  return str.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// --- Reading ---
function buildReading() {
  const area = AREAS.find((a) => a.key === state.area);
  const drawn = state.drawn;
  const seeker = getSeeker();
  const insight = birthInsight(seeker.dob);

  const header = document.createElement("div");
  header.className = "reading__header";
  const greeting = seeker.name ? `${escapeHtml(seeker.name)}’s ` : "";
  header.innerHTML = `
    <h2 class="reading__title">${area.icon} ${greeting}${area.label} reading</h2>
  `;

  const againBtn = document.createElement("button");
  againBtn.type = "button";
  againBtn.className = "btn btn--ghost";
  againBtn.id = "read-again-btn";
  againBtn.textContent = "🔊 Read aloud again";
  againBtn.addEventListener("click", () => speak(readingToText(drawn, area)));
  header.appendChild(againBtn);

  els.reading.innerHTML = "";
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
    const meaning = card[orient][state.area];
    const keywords = card.keywords[orient];

    const entry = document.createElement("div");
    entry.className = "reading__entry";

    const positionLabel = drawn.length === 3 ? `${POSITIONS[i]} · ` : "";

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

  // Read it aloud.
  speak(readingToText(drawn, area));
}

function readingToText(drawn, area) {
  const seeker = getSeeker();
  const insight = birthInsight(seeker.dob);
  const parts = [];

  parts.push(
    seeker.name
      ? `${seeker.name}, here is your ${area.label} reading.`
      : `${area.label} reading.`
  );
  if (seeker.question) parts.push(`You asked: ${seeker.question}.`);
  if (insight) parts.push(insight.sentence);

  drawn.forEach(({ card, reversed }, i) => {
    const orient = reversed ? "reversed" : "upright";
    const meaning = card[orient][state.area];
    const prefix = drawn.length === 3 ? `${POSITIONS[i]}: ` : "";
    parts.push(`${prefix}${card.name}, ${orient}. ${meaning}`);
  });
  return parts.join(" ");
}

// --- Speech (Web Speech API) ---
function speak(text) {
  if (state.muted) return;
  if (!("speechSynthesis" in window)) return;

  // Stop anything currently being spoken first.
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
  if (state.muted && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// --- Events ---
function setSpread(n) {
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
    // If cards are already on the table, rebuild the reading for the new area.
    if (state.drawn.length) buildReading();
  });

  els.spreadToggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".segmented__btn");
    if (!btn) return;
    setSpread(Number(btn.dataset.spread));
  });

  els.shuffleBtn.addEventListener("click", shuffleDeck);
  els.drawBtn.addEventListener("click", draw);
  els.muteBtn.addEventListener("click", toggleMute);
}

// --- Init ---
populateAreas();
bindEvents();
setStatus(`Deck ready · ${DECK.length} cards · tap Shuffle to begin.`);
