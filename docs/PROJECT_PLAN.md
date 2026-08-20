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
- [x] D-06 Numeral system decision per locale — added `formatNumeral(value, langCode)` to `frontend/src/lib/languages.js`. Policy: Western digits by default for every language (matches how Arabic/Urdu digital content actually renders on comparable platforms already), with Persian (`fa`) as the one override to Extended Arabic-Indic digits, since that's a genuine digital-native norm rather than just a formal register. More overrides should be added from correction data (T-21), not guessed ahead of it. **Not yet wired into a real display site** — the natural candidate (`numFmt` engagement counts in `ui/index.jsx`) is ambiguous: platforms commonly keep counts like "12.3k" in Western digits even in RTL UIs as chrome rather than content, so forcing it there risked getting the actual convention wrong. Better fits (course duration, certificate dates) don't exist as built screens yet — utility is ready for when they do.
- [x] **Foundational fix, not in the original list but blocking D-02/D-15/D-20 for any real content:** no rendered post ever carried an HTML `lang`/`dir` attribute — `:lang()` CSS, RTL mirroring, and screen-reader pronunciation all silently no-op without it. Added `isRtl()` to `frontend/src/lib/languages.js` and wired `lang`/`dir` onto the post caption in `frontend/src/components/feed/PostCard.jsx` (swaps between original and translation language as the reveal toggles). This is one component — replies, messages, comments, and every other content surface still need the same treatment before D-02/D-15/D-20 are actually true app-wide. Verified: `npm run build` clean, `npx eslint` on changed files shows only pre-existing unrelated errors.
- [x] **T-27/T-28 i18n foundation:** added `i18next`/`react-i18next` with English, Arabic, and Amharic catalogues in `frontend/src/i18n.js`; migrated shared navigation, mobile chrome, top-bar titles, and sign-in copy to translation keys. The selected UI language is persisted through `PATCH /users/me` into the existing Prisma `users.language` column, returned by auth as `uiLanguage`, and synchronized to i18next plus `<html lang>`/`dir`. Every feature-specific string is not extracted yet; migrate it to this catalogue as that surface is next touched rather than introducing a second translation mechanism.
- [x] D-07 Primitives: button, avatar (verified pre-existing — `PrimaryButton`/`GhostButton`/`Avatar` in `frontend/src/components/ui/index.jsx`). Type (a shared `Text` component using the new `--text-*` scale) and Input (form text field) are **not done** — components still hardcode `fontSize`/`style` per instance and forms style raw `<input>` ad hoc; no shared primitive to point them at yet.
- [x] D-08 Primitives: added `Card` (generic container). Toast already existed (`ToastContext`). **Sheet/Dialog not done** — no shared bottom-sheet/modal primitive exists anywhere in the app yet; deferred until a real screen needs one (StoryViewer currently rolls its own full-screen overlay rather than a reusable Dialog).
- [x] D-09 Primitives: added `Skeleton`, `SkeletonPostCard` (shaped like the actual post card per D-22, not a generic shimmer block), and `ErrorState` (icon + message + retry, same visual language as the existing `Empty`). `Empty` itself was already pre-existing.
- [x] D-10 Primitives: **Tabs** — 4 pages (`Profile.jsx`, `CreatorEarnings.jsx`, `LearnHome.jsx`, `RavenLeaderboard.jsx`) each hand-rolled their own tab bar, a real duplication (not speculative). Added `Tabs` to `ui/index.jsx` and wired it into `Profile.jsx` as the first migration — the other 3 still have their own copy and should move to the shared one when next touched. **Menu, Chip, Badge still not built** — no real duplicated call site found for these yet; deliberately not stubbed out ahead of one.
- [x] **D-05 follow-up — found a real miss.** The earlier `grep -rn "uppercase"` audit (session 1) only matched the CSS property/keyword, so it missed `.toUpperCase()` JS calls entirely. Swept for those separately: 6 of 10 hits were benign (avatar-initial monograms, ISO country-code normalization, HTTP method normalization — none are user-facing hierarchy). Fixed the 2 real ones: `Autopilot.jsx`'s status badge (dropped the transform, kept weight/colour) and `Profile.jsx`'s tab labels (fixed via the Tabs primitive above). Also replaced `TopBar.jsx`'s language-picker option text — was the 2-letter ISO code uppercased (`"EN"`, `"AR"`) — with each language's own native name (`English`, `العربية`, ...), which is both the D-05 fix and the more direct read of design-doc rule 0.4-9 ("language is content, not chrome... never a flag").
- [x] **D-11 Five-state screen standard — first real instance, not yet "implemented once, inherited everywhere."** Wired all five states into the home feed (`frontend/src/pages/Home.jsx`, the highest-traffic screen): loading now shows `SkeletonPostCard` instead of a bare spinner, and — the actual bug fixed here — a failed fetch used to hit an empty `catch {}` and fail completely silently, leaving the user staring at an infinite spinner or stale content with zero feedback. Added an `error` state rendering `ErrorState` with a working retry. Offline is still not distinguished from a generic error (same UI either way) — noted as a gap, not solved. Every other screen still needs the same treatment before this is actually "once, inherited everywhere."
- [ ] D-15 RTL mirroring system — layout, icons, gestures. i18n infrastructure is now available; layout, directional icons, and swipe gestures remain to be implemented and verified in RTL.
- [ ] D-21 Translation reveal — signature interaction. Not started — this is real interaction/animation design work (fold/unfold transition), not a token or primitive; deferred to when the composer/feed translation surface is actually built (R1.3).
- [x] D-22 Post card reviewed in every script — partial: `PostCard.jsx` now carries `lang`/`dir` (session 1) and has a matching `SkeletonPostCard` (session 2) so its loading state is shaped correctly regardless of script. Not yet visually reviewed on a real device in Arabic/Amharic — no browser available in this environment to do that pass; frontend dev container is running on `localhost:5180` for manual check.

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
- [x] **V-10 Composer — text — was already built, contrary to the master tracker's ❌.** `frontend/src/components/feed/CreateModal.jsx` (93 lines, real POST to `/vibes`) already existed with a working textarea, 500-char limit + counter (V-11 ✅ too), category picker, and was already wired to the "+" nav button in both `BottomNav`/`Sidebar` → `App.jsx`. The tracker was simply wrong about this one — worth remembering when trusting old scope docs over reading the actual code.
- [x] V-12 Language declaration on composer — added a language-pill row to `CreateModal.jsx` (native names, matching the D-05 fix in TopBar), defaulting to the reader's current language, sent as `language` in the POST body. Backend (`vibes.controller.ts`): honors a valid client-declared language over auto-detection (**T-10**, also now done) — falls back to the existing `LanguageDetector` only if the declared code isn't recognized.
- [x] **Real bug found and fixed while wiring this up:** the composer's `onCreated` callback was a literal no-op (`() => {}`) in `App.jsx` — posting worked (toast confirmed, vibe hit the DB) but the new post never appeared in the feed; the only way to see your own post was a manual reload. `Home` is a separate component instance behind a `<Route>` with no direct handle to it, so lifted a `justCreated` vibe up through `App.jsx` as a prop; `Home.jsx` dedupes by id so a later refetch that already contains it doesn't double it up.
- [x] **Also fixed:** the media-attach placeholder in the composer had no `onClick` at all — looked tappable, did nothing. Real photo/video upload (V-22 onward) doesn't exist yet (no cloud storage, no processing pipeline) and building that is out of scope for this pass, so gave it an honest "coming soon" toast instead of a silent dead click.
- [ ] V-13/V-14 Mention/hashtag autocomplete — not built (hashtags are still regex-extracted on submit with no autocomplete UI).
- [ ] V-15 Draft persistence across app kill — not built.
- [ ] V-16 Optimistic publish with visible rollback — still waits for the server response before showing the post (not literally optimistic), though the feed-sync fix above at least makes the *eventual* result correct.
- [ ] V-18 Edit post with visible marker.
- [ ] V-22–V-29 Media pipeline: upload permission → direct upload → compression → re-encode → **strip EXIF/location** → display sizes. Not started — needs cloud storage decision first.
- [x] V-01–V-03 Feed: ranked (verified pre-existing, `FeedEngine.rankFeed`), cursor pagination (still offset-based, see B1 note above — not literally cursor), pull to refresh (verified pre-existing).
- [x] **D-15 correction, found while touching `App.jsx`:** session 2's note that "`<html lang>` is hardcoded to `en` and never updated" was wrong — `App.jsx` already had a `useEffect` syncing `document.documentElement.lang` to the reading language. What was actually missing was `dir` — added `document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr"` alongside it. This only flips the root default, not layout mirroring (nav order, icon direction, swipe gestures) — that part of D-15 is still open.

