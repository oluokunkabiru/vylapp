# VYLAPP

**Vibe. Learn. Connect.**

Next-generation edutainment and multicultural communities forum.

---

## Platform overview

Vylapp is a multicultural social platform combining a community feed (Vibes), live audio rooms (Spaces), structured learning (Learn), threaded community forums (Forum), and a creator economy — built for Lagos, Nairobi, and diaspora communities across borders and languages.

The core differentiator is cross-language communication at the feed level: users read and post in their own language. The translation engine — supporting English, Yoruba, Hausa, Swahili, Igbo, Amharic, French, Spanish, and Arabic — runs server-side via the Anthropic API and is the product's primary competitive moat.

---

## Monorepo structure

```
vylapp-platform/
├── backend/          Node.js 20 + Express 4 + PostgreSQL 16
├── frontend/         React 18 + Vite 5 + Socket.IO client
├── mobile/           Flutter 3.22 + Dart 3.3 (iOS + Android)
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Quick start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- Flutter 3.22+ (`flutter doctor` should pass)
- Anthropic API key (for translation and content moderation)

See [`docs/TRANSLATION_AND_CHAT_PUSH.md`](docs/TRANSLATION_AND_CHAT_PUSH.md) for
the full env var reference for translation, social sign-in (OAuth), and
Firebase chat push notifications — all optional, all degrade gracefully.

### 1. Database

```bash
# With Docker
docker compose up postgres -d

# Or bare PostgreSQL
createdb vylapp_dev
```

### 2. Backend

```bash
cd backend
cp ../.env.example .env        # fill in your secrets
npm install
npx prisma migrate deploy      # applies all pending Prisma migrations
npm run dev                    # starts on port 4000
```

Migration order is handled automatically:
1. `schema.sql` — core tables (users, vibes, spaces, etc.)
2. `schema_learn.sql` — Learn pillar (13 tables)
3. `schema_forum.sql` — Forum architecture (9 tables)
4. `schema_rbac.sql` — RBAC (5 tables, 10 roles, 51 permissions)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                    # starts on port 5173, proxies /api → localhost:4000
```

### 4. Mobile

```bash
cd mobile

# 1. Add Firebase config files (from Firebase console):
#    android/app/google-services.json
#    ios/Runner/GoogleService-Info.plist

# 2. Install dependencies
flutter pub get

# 3. Run on a connected device or simulator
flutter run

# 4. For release builds:
flutter build apk --obfuscate --split-debug-info=build/symbols
flutter build ios --obfuscate --split-debug-info=build/symbols
```

For local development, the mobile app points to the backend at `http://localhost:4000`. On a physical device, replace `localhost` with your machine's local IP in `mobile/lib/core/constants/api_constants.dart`.

---

## Backend architecture

```
backend/src/
├── app.js                   Express app factory
├── server.js                HTTP server + Socket.IO bootstrap
├── config/
│   ├── db.js                PostgreSQL pool (pg)
│   └── env.js               Environment variable validation
├── db/
│   ├── seed.ts              Demo data seeder (idempotent, safe to re-run)
│   ├── schema.sql           Historical reference only — no longer executed;
│   │                        the live schema is now tracked by Prisma
│   │                        migrations in prisma/migrations/
│   ├── schema_learn.sql     Learn pillar (13 tables, 4 triggers)
│   ├── schema_forum.sql     Forum (9 tables, 3 triggers)
│   └── schema_rbac.sql      RBAC (5 tables, 10 roles, 51 permissions)
├── middleware/
│   ├── auth.js              JWT verification + RBAC context loader
│   ├── rbac.js              requirePermission, requireRole, requireAnyPermission
│   ├── rateLimiter.js       Sliding-window rate limiter (no Redis dependency)
│   ├── asyncHandler.js
│   └── errorHandler.js
├── rbac/
│   ├── index.js             RBAC engine (Spatie-equivalent API)
│   └── PermissionCache.js   TTL cache, per-user invalidation
├── routes/                  18 route files
├── services/                13 business logic engines
├── sockets/                 Socket.IO event handlers
└── utils/
    ├── crypto.js            scrypt + HMAC-SHA256 JWT (zero dependencies)
    └── respond.js           { ok, fail } response shapes
```

### RBAC system

Roles: `super_admin`, `platform_admin`, `content_moderator`, `verified_educator`, `educator`, `creator`, `community_moderator`, `pro_subscriber`, `restricted`, `user`

Permission naming: `resource.action[.scope]` — e.g. `vibes.create`, `vibes.delete.any`, `admin.roles.manage`

Wildcard: `vibes.*` grants all vibe permissions. `*` grants everything (super_admin only).

Community scoping: a `community_moderator` role can be assigned with a `scope_type=community` and `scope_id=<category_uuid>` — the user has moderator permissions only within that community.

Management API at `/rbac/*` — requires `admin.roles.manage` permission.

### Security layer

- Passwords: `scrypt` (memory-hard, salted, 64-byte key)
- JWT: HMAC-SHA256, `alg:none` downgrade protection, 15-minute access token
- 2FA: RFC 6238 TOTP with constant-time comparison
- Rate limiting: sliding-window per route prefix, keyed on user ID or IP
- Content moderation: two-layer (multilingual regex + Claude API), prompt-injection-safe
- RBAC: TTL-cached permission resolution, community-scoped roles, full audit logging
- Input sanitisation: Unicode normalisation, control character stripping

