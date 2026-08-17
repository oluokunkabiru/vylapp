# VYLAPP — Execution Plan
### One document. Sequenced. Checked off as it lands.

Source: `VYLAPP — MASTER PROGRESS TRACKER` + `VYLAPP — THREE-STACK BUILD PLAN` (17 Aug 2026).
This file supersedes those for day-to-day execution — item IDs (`D-`, `I-`, `V-`, `L-`, `C-`, `T-`, `S-`, `A-`, `M-`, `G-`, `R-`) are kept so it stays traceable back to the source docs.

**Rule:** work top to bottom within a release. Don't start R2 items while R1 has open blockers. Tick `[x]` and add a one-line note (file/commit) when an item lands. If an item turns out to already be done, mark it `[x] (verified pre-existing)` rather than re-doing it.

**Session log** is at the bottom — append one line per work session so future sessions know where execution stopped.

---

## R0 — Foundation
*Gate: a new screen can be built from primitives and works in three languages. Nothing in R1 starts until R0's hard blockers are closed.*

### R0.0 — Immediate risk (do first, regardless of release order)
- [x] **Close the paid-enrolment vulnerability (L-35)** — `backend/src/controllers/learn.controller.ts` accepted a client-supplied `stripe_payment_intent_id` with no verification against Stripe (no `stripe` package installed, no live key configured). Fixed: paid-course enrolment now fails closed (402) until `M-06` server-side verification exists. Free-course enrolment untouched.
- [x] **A-17 Runtime feature control** — `feature_flags`/`user_feature_flags` tables and admin CRUD already existed but nothing consumed them. Added `backend/src/services/featureFlags.service.ts` (cached lookup, deterministic rollout-pct bucketing, per-user override) and `backend/src/middleware/featureFlag.ts` (`requireFeature`). Wired onto `POST /spaces` — video Spaces gated by `video_spaces`, ticketed Spaces by `paid_spaces` — as the first real consumer. Admin flag CRUD now calls `invalidate()` so edits apply immediately instead of waiting out the 15s cache. Future risky routes (composer, reopened paid enrolment) should gate through this same middleware rather than a redeploy.
- [x] **T-01 Translation cache** — added `TranslationCache` model (`backend/prisma/schema.prisma`, migration `20260817134817_add_translation_cache`) keyed on `(sha256(text), target_lang)`, independent of which content item the text came from. Wired into `TranslationEngine.translate()` (`backend/src/services/translationEngine.ts`) as a check before any Claude call — a hit skips the AI call entirely regardless of whether the identical text appeared in a different vibe, forum reply, or message. Sits underneath the existing per-item caches (`vibe_translations`, `content_translations`), which are unchanged. Applied via `prisma db push` (not `migrate dev`, which wanted to reset the dev DB over pre-existing, unrelated extension drift) then backfilled into migration history and marked applied so `migrate deploy` stays clean for other environments. T-02 (hit-rate measurement/alerting) is not done — `hit_count` is tracked per row but nothing surfaces it yet; candidate for the A-22 translation quality dashboard.

### R0.1 — Backend contract (`B1`)
- [x] **Audited error shape / pagination / timestamps.** Error/success shape (`{ ok, data }` / `{ ok, error: { message } }`) is already uniform across all 24 controllers — 22 import the shared `respond.ts` helper, the other 2 (`forum.controller.ts`, `learn.controller.ts`) hand-roll the identical shape rather than importing it (style debt, not a contract bug — left alone). Timestamps are Prisma `Date` → `JSON.stringify` → ISO 8601 everywhere, no inconsistency found. Pagination is **not** one style: admin endpoints (12 of them) consistently use `page`/`page_size` (snake_case) query params and response fields with a `total` count; the consumer feed (`vibes.controller.ts`) uses `page`/`pageSize` (camelCase) with no `total`. Did not do a sweeping rename — that's a breaking change across every frontend + mobile caller with no functional payoff, and mobile wasn't audited as part of this pass. Documented as a known, deliberately-deferred inconsistency rather than silently left unlabelled.
- [x] Feed pagination: added `hasMore` to `GET /vibes/feed` (`backend/src/controllers/vibes.controller.ts`) so a caller doesn't have to infer "stop paginating" from array length. Wired the actual consumer (`frontend/src/pages/Home.jsx`'s infinite scroll) to use it instead of its `length === pageSize` heuristic. Note left in the code: the feed's candidate window is a fixed "latest 100" re-queried per request, so `hasMore` is honest about *that* window but the underlying offset-on-a-moving-window scheme is still what V-02 (cursor pagination) needs to replace.
- [x] **API versioning (B1)** — zero versioning existed (all routes mounted unprefixed on `app`, e.g. `/vibes`, `/spaces`). Added a shared `apiRouter` in `backend/src/app.ts` mounted at both the bare path (kept, so every client built before this change keeps working) and `/v1` (same handlers, alias). Purely additive — verified `/spaces` and `/v1/spaces` return identical live data. New work should target `/v1/*`; the bare mount can be dropped later once clients confirm migration.