### R1.3 — Translation surface (`T`)
- [x] T-10 Author-declared language takes priority — done alongside V-12 above (`backend/src/controllers/vibes.controller.ts`).
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

- **2026-08-20 (session 4):** Built the T-27/T-28 frontend localization foundation with `i18next` and `react-i18next`: a three-language (English/Arabic/Amharic) catalogue, a single initialization point, selected-language synchronization, and first migrations of shared app shell + sign-in strings. Added backend persistence using the existing Prisma `users.language` field (`PATCH /users/me` validates against supported language codes; auth exposes `uiLanguage`), so the preference follows a user across devices. Backend TypeScript and production frontend builds pass. Next: D-15 RTL shell mirroring, or continue extracting feature-surface strings while implementing the next R1 critical-path item.
- **2026-08-17 (session 3):** R0.2 was down to items blocked on prerequisites, so moved into R1.2 per the plan's own "unblocks everything downstream" flag on the composer. Found the master tracker was flat wrong that V-10 didn't exist — `CreateModal.jsx` was already a real, working composer. Added what was actually missing: V-12/T-10 language declaration (composer UI + backend priority-over-detection), and fixed two real bugs found while wiring it up — the composer's `onCreated` was a no-op so posted vibes never appeared in the feed without a manual reload, and the media-attach button had no `onClick` at all (silent dead click). Also corrected a wrong claim from session 2: `<html lang>` was already dynamically synced, not hardcoded — added the missing `dir` sync alongside it using `isRtl()`. Started a frontend dev container (`localhost:5180`) for this and the prior session; no live browser check was possible (Chrome extension not connected here), verified via build + tsc + lint diff instead throughout. **Lesson for next session: don't trust the master tracker's status marks at face value — verify against actual code before planning around a ❌.** Next: V-13/V-14 (mention/hashtag autocomplete), V-15 (drafts), or pivot to I (identity/onboarding) or S (safety) depending on priority call — composer's core loop is now real end-to-end.
- **2026-08-17 (session 2):** Continued top-to-bottom from R0.1. Audited the API contract: error/timestamp shape already uniform, pagination style genuinely split between admin (snake_case + total) and consumer feed (camelCase, no total) — documented rather than mass-renamed (breaking, no functional payoff, mobile unaudited). Added `hasMore` to the feed response and wired the real consumer (Home.jsx infinite scroll) to it. Added `/v1` API versioning as a pure additive alias alongside the existing bare routes (`backend/src/app.ts`) — verified identical live responses on both paths. Then D-07–D-11/D-22: added `Card`, `Skeleton`/`SkeletonPostCard`, `ErrorState` primitives and wired all five screen states into the home feed, fixing a real bug in the process — a failed feed fetch was hitting an empty `catch {}` and failing completely silently. Started the frontend dev container (`localhost:5180`) to verify — build and lint are clean (confirmed every flagged lint issue pre-dates this session via diff), but the Chrome extension isn't connected in this environment so no live visual/screenshot check was possible; left the container running for manual check. Backend changes verified live against `vylapp-backend-1` as in session 1. Then D-06: added `formatNumeral()` (Western digits by default, Persian gets Extended Arabic-Indic as the one launch-language override) — built but not yet wired into a real display site, none of the current candidates were an obviously-correct fit. Then D-10: found 4 pages hand-rolling their own tab bar, added a shared `Tabs` primitive and migrated `Profile.jsx` (the other 3 still pending). While doing that, found a real D-05 miss — the session-1 uppercase audit only grepped the CSS property and missed `.toUpperCase()` JS calls entirely; swept those separately, fixed the 2 real hierarchy violations (Autopilot status badge, Profile tabs) and improved `TopBar.jsx`'s language picker to show native names instead of uppercased ISO codes. All verified via build + lint (diffed to confirm zero new issues) + live HMR on the running frontend container. R0.2 is now close to exhausted for items without a hard prerequisite — remaining open D items (D-07 Text/Input, D-10 Menu/Chip/Badge, D-15, D-21) all need either a real screen or i18n infra that doesn't exist yet. Next natural move: either build the i18n foundation those depend on, or shift into R1 (I/V/T/C) where the composer and remaining identity flows live — composer (V-10) is flagged as the single most important unbuilt item in the whole plan.
- **2026-08-17 (session 1):** Wrote this plan from the two source docs. Backend: fixed L-35 (paid enrolment now fails closed), built A-17 (runtime feature flags, wired onto Spaces video/ticketed creation), built T-01 (translation cache keyed on text hash, wired into `TranslationEngine.translate()`). All verified live against `vylapp-backend-1` (tsx hot-reload, no new errors, existing data intact). Frontend: found D-01's colour/radius/shadow tokens and D-03's companion fonts already existed; added the missing type-scale + motion tokens, fixed the one D-05 uppercase violation, and — the more important find — discovered no content element anywhere sets `lang`/`dir`, so `:lang()` CSS and RTL never actually activate; wired it onto PostCard as the first real instance. `npm run build` clean. **Still not started:** mobile-side tokens (Flutter), D-06 numerals, and — the big one — any i18n infrastructure at all (T-27/T-28), which D-15's full RTL shell mirroring depends on. That's the next natural slice but is large enough to deserve its own session rather than a token-pass tack-on.
