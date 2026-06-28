# Mystery — Product Vision & Target "To‑Be" State

*Prepared from a business‑analysis perspective to turn a working prototype into a
defensible, monetizable product. This is a planning artifact, not a commitment —
scope each horizon against real demand and capacity.*

---

## 1. Vision

> **Make a meaningful, personal tarot reading available to anyone in under a
> minute — beautiful, spoken, and private — then deepen it into a daily ritual
> people return to and pay for.**

Mystery competes in the **mindfulness / self‑reflection / astrology
entertainment** space (alongside Co–Star, The Pattern, Labyrinthos, Golden
Thread Tarot). Our wedge is **immediacy + voice + zero friction**: no signup, no
download, works in any browser, reads to you aloud.

---

## 2. Where we are today (As‑Is)

| Capability | Status |
| --- | --- |
| 22 Major Arcana, 6 life areas, upright/reversed meanings | ✅ Shipped |
| Single + Past/Present/Future spreads | ✅ Shipped |
| Optional personalization (name, question, birth date → zodiac + numerology) | ✅ Shipped |
| Web Speech narration, mute, read‑again | ✅ Shipped |
| Two‑column board, deck shuffle/deal animations | ✅ Shipped |
| Static, dependency‑free, accessible, responsive | ✅ Shipped |

**Strengths:** fast, private, polished, $0 hosting (GitHub Pages).
**Gaps that cap value:** no persistence, no return reason (retention), no full
deck/spreads, no synthesis across cards, no revenue, no measurement.

---

## 3. Target "To‑Be" State

A Mystery user can:

1. **Arrive and read in seconds** (today) — but now with a **richer deck (full
   78 cards) and more spreads** for depth.
2. **Get a synthesized interpretation**, not just per‑card text — an AI narrator
   weaves the cards + their question + area into one cohesive reading.
3. **Build a ritual** — a *Daily Card* with an optional reminder, and a private
   **journal/history** of past readings they can revisit and reflect on.
4. **Keep and share** — save a reading, export it as a shareable image, or send a
   deep link.
5. **Go deeper if they choose** — a card encyclopedia / learn mode, illustrated
   art, ambient audio, multiple voices and languages.
6. **Pay for premium** — advanced spreads, unlimited history, ad‑free, custom
   decks — via a freemium model.
7. **Trust the experience** — clear "for reflection & entertainment" framing,
   privacy‑first (local by default), accessible, and fast.

---

## 4. Primary personas

- **The Curious Dabbler** — wants a quick, fun, pretty reading. Cares about speed
  and aesthetics. Monetization: ads / occasional premium spread.
- **The Daily Ritualist** — uses tarot for journaling and mindfulness. Cares about
  Daily Card, history, reminders. **Highest LTV → subscription target.**
- **The Learner** — wants to understand tarot. Cares about card meanings, learn
  mode, reversals. Monetization: premium content / courses.
- **The Gifter/Sharer** — shares readings socially. Drives **viral acquisition**.

---

## 5. Feature roadmap (Now / Next / Later)

Prioritized by **value ÷ effort**, sequenced so each horizon unlocks the next
(retention before monetization; measurement throughout).

### NOW — depth + retention foundations (low effort, high value)
| Feature | Why it matters | Notes |
| --- | --- | --- |
| **Full 78‑card deck** (Minor Arcana + courts) | Credibility & depth; serious users expect it | Pure data extension of existing `cards.js` shape |
| **Reading history / journal** (localStorage) | The #1 retention lever; gives a reason to return | No backend needed; private by default |
| **Daily Card** | Habit formation, daily active use | Deterministic per‑day seed |
| **Save / share a reading** (image export + deep link) | Free, viral acquisition | Canvas render + URL‑encoded state |
| **Analytics + "entertainment only" disclaimer** | Can't improve what you don't measure; sets expectations / reduces liability | Privacy‑respecting (e.g. Plausible) |
| **PWA: installable + offline** | App‑like presence, re‑engagement | Manifest + service worker; app is already static |

