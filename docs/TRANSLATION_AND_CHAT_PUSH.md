# Translation, Social Sign-In & Chat Push Notifications

Operational reference for three features that are entirely optional at
runtime — every one of them degrades gracefully to a working (if less
capable) mode when its env vars are left blank. Nothing here is required
to run the platform locally.

## 1. Language translation

**What it does:** every Vibe, forum thread/reply, and DM/group message is
tagged with its detected source language (`backend/src/services/languageDetector.ts`,
using `franc-min`). When a viewer reads content in a different language
(`?lang=xx` query param, driven by the language picker in the Sidebar/TopBar),
`backend/src/services/translationEngine.ts` translates it for them and caches
the result (`vibe_translations` / `content_translations` tables) so the same
popular post is never translated twice.

**Two translation methods, selected automatically:**

| Method | Used when | Quality |
|---|---|---|
| `claude` | `ANTHROPIC_API_KEY` is set AND the viewer has AI quota left today | High — real machine translation via the Claude API |
| `organic` (dictionary) | No API key, or daily AI quota exhausted | Basic — a small built-in phrase dictionary |

**Daily AI-translation quota** (`translationEngine.ts`, `translation_usage` table):
free users get 30 Claude translations/day, Pro users get 500/day, shared
across vibes/forum/messages as one platform-wide budget. Anonymous
(logged-out) viewers always get the dictionary fallback.

**Env vars:**

```env
# backend/.env — leave blank to run fully offline, zero external calls
ANTHROPIC_API_KEY=
```

That's the only variable this feature needs. There is no separate
translation-provider config — Claude is used for both moderation and
translation via the same key.

**Supported languages:** the full picker list lives in one place —
`backend/src/services/translationEngine.ts`'s `LANGUAGES` array — and is
mirrored in `frontend/src/lib/languages.js` (codes must match exactly, since
they're sent straight through as `?lang=`). It is *not* a hard limit: the
Claude path can translate to/from any language code at all; `LANGUAGES` is
only the one-tap picker's option set.

---

## 2. Social sign-in (OAuth)

**What it does:** `GET /auth/oauth/providers` tells the frontend which
providers are configured (a provider with blank client credentials is
silently omitted from the login screen — no error, just hidden). Google,
LinkedIn, and Twitter/X use standard Authorization Code flow; Twitter
additionally uses PKCE; Apple additionally requires a self-signed JWT
client secret and verifying the returned `id_token` ourselves (Apple has no
userinfo endpoint). Implementation: `backend/src/services/oauthEngine.ts` +
`backend/src/controllers/auth.controller.ts`'s `oauthStart`/`oauthCallback`.

**Env vars:**

```env
# backend/.env
API_BASE_URL=http://localhost:4000   # must exactly match the redirect_uri registered with each provider

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# Apple: Services ID (not the App ID) + Sign in with Apple key (.p8)
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
```

Each provider's redirect URI to register in its developer console is
`API_BASE_URL + /auth/oauth/<provider>/callback` (e.g.
`http://localhost:4000/auth/oauth/google/callback`).

Leave every var blank to disable social sign-in entirely — email/password
auth is unaffected.

---

## 3. Chat push notifications (Firebase Cloud Messaging)

**What it does:** real-time in-app updates (new-message badges, the live
message list) already work over Socket.IO whenever the app is open — that
part needs no configuration. Firebase adds the piece Socket.IO can't cover:
a push notification when the recipient's tab/app is backgrounded or fully
closed. New DM/group messages trigger a push (`backend/src/services/pushEngine.ts`,
called from `messaging.controller.ts`'s `sendMessage`) to every other
conversation member who (a) has at least one registered device token,
(b) hasn't muted that conversation (`conversation_members.muted_until`), and
(c) hasn't disabled push DMs in their notification preferences.

Device tokens are stored in the existing `push_tokens` table (one row per
device — a user can have several: web, iOS, Android). The frontend registers
a token via `POST /notifications/push-token` once the user grants
notification permission (`frontend/src/lib/firebase.js`, wired up by the
headless `PushNotificationManager` component mounted in `App.jsx`).

**Setup steps:**

1. Firebase console → create/select a project.
2. **Project Settings → Service accounts → Generate new private key** — this
   JSON gives you the three backend values below.
3. **Project Settings → Your apps → Web app** — register a web app if you
   haven't; this gives you the frontend config values.
4. **Project Settings → Cloud Messaging → Web Push certificates** — generate
   a key pair for the VAPID key.
5. Paste the same web config values into `frontend/public/firebase-messaging-sw.js`
   too — service workers are plain scripts outside the Vite build, so they
   can't read `VITE_FIREBASE_*` at runtime; the file has a `REPLACE_WITH_*`
   placeholder for each value (all public config, none of it secret).

**Env vars:**

```env
# backend/.env — server-side FCM delivery (Admin SDK)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# frontend/.env — browser config (public, safe to commit — not secrets)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=
```

Leave the backend three blank to disable FCM sending entirely
(`PushEngine.isConfigured()` short-circuits) — Socket.IO real-time delivery
is completely unaffected either way.
