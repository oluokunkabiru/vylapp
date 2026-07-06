# Vylapp Mobile

Flutter 3.22 (Dart 3.3) — iOS + Android.

## Environment setup

All configuration is in `.env` (development) and `.env.production` (release).
These are JSON files consumed by Flutter's native `--dart-define-from-file` flag.
No extra packages required — values are baked at compile time.

```bash
# Development (simulator or physical device)
flutter pub get
flutter run --dart-define-from-file=.env

# Android release
flutter build apk --dart-define-from-file=.env.production \
  --obfuscate --split-debug-info=build/symbols

# iOS release
flutter build ios --dart-define-from-file=.env.production \
  --obfuscate --split-debug-info=build/symbols
```

## Required before building

1. **Firebase config** (from Firebase console → Project Settings → Your apps):
   - `android/app/google-services.json`
   - `ios/Runner/GoogleService-Info.plist`

2. **Certificate pinning** — fill in `.env.production`:
   ```
   VYLAPP_CERTIFICATE_PIN_PRIMARY=<your SHA-256 fingerprint>
   VYLAPP_CERTIFICATE_PIN_BACKUP=<your backup fingerprint>
   ```
   Extract: `openssl s_client -connect api.vylapp.com:443 | openssl x509 -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256 -binary | openssl enc -base64`

3. **Physical device** — update `.env`:
   ```json
   { "VYLAPP_API_URL": "http://192.168.x.x:4000" }
   ```
   Replace with your machine's local IP.

## Hardware channels

- Dart contract:     `lib/core/hardware/hardware_bridge.dart`
- Android (Kotlin):  `android/app/src/main/kotlin/com/vylapp/app/MainActivity.kt`
- iOS (Swift):       `ios/Runner/AppDelegate.swift`

BLE, NFC, and USB are available on Android. BLE and NFC on iOS. USB not supported on iOS.

## Environment variables reference

| Key | Description | Default |
|-----|-------------|---------|
| `VYLAPP_API_URL` | Backend base URL | `http://localhost:4000` |
| `VYLAPP_SOCKET_URL` | Socket.IO URL | `http://localhost:4000` |
| `VYLAPP_ENV` | `development` or `production` | `development` |
| `VYLAPP_LIVEKIT_URL` | LiveKit server URL | `` |
| `VYLAPP_CERTIFICATE_PIN_PRIMARY` | TLS cert SHA-256 | `` |
| `VYLAPP_CERTIFICATE_PIN_BACKUP` | Backup cert SHA-256 | `` |
| `VYLAPP_FEATURE_*` | Feature toggles | `true` |

See root `.env.example` for full documentation.
