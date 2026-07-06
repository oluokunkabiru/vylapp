import 'package:flutter/material.dart';
import 'app_colors.dart';

abstract final class AppTextStyles {
  // ── Display ────────────────────────────────────────────────────────────────
  static const TextStyle displayLg = TextStyle(
    fontFamily: 'Sora', fontSize: 32, fontWeight: FontWeight.w800,
    color: AppColors.textPrimary, letterSpacing: -0.5, height: 1.1,
  );
  static const TextStyle displayMd = TextStyle(
    fontFamily: 'Sora', fontSize: 24, fontWeight: FontWeight.w800,
    color: AppColors.textPrimary, letterSpacing: -0.3, height: 1.2,
  );

  // ── Headings ───────────────────────────────────────────────────────────────
  static const TextStyle h1 = TextStyle(
    fontFamily: 'Sora', fontSize: 22, fontWeight: FontWeight.w800,
    color: AppColors.textPrimary, letterSpacing: -0.2,
  );
  static const TextStyle h2 = TextStyle(
    fontFamily: 'Sora', fontSize: 18, fontWeight: FontWeight.w800,
    color: AppColors.textPrimary,
  );
  static const TextStyle h3 = TextStyle(
    fontFamily: 'Sora', fontSize: 16, fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );

  // ── Body ───────────────────────────────────────────────────────────────────
  static const TextStyle bodyLg = TextStyle(
    fontFamily: 'Sora', fontSize: 16, fontWeight: FontWeight.w400,
    color: AppColors.textPrimary, height: 1.6,
  );
  static const TextStyle bodyMd = TextStyle(
    fontFamily: 'Sora', fontSize: 14, fontWeight: FontWeight.w400,
    color: AppColors.textPrimary, height: 1.55,
  );
  static const TextStyle bodySm = TextStyle(
    fontFamily: 'Sora', fontSize: 13, fontWeight: FontWeight.w400,
    color: AppColors.textSecondary, height: 1.5,
  );

  // ── Labels ─────────────────────────────────────────────────────────────────
  static const TextStyle labelLg = TextStyle(
    fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );
  static const TextStyle labelMd = TextStyle(
    fontFamily: 'Sora', fontSize: 13, fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );
  static const TextStyle labelSm = TextStyle(
    fontFamily: 'Sora', fontSize: 11, fontWeight: FontWeight.w700,
    color: AppColors.textSecondary, letterSpacing: 0.5,
  );
  static const TextStyle labelXs = TextStyle(
    fontFamily: 'Sora', fontSize: 10, fontWeight: FontWeight.w800,
    color: AppColors.textSecondary, letterSpacing: 0.8,
  );

  // ── Caption ────────────────────────────────────────────────────────────────
  static const TextStyle caption = TextStyle(
    fontFamily: 'Sora', fontSize: 12, fontWeight: FontWeight.w400,
    color: AppColors.textTertiary,
  );

  // ── Mono (handles, metrics, code) ─────────────────────────────────────────
  static const TextStyle monoLg = TextStyle(
    fontFamily: 'SpaceMono', fontSize: 14, fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
  );
  static const TextStyle monoMd = TextStyle(
    fontFamily: 'SpaceMono', fontSize: 12, fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
  );
  static const TextStyle monoSm = TextStyle(
    fontFamily: 'SpaceMono', fontSize: 11, fontWeight: FontWeight.w400,
    color: AppColors.textTertiary,
  );
  static const TextStyle monoMetric = TextStyle(
    fontFamily: 'SpaceMono', fontSize: 24, fontWeight: FontWeight.w700,
    color: AppColors.textPrimary, letterSpacing: -0.5,
  );
}