---

## Frontend architecture

```
frontend/src/
├── lib/
│   ├── api.js               Fetch wrapper with JWT injection and auto-refresh
│   └── socket.js            Socket.IO client singleton
├── pages/                   11 pages (React Router 6)
├── components/              Shared UI components
└── stores/                  Zustand state
```

**⚠ PENDING SECURITY REMEDIATION:** The frontend currently stores JWT tokens in `localStorage`. This is accessible to JavaScript and is therefore vulnerable to XSS token theft. The correct remediation is to migrate to `httpOnly` cookies (inaccessible to JavaScript), which requires adding cookie-based auth support to the backend. This is tracked as a pending item. Until it is resolved, ensure all user-facing input fields are escaped and no third-party scripts are loaded without Subresource Integrity (SRI) hashes.

---

## Mobile architecture

```
mobile/lib/
├── main.dart                Entry point — Firebase init, security scan, DI
├── app.dart                 MaterialApp with GoRouter and BLoC providers
├── core/
│   ├── constants/           Brand colours, text styles, API endpoints
│   ├── network/
│   │   ├── api_client.dart  Dio with JWT injection + auto-refresh interceptor
│   │   ├── socket_service.dart  Socket.IO real-time layer
│   │   └── network_exceptions.dart  Typed error hierarchy
│   ├── security/
│   │   ├── token_service.dart   flutter_secure_storage (Keychain/KeyStore)
│   │   └── security_service.dart  Jailbreak/root detection
│   ├── hardware/
│   │   └── hardware_bridge.dart  MethodChannel + EventChannel definitions
│   ├── firebase/
│   │   └── notification_service.dart  FCM + flutter_local_notifications
│   └── router/
│       ├── app_router.dart  GoRouter with auth guards
│       └── shell_screen.dart  Bottom navigation shell
├── features/                Auth, Feed, Spaces, Messages, Forum, Learn, ...
└── shared/widgets/          VylAvatar, VylButton, VylTextField, etc.
```

**Platform channels (hardware integration):**

| Channel | Android (Kotlin) | iOS (Swift) |
|---------|-----------------|-------------|
| `com.vylapp/hardware` | `MainActivity.kt` | `AppDelegate.swift` |
| `com.vylapp/ble_events` | BLE EventChannel | CoreBluetooth |
| `com.vylapp/nfc_events` | NFC EventChannel | CoreNFC |
| `com.vylapp/usb_events` | USB EventChannel | Not supported |

**Firebase configuration required:**
- `mobile/android/app/google-services.json` — download from Firebase console
- `mobile/ios/Runner/GoogleService-Info.plist` — download from Firebase console
- VAPID key for web push — set in `notification_service.dart`

**Android certificate pinning:**
- `mobile/android/app/src/main/res/xml/network_security_config.xml`
- Replace `REPLACE_WITH_YOUR_PRIMARY_CERT_SHA256_BASE64` with the actual Fly.io cert fingerprint
- Extract with: `openssl s_client -connect your-backend.fly.dev:443 | openssl x509 -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256 -binary | openssl enc -base64`

---

## Deployment

### Backend (Fly.io — Johannesburg region)

```bash
cd backend
fly launch --name vylapp-backend --region jnb
fly secrets set DATABASE_URL=... JWT_SECRET=... ANTHROPIC_API_KEY=...
fly deploy
```

### Frontend (Cloudflare Pages or Fly.io)

```bash
cd frontend
npm run build          # outputs to dist/
# Deploy dist/ to your CDN of choice
```

### Mobile (App Store + Play Store)

Follow the Flutter deployment docs for each platform. Enable code obfuscation on release builds (`--obfuscate`).

---

## Pending items

These are known gaps, tracked honestly. They are not bugs — they are unbuilt features in priority order.

**Critical:**
- `localStorage` JWT storage on web (XSS vulnerability — migrate to httpOnly cookies)
- 10 of 12 Flutter screens are UI stubs (architecture wired, UI unbuilt)
- Firebase config files missing (must be added before mobile builds)
- LiveKit not connected in SpaceRoom screen
- Socket.IO not wired to Flutter Chat screen

**High:**
- Stripe Connect — schema-only, no actual money movement
- Media upload endpoint — avatar/banner columns exist, no storage backend
- Transactional email — no account verification, password reset, or digest emails
- Android certificate pinning values are placeholders
- Kotlin BLE GATT read/write implementation is incomplete (channel defined, native code placeholder)

**Medium:**
- CDN for Lagos/Nairobi latency
- Flutter CI/CD pipeline (backend has GitHub Actions, mobile has none)
- Firebase Analytics event tracking (package added, no events instrumented)
- GDPR / NDPR / Kenya DPA compliance audit

---

## Seed credentials (development only)

```
Handle:   aisha.k
Password: VylappDemo123!

Other seeds: marcus.o, jade.n, remi.k, t.patel, l.chen, sena
All use the same password.
```

---

## License

Proprietary — Vylapp LLC, Indianapolis, Indiana. All rights reserved.

Contact: hello@vylapp.com | www.vylapp.com
