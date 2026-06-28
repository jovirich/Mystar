# Mystery 🔮

A self-contained tarot card reading web app. Shuffle the 22 Major Arcana,
choose an area of your life, draw your cards, and have the meaning of whatever
you draw displayed and **read aloud**.

No build step. No dependencies. Just plain HTML, CSS, and vanilla JavaScript
(ES modules).

## Features

- **Six areas of life** — General, Love, Career, Money, Health, and Spirit,
  each with its own hand-written meaning for every card.
- **Two spreads** — a Single card, or a Past · Present · Future three-card spread.
- **Full Major Arcana** — all 22 cards (The Fool → The World), each with a
  symbol, keywords, and distinct upright **and** reversed meanings per area.
- **Fisher–Yates shuffle** and random upright/reversed orientation on every draw.
- **3D card-flip reveal** — cards render face-down and flip in sequence;
  reversed cards are shown rotated 180°.
- **Read aloud** — the reading is spoken via the Web Speech API, with a
  "read aloud again" button and a mute toggle.
- **Mystical dark theme** — deep indigo background, gold accents, and an
  animated starfield.
- **Accessible & responsive** — works on mobile, respects
  `prefers-reduced-motion`.

## How to run

Because the app uses ES modules (`<script type="module">`), browsers won't load
it directly from `file://`. Serve the folder over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

Any static file server works (e.g. `npx serve`, VS Code Live Server) — the key
point is that you need a server, not a `file://` path.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page layout and controls |
| `styles.css` | Dark mystical theme, starfield, 3D flip animation |
| `cards.js` | `AREAS` and the 22-card `DECK` data |
| `app.js` | Shuffle, draw, render, reading, and speech logic |
