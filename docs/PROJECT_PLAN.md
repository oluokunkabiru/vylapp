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
- [ ] **A-17 Runtime feature control** — add a feature-flag table/service so any capability can be killed without an app-store release. Needed before shipping anything risky (Spaces, paid enrolment reopening, new composer).
- [ ] **T-01 Translation cache** — key on (source text hash + target language). Build before any translation is served to a real user — cost is 30x different depending on this.

### R0.1 — Backend contract (`B1`)
- [ ] One error shape, one pagination style, one timestamp format across all endpoints.
- [ ] API versioning so shipped mobile builds don't break on backend changes.

### R0.2 — Design tokens & primitives (`D`)
- [ ] D-01 Token system (colour, type, space, radius, elevation, motion) — web CSS vars + mobile theme constants, same names.
- [ ] D-05 Remove uppercase from brand hierarchy (structural, not cosmetic — Arabic/Amharic have no capitals).
- [ ] D-03 Companion faces for Arabic (Noto Sans Arabic) and Ethiopic (Noto Sans Ethiopic), tuned to primary face.
- [ ] D-02 Type scale with per-script line heights.
- [ ] D-06 Numeral system decision per locale (Western vs Eastern Arabic digits).
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

- **2026-08-17 (session 1):** Wrote this plan from the two source docs. Verified against live repo: confirmed L-35 vulnerability was real and current (`backend/src/controllers/learn.controller.ts:277-304`, no `stripe` package, no live key). Fixed it — paid enrolment now fails closed. Next: A-17 feature flags, then T-01 translation cache, then D-01 design tokens.
