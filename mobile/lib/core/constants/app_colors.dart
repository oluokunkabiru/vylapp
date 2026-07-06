import 'package:flutter/material.dart';

/// Vylapp brand color system.
/// Single source of truth — never hardcode hex values elsewhere.
/// All colours are defined once here and referenced by name.
abstract final class AppColors {
  // ── Primary palette ────────────────────────────────────────────────────────
  static const Color violet      = Color(0xFF7C3AED);
  static const Color violetLight = Color(0xFF8B5CF6);
  static const Color violetDim   = Color(0x207C3AED);   // 12% opacity
  static const Color violetBorder= Color(0x427C3AED);   // 26% opacity

  static const Color vibeGreen   = Color(0xFF10F5A0);
  static const Color vibeGreenDim= Color(0x1F10F5A0);

  static const Color coral       = Color(0xFFFF6B6B);
  static const Color coralDim    = Color(0x1FFF6B6B);

  static const Color amber       = Color(0xFFFFB830);
  static const Color amberDim    = Color(0x1FFFB830);

  static const Color sky         = Color(0xFF38BDF8);
  static const Color skyDim      = Color(0x1F38BDF8);

  static const Color purple      = Color(0xFFA78BFA);
  static const Color purpleDim   = Color(0x1FA78BFA);

  static const Color teal        = Color(0xFF2DD4BF);
  static const Color tealDim     = Color(0x1F2DD4BF);

  // ── Canvas ─────────────────────────────────────────────────────────────────
  static const Color bg          = Color(0xFF08070F);
  static const Color bg2         = Color(0xFF0D0C18);
  static const Color bg3         = Color(0xFF131124);
  static const Color bg4         = Color(0xFF1A1830);

  // ── Text ───────────────────────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFFF0EFFE);
  static const Color textSecondary = Color(0xFF8B89AC);
  static const Color textTertiary  = Color(0xFF4A4870);

  // ── Borders ────────────────────────────────────────────────────────────────
  static const Color border       = Color(0x2E7C3AED);   // 18%
  static const Color borderSubtle = Color(0x177C3AED);   // 9%

  // ── Semantic ───────────────────────────────────────────────────────────────
  static const Color success = Color(0xFF10F5A0);
  static const Color warning = Color(0xFFFFB830);
  static const Color danger  = Color(0xFFFF6B6B);
  static const Color info    = Color(0xFF38BDF8);

  // ── Category colours ───────────────────────────────────────────────────────
  static const Map<String, Color> categoryColor = {
    'TECH_VIBES':      sky,
    'GLOBAL_CONNECT':  vibeGreen,
    'CREATIVE_LEARN':  amber,
    'HUMAN_POTENTIAL': purple,
    'SPACES_INVITE':   coral,
    'GENERAL':         textSecondary,
  };

  // ── Gradient shortcuts (use LinearGradient in actual widgets) ─────────────
  static const List<Color> primaryGradient    = [violet, vibeGreen];
  static const List<Color> warmGradient       = [amber, coral];
  static const List<Color> storyRingGradient  = [amber, coral, violet, sky];

  static LinearGradient get primaryLinear => const LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: primaryGradient,
  );

  static LinearGradient categoryGradient(String cat) {
    const gradients = <String, List<Color>>{
      'TECH_VIBES':      [sky, violet],
      'GLOBAL_CONNECT':  [vibeGreen, teal],
      'CREATIVE_LEARN':  [amber, coral],
      'HUMAN_POTENTIAL': [purple, violet],
      'SPACES_INVITE':   [coral, amber],
    };
    final colors = gradients[cat] ?? [violet, teal];
    return LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: colors,
    );
  }
}
