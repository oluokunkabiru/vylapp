import 'package:injectable/injectable.dart';
import '../constants/api_constants.dart';

/// Client-side input sanitisation and content pre-moderation.
///
/// Design principle: the server is the authoritative security boundary.
/// These client-side checks are a UX layer that catches obvious issues
/// before a network round-trip, NOT a replacement for server-side validation.
/// Never rely solely on client validation for security decisions.
@lazySingleton
class InputSanitiser {
  // ── Sanitise ──────────────────────────────────────────────────────────────
  /// Strip characters that have no place in user-generated social content.
  /// Does NOT HTML-encode — Flutter renders text as text, not as HTML,
  /// so XSS via text nodes is not a threat. The real vector is injection
  /// into API calls, which Dio's JSON serialisation prevents automatically.
  String sanitise(String input, {int? maxLength}) {
    String result = input
        .replaceAll(RegExp(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]'), '') // control chars
        .trim();

    if (maxLength != null && result.length > maxLength) {
      result = result.substring(0, maxLength);
    }
    return result;
  }

  String sanitiseVibe(String input) =>
    sanitise(input, maxLength: ApiConstants.maxVibeLength);

  String sanitiseComment(String input) =>
    sanitise(input, maxLength: ApiConstants.maxCommentLength);

  String sanitiseMessage(String input) =>
    sanitise(input, maxLength: ApiConstants.maxMessageLength);

  String sanitiseHandle(String input) {
    // Handles: lowercase alphanumeric, dots, underscores only
    return sanitise(input, maxLength: ApiConstants.maxHandleLength)
        .replaceAll(RegExp(r'[^a-zA-Z0-9._]'), '')
        .toLowerCase();
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  ValidationResult validateEmail(String email) {
    final trimmed = email.trim();
    if (trimmed.isEmpty) return ValidationResult.error('Email is required');
    if (trimmed.length > ApiConstants.maxEmailLength) {
      return ValidationResult.error('Email is too long');
    }
    final emailReg = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');
    if (!emailReg.hasMatch(trimmed)) {
      return ValidationResult.error('Enter a valid email address');
    }
    return ValidationResult.ok();
  }

  ValidationResult validatePassword(String pw) {
    if (pw.length < ApiConstants.minPasswordLength) {
      return ValidationResult.error(
        'Password must be at least ${ApiConstants.minPasswordLength} characters');
    }
    if (pw.length > ApiConstants.maxPasswordLength) {
      return ValidationResult.error('Password is too long');
    }
    return ValidationResult.ok();
  }

  ValidationResult validateHandle(String handle) {
    if (handle.isEmpty) return ValidationResult.error('Handle is required');
    if (handle.length < 3) return ValidationResult.error('Handle must be at least 3 characters');
    if (handle.length > ApiConstants.maxHandleLength) {
      return ValidationResult.error('Handle must be ${ApiConstants.maxHandleLength} characters or fewer');
    }
    if (!RegExp(r'^[a-zA-Z0-9._]+$').hasMatch(handle)) {
      return ValidationResult.error('Handle can only contain letters, numbers, dots, and underscores');
    }
    return ValidationResult.ok();
  }

  ValidationResult validateVibe(String content) {
    final trimmed = content.trim();
    if (trimmed.isEmpty) return ValidationResult.error('Vibe cannot be empty');
    if (trimmed.length > ApiConstants.maxVibeLength) {
      return ValidationResult.error(
        'Vibe is ${trimmed.length - ApiConstants.maxVibeLength} characters too long');
    }
    final modResult = _preModerate(trimmed);
    if (!modResult.isValid) return modResult;
    return ValidationResult.ok();
  }

  ValidationResult validateMessage(String content) {
    final trimmed = content.trim();
    if (trimmed.isEmpty) return ValidationResult.error('Message cannot be empty');
    if (trimmed.length > ApiConstants.maxMessageLength) {
      return ValidationResult.error('Message is too long');
    }
    return ValidationResult.ok();
  }

  // ── Pre-moderation (client-side, obvious patterns only) ───────────────────
  /// This is NOT a replacement for the server-side ModerationEngine.
  /// It catches the most obvious patterns to give instant UX feedback
  /// without requiring a server round-trip.
  ValidationResult _preModerate(String text) {
    final lower = text.toLowerCase();
    final obviousPatterns = [
      RegExp(r'\b(hate|kill|destroy|die)\s+(you|them|all|every)\b'),
      RegExp(r'\b(end\s+it|not\s+worth\s+living|want\s+to\s+die)\b'),
    ];
    for (final pattern in obviousPatterns) {
      if (pattern.hasMatch(lower)) {
        return ValidationResult.error(
          'This content was flagged by our safety system. '
          'If you think this is a mistake, contact support.');
      }
    }
    return ValidationResult.ok();
  }

  // ── Rate limiting (client-side, per feature) ──────────────────────────────
  final Map<String, DateTime> _lastCall = {};

  bool isRateLimited(String key, Duration limit) {
    final last = _lastCall[key];
    if (last == null) {
      _lastCall[key] = DateTime.now();
      return false;
    }
    if (DateTime.now().difference(last) < limit) return true;
    _lastCall[key] = DateTime.now();
    return false;
  }
}

class ValidationResult {
  final bool isValid;
  final String? message;

  const ValidationResult._({required this.isValid, this.message});

  factory ValidationResult.ok() =>
    const ValidationResult._(isValid: true);

  factory ValidationResult.error(String message) =>
    ValidationResult._(isValid: false, message: message);
}
