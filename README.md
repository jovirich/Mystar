# Mystery 🔮

A self-contained tarot card reading web app. Shuffle the 22 Major Arcana,
choose an area of your life, draw your cards, and have the meaning of whatever
you draw displayed and **read aloud**.

No build step. No dependencies. Just plain HTML, CSS, and vanilla JavaScript
(ES modules).

## Features

- **Two-column "board" (desktop)** — a left card for optional personalization
  (name, question, birth date) with a **Skip**; once you Continue or Skip it
  swaps to the shuffle/draw controls. The right card holds the deck, which
  riffles when you shuffle and deals cards into the spread when you draw.
  Collapses to a single column on narrow screens.
- **Six areas of life** — General, Love, Career, Money, Health, and Spirit,
  each with its own hand-written meaning for every card.
- **Two spreads** — a Single card, or a Past · Present · Future three-card spread.
- **Authentic card art** — all 22 Major Arcana use the classic
  Rider–Waite–Smith illustrations; reversed cards are shown upside-down, as in a
  real reading. Each card also has keywords and distinct upright **and**
  reversed meanings per area.
- **Fisher–Yates shuffle** and random upright/reversed orientation on every draw.
- **3D card-flip reveal** — cards render face-down and flip in sequence;
  reversed cards are shown rotated 180°.
- **Read aloud** — the reading is spoken via the Web Speech API, with a
  "read aloud again" button and a mute toggle.
- **Mystical dark theme** — deep indigo background, gold accents, and an
  animated starfield.
- **Reading history / journal** — every reading is saved locally (in your
  browser) and can be revisited, reopened, or deleted from a slide-in drawer.
- **Card of the Day** — a deterministic daily card that's the same on every
  visit that day.
- **Share** — copy a link that reopens the exact reading, or export it as a
  polished PNG image.
- **Installable PWA** — add Mystery to your home screen and use it offline
  (service-worker cached app shell).
- **Privacy-first** — no accounts, no servers; your name, question, and history
  never leave your device.
- **Accessible & responsive** — keyboard-navigable, ARIA dialog for the history
  drawer, respects `prefers-reduced-motion`.

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
| `cards.js` | `AREAS`, the 22-card `DECK`, plus `ZODIAC` + `LIFE_PATH` data |
| `app.js` | Shuffle, draw, reading model, history, daily card, share, speech, PWA |
| `manifest.webmanifest` | PWA metadata (installable app) |
| `sw.js` | Service worker — offline app-shell cache |
| `icons/` | App icons (192/512) |
| `cards/` | Card artwork — `<card-id>.jpg` (Rider–Waite–Smith) |

## Credits & licensing

Card images are from the **Rider–Waite–Smith tarot deck**, illustrated by Pamela
Colman Smith (first published 1909). The artwork is in the **public domain**
(Smith died in 1951), sourced from
[Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck).
Images were resized and compressed for the web.

## Data & privacy

Everything runs client-side. Reading history and the daily card are stored in
your browser's `localStorage`; nothing is sent to a server. Use **Clear all** in
the history drawer to erase it. Shared links encode the reading in the URL
itself (no backend lookup).