### NEXT — differentiation + first revenue
| Feature | Why it matters |
| --- | --- |
| **AI‑synthesized reading** (LLM narrates cards + question + area as one story) | Our strongest differentiator vs. static meaning lookups; turns data into insight |
| **More spreads** (Celtic Cross, Yes/No, Relationship, Decision) | Depth + natural free/premium split |
| **Accounts + cloud sync** (optional) | Cross‑device history; basis for subscriptions |
| **Freemium monetization** | Free: daily card, basic spreads, local history. Premium: advanced spreads, unlimited cloud history, AI synthesis, ad‑free |
| **Illustrated card art + ambient audio + voice/locale options** | Production value, immersion, accessibility, international reach |

### LATER — ecosystem & scale
| Feature | Why it matters |
| --- | --- |
| **Card encyclopedia / Learn mode** | Serves the Learner persona; SEO acquisition engine |
| **Custom & marketplace decks** (themes/artists) | New revenue + creator ecosystem |
| **Deeper astrology** (full natal chart, daily horoscope blend) | Expands TAM into astrology audience |
| **Community / shared readings** | Social loop, UGC |
| **Live readers marketplace** (book a human reader) | Highest‑revenue play; platform pivot — validate demand first |

---

## 6. Monetization model (freemium)

- **Free tier:** Major Arcana, single + 3‑card spreads, Daily Card, local history,
  voice narration. Funded by tasteful, non‑intrusive ads.
- **Premium (subscription, ~$3–6/mo):** full 78‑card deck, advanced spreads,
  **AI‑synthesized readings**, unlimited cloud history & journal, premium decks,
  ad‑free, extra voices/languages.
- **One‑off / à la carte:** premium deck packs, gift readings.
- **Marketplace (later):** rev‑share on third‑party decks and/or human readings.

Rationale: ritual users (highest LTV) convert on **history + daily habit + depth**;
keep acquisition free and viral via sharing and SEO.

---

## 7. Success metrics (KPIs)

- **Acquisition:** new users, share‑link conversion, organic/SEO traffic.
- **Activation:** % who complete a first reading; % who personalize.
- **Retention (north star):** **D1/D7/D30 return rate**, Daily Card streaks,
  readings per user per week.
- **Revenue:** free→premium conversion, MRR, ARPU, churn.
- **Engagement quality:** read‑aloud usage, journal entries saved, spread mix.

---

## 8. Non‑functional & compliance guardrails

- **Privacy‑first:** local‑by‑default; explicit opt‑in for any cloud/account data;
  clear data export/delete (GDPR/CCPA).
- **Responsible framing:** persistent "for reflection & entertainment, not
  medical, legal, or financial advice" disclaimer — especially on Health/Money
  areas.
- **Accessibility (WCAG 2.1 AA):** keyboard nav, ARIA, captions for narration,
  `prefers-reduced-motion` (already honored).
- **Performance:** keep it fast and lightweight; lazy‑load art/audio.
- **i18n:** externalize strings; meanings are translatable content assets.

---

## 9. Technical evolution

The static, dependency‑free core is an asset — evolve without losing it:

1. **Now:** stay static; add localStorage, a service worker (PWA), and a small
   analytics snippet. No backend.
2. **Next:** introduce a thin backend/serverless layer only where required —
   accounts/sync and a guarded LLM proxy for AI synthesis (never ship keys
   client‑side). Consider a light framework only if complexity demands it.
3. **Later:** content pipeline for decks/art, marketplace services, and a
   moderation layer for community/UGC.

---

## 10. Recommended first slice (next sprint)

Highest value for least effort, all shippable on the current static stack:

1. **Reading history (localStorage)** — retention foundation.
2. **Daily Card** — the habit loop.
3. **Share as image / link** — free viral acquisition.
4. **Disclaimer + privacy‑respecting analytics** — measure and de‑risk.

These four make Mystery a product people *return to and recommend* — the
prerequisite for everything monetizable that follows.