### R0.2 — Design tokens & primitives (`D`)
- [x] D-01 Token system (colour, type, space, radius, elevation, motion) — web CSS vars. Colour/radius/shadow already existed in `frontend/src/styles/tokens.css`; added named type-scale roles (`--text-display/title/body/caption/mono`) and motion tokens (`--duration-*`, `--ease-*`, with `prefers-reduced-motion` override). **Mobile theme constants (Flutter side) not started** — `mobile/lib` has no equivalent token file yet; same names need porting there before D-01 is fully done for that stack.
- [x] D-05 Remove uppercase from brand hierarchy — audited (`grep -rn uppercase`), found exactly one structural usage app-wide: `.lp-section__label` in `frontend/src/pages/Landing.css` (marketing page eyebrow). Fixed — kept the weight/colour hierarchy, dropped `text-transform: uppercase` and the letter-spacing that went with it.
- [x] D-03 Companion faces for Arabic/Ethiopic (verified pre-existing) — `index.html`/`tokens.css` already load and stack Noto Sans Arabic, Devanagari, SC, Ethiopic behind Sora.
- [x] D-02 Type scale with per-script line heights — added `:lang(ar|ur|fa|ps|am|ti|yo|ha)` line-height override in `tokens.css`. This only activates where an element actually carries a `lang` attribute, which almost nothing did — see the PostCard fix below, the first real wiring of it.
- [ ] D-06 Numeral system decision per locale (Western vs Eastern Arabic digits) — not started, no numeral-formatting utility exists yet.
- [x] **Foundational fix, not in the original list but blocking D-02/D-15/D-20 for any real content:** no rendered post ever carried an HTML `lang`/`dir` attribute — `:lang()` CSS, RTL mirroring, and screen-reader pronunciation all silently no-op without it. Added `isRtl()` to `frontend/src/lib/languages.js` and wired `lang`/`dir` onto the post caption in `frontend/src/components/feed/PostCard.jsx` (swaps between original and translation language as the reveal toggles). This is one component — replies, messages, comments, and every other content surface still need the same treatment before D-02/D-15/D-20 are actually true app-wide. Verified: `npm run build` clean, `npx eslint` on changed files shows only pre-existing unrelated errors.
- [ ] **Not attempted this session — genuinely separate, larger scope:** T-27/T-28 (interface string extraction + i18n library) and D-15 full RTL shell mirroring. There is currently zero i18n infrastructure in the frontend (no `useTranslation`, no locale context, `<html lang>` is hardcoded to `"en"` and never updated). This is required before D-15/D-17/G-... can be more than per-component patches, and deserves its own dedicated session rather than being squeezed into a tokens pass.
- [ ] D-07 Primitives: type, button, input, avatar (web `frontend/src/components/ui`, mobile `mobile/lib/shared/widgets`).
- [ ] D-08 Primitives: card, sheet, dialog, toast.
- [ ] D-09 Primitives: skeleton, empty state, error state.
- [ ] D-10 Primitives: tabs, menu, chip, badge.
- [ ] D-11 Five-state screen standard (loading/empty/error/offline/success) implemented once, inherited everywhere.
- [ ] D-15 RTL mirroring system — layout, icons, gestures.
- [ ] D-21 Translation reveal — signature interaction (build the mechanism now; wired into surfaces in R1).
- [ ] D-22 Post card reviewed in every script (most-repeated element).

**R0 gate check:** primitives render correctly in English, Arabic, Amharic before moving to R1.

---

## R1 — Alpha
*Gate: 50 users on real devices in Lagos and Nairobi complete the full loop (sign up → post → follow → message).*

### R1.1 — Identity & account (`I`)
- [x] I-01 Email + password (verified pre-existing).
- [ ] I-02 Phone + one-time code.
- [ ] I-03 Google sign-in (finish partial).
- [ ] I-13/I-14/I-15 Date of birth capture, server-side age computation (fail-closed), permanent minor flag.
- [ ] I-17 Language selection as first onboarding screen, each language in its own script.
- [ ] I-26 Edit profile.
- [ ] I-29 Settings surface.

