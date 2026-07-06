import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:injectable/injectable.dart';

/// All authentication tokens live exclusively in flutter_secure_storage.
/// On iOS this maps to Keychain. On Android it maps to the Android Keystore
/// with AES-256 encryption. Neither SharedPreferences nor hive/isar is used
/// for tokens — those are not encrypted at rest.
///
/// Security decisions:
/// - Tokens are keyed under non-obvious names to deter casual filesystem inspection.
/// - The refresh token is stored separately so it can be revoked independently.
/// - Payload is parsed locally to check expiry without a network call.
/// - We never log token values. Ever.
@lazySingleton
class TokenService {
  TokenService(this._storage);

  final FlutterSecureStorage _storage;

  // ── Storage keys — intentionally opaque ──────────────────────────────────
  static const _kAccess   = 'vyl_a';
  static const _kRefresh  = 'vyl_r';
  static const _kUserId   = 'vyl_uid';

  // ── Initialise secure storage with strong options ─────────────────────────
  static const AndroidOptions _androidOptions = AndroidOptions(
    encryptedSharedPreferences: true,
  );
  static const IOSOptions _iosOptions = IOSOptions(
    accessibility: KeychainAccessibility.first_unlock,
  );

  // ── Write ─────────────────────────────────────────────────────────────────
  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    required String userId,
  }) async {
    await Future.wait([
      _storage.write(key: _kAccess,  value: accessToken,  aOptions: _androidOptions, iOptions: _iosOptions),
      _storage.write(key: _kRefresh, value: refreshToken, aOptions: _androidOptions, iOptions: _iosOptions),
      _storage.write(key: _kUserId,  value: userId,       aOptions: _androidOptions, iOptions: _iosOptions),
    ]);
  }

  Future<void> saveAccessToken(String accessToken) async {
    await _storage.write(key: _kAccess, value: accessToken,
      aOptions: _androidOptions, iOptions: _iosOptions);
  }

  // ── Read ──────────────────────────────────────────────────────────────────
  Future<String?> getAccessToken()  async =>
    _storage.read(key: _kAccess,  aOptions: _androidOptions, iOptions: _iosOptions);

  Future<String?> getRefreshToken() async =>
    _storage.read(key: _kRefresh, aOptions: _androidOptions, iOptions: _iosOptions);

  Future<String?> getUserId() async =>
    _storage.read(key: _kUserId,  aOptions: _androidOptions, iOptions: _iosOptions);

  // ── Delete ────────────────────────────────────────────────────────────────
  Future<void> clearAll() async {
    await Future.wait([
      _storage.delete(key: _kAccess,  aOptions: _androidOptions, iOptions: _iosOptions),
      _storage.delete(key: _kRefresh, aOptions: _androidOptions, iOptions: _iosOptions),
      _storage.delete(key: _kUserId,  aOptions: _androidOptions, iOptions: _iosOptions),
    ]);
  }

  // ── Expiry check (no network call) ────────────────────────────────────────
  /// Returns true if the stored access token is still valid with at least
  /// [bufferSeconds] seconds remaining. Use this to proactively refresh
  /// before the token actually expires (avoids mid-request 401s).
  Future<bool> isAccessTokenValid({int bufferSeconds = 120}) async {
    final token = await getAccessToken();
    if (token == null) return false;
    try {
      final exp = _extractExpiry(token);
      if (exp == null) return false;
      final expiresAt = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
      return expiresAt.isAfter(DateTime.now().add(Duration(seconds: bufferSeconds)));
    } catch (_) {
      return false;
    }
  }

  Future<bool> hasValidSession() async {
    final token = await getAccessToken();
    if (token == null) return false;
    return isAccessTokenValid(bufferSeconds: 0);
  }

  // ── JWT payload extraction (client-side, no verification) ─────────────────
  /// IMPORTANT: This only decodes the payload for expiry checking.
  /// Cryptographic verification happens server-side. Never trust
  /// client-decoded JWT claims for authorisation decisions.
  int? _extractExpiry(String token) {
    final parts = token.split('.');
    if (parts.length != 3) return null;
    final payload = parts[1];
    // Pad Base64url to valid Base64
    final padded = payload.padRight(
      payload.length + (4 - payload.length % 4) % 4, '=',
    ).replaceAll('-', '+').replaceAll('_', '/');
    final decoded = jsonDecode(utf8.decode(base64.decode(padded)));
    return decoded['exp'] as int?;
  }
}
