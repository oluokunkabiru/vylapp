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

3. **Pointing at the backend** — `localhost:4000` in `.env` only works for the
   iOS Simulator (it shares the host's network stack). Everything else needs
   a different address, or requests will silently time out / connection-refuse:
   - **Android Emulator**: use `http://10.0.2.2:4000` — the emulator's
     special alias back to the host machine's `localhost`. Not your host's
     real IP; `10.0.2.2` is fixed regardless of your actual network.
   - **Physical device** (iOS or Android), same Wi-Fi as your dev machine:
     use your machine's LAN IP, e.g. `http://192.168.0.180:4000`. Find it
     with `hostname -I` (Linux) or `ipconfig getifaddr en0` (macOS). The
     `docker compose` backend already publishes port 4000 on the host, so
     nothing else needs to change on the backend side — just update `.env`:
     ```json
     { "VYLAPP_API_URL": "http://192.168.x.x:4000", "VYLAPP_SOCKET_URL": "http://192.168.x.x:4000" }
     ```

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