### R1.2 — Vibe: posting is the critical path (`V`)
- [ ] **V-10 Composer — text.** Single most important unbuilt item in the whole plan; everything downstream is blocked on it.
- [ ] V-12 Language declaration on composer.
- [ ] V-16 Optimistic publish with visible rollback.
- [ ] V-18 Edit post with visible marker.
- [ ] V-22–V-29 Media pipeline: upload permission → direct upload → compression → re-encode → **strip EXIF/location** → display sizes.
- [ ] V-01–V-03 Feed: ranked, cursor pagination, pull to refresh.

### R1.3 — Translation surface (`T`)
- [ ] T-11/T-12/T-13 Translation reveal wired into feed — original always reachable, attribution visible.
- [ ] T-21 Correction affordance on every translation.
- [ ] T-06 Translation API integration (behind T-01 cache + T-08 budget cap).

### R1.4 — Basic messaging (`C`)
- [x] C-01/C-02/C-05 Conversation list, 1:1 conversation, send text (verified pre-existing).
- [ ] C-12 Per-message translation.
- [ ] C-13 Message requests inbox for non-connections.

**R1 gate check:** a Lagos user and a Nairobi user, writing in different languages, complete sign-up → post → follow → DM without a native English speaker's help.

---

## R2 — Beta
*Gate: 500 users. Moderator response under 24h. Correction rate trending down.*

- [ ] `S` complete — muted words per language, appeals, Arabic pattern detection (S-13, currently absent), classifier coverage.
- [ ] `A` moderation operational — queue priority ordering (A-06), age visibility (A-07), phone-usable queue (A-08), mandatory reason on destructive actions (A-13).
- [ ] `L` Learn Core (L-09 through L-30) — catalogue, lesson viewer (video/text/audio), translated lessons, certificates, offline download.
- [ ] `C` communities (C-17–C-28).
- [ ] `G` search + notifications (diacritic-tolerant search, quiet hours, grouping).

## R3 — Launch, Lagos
*Gate: both stores accept. A named human is on call.*
- [ ] All of `R` (launch readiness) — legal filings, store compliance, security disclosure, named moderator (R-23), first 100 Lagos creators (R-24), launch week content (R-25).

## R4 — Spaces
*Gate: recorded, adults-first, cost-capped.*
- [ ] C-29 room access token issuing (currently missing — Spaces cannot connect at all) through C-42.

## R5 — Learn Full
*Gate: instructors can publish and earn.*
- [ ] L-31 through L-48 — creator authoring, paid courses (reopens only after M-06 ships), assessments, cohorts.

## R6 — Creator economy
*Gate: a Lagos creator receives money in their bank account.*
- [ ] All of `M` — payment providers (Nigeria, Kenya mobile money, pan-African), M-06 server-side verification, payouts.

## R7 — Scale
*Gate: Lagos signals legible and stable.*
- [ ] Nairobi expansion, language expansion driven by correction volume.

---

## Session log
*One line per work session — what landed, what's next.*

- **2026-08-17 (session 2):** Continued top-to-bottom from R0.1. Audited the API contract: error/timestamp shape already uniform, pagination style genuinely split between admin (snake_case + total) and consumer feed (camelCase, no total) — documented rather than mass-renamed (breaking, no functional payoff, mobile unaudited). Added `hasMore` to the feed response and wired the real consumer (Home.jsx infinite scroll) to it. Added `/v1` API versioning as a pure additive alias alongside the existing bare routes (`backend/src/app.ts`) — verified identical live responses on both paths. All changes type-check, frontend builds clean, verified live against running containers. Next: D-07 through D-11 (primitives) or continue into R1 depending on priority call.
- **2026-08-17 (session 1):** Wrote this plan from the two source docs. Backend: fixed L-35 (paid enrolment now fails closed), built A-17 (runtime feature flags, wired onto Spaces video/ticketed creation), built T-01 (translation cache keyed on text hash, wired into `TranslationEngine.translate()`). All verified live against `vylapp-backend-1` (tsx hot-reload, no new errors, existing data intact). Frontend: found D-01's colour/radius/shadow tokens and D-03's companion fonts already existed; added the missing type-scale + motion tokens, fixed the one D-05 uppercase violation, and — the more important find — discovered no content element anywhere sets `lang`/`dir`, so `:lang()` CSS and RTL never actually activate; wired it onto PostCard as the first real instance. `npm run build` clean. **Still not started:** mobile-side tokens (Flutter), D-06 numerals, and — the big one — any i18n infrastructure at all (T-27/T-28), which D-15's full RTL shell mirroring depends on. That's the next natural slice but is large enough to deserve its own session rather than a token-pass tack-on.
