import 'package:flutter/material.dart';

/// Design tokens — mirrors the web frontend palette.
abstract class AppColors {
  // ── Primary green ────────────────────────────────────────────────────────────
  static const Color green       = Color(0xFF3A7D44);
  static const Color greenDark   = Color(0xFF2D6235);
  static const Color greenLight  = Color(0xFFF0F7F1);
  static const Color greenBg     = Color(0xFFDCFCE7);
  static const Color greenText   = Color(0xFF166534);
  static const Color greenBorder = Color(0xFF86EFAC);

  // ── Warm earth (farm aesthetic) ──────────────────────────────────────────────
  static const Color bg          = Color(0xFFF8F4EE);
  static const Color card        = Color(0xFFFFFFFF);
  static const Color border      = Color(0xFFE8D5C0);
  static const Color text        = Color(0xFF2C1810);
  static const Color muted       = Color(0xFF8B6B5A);
  static const Color midMuted    = Color(0xFF9CA3AF);

  // ── Semantic ─────────────────────────────────────────────────────────────────
  static const Color amber       = Color(0xFFD97706);
  static const Color amberBg     = Color(0xFFFFFBEB);
  static const Color amberLight  = Color(0xFFFEF3C7);
  static const Color red         = Color(0xFFDC2626);
  static const Color redBg       = Color(0xFFFEF2F2);
  static const Color rose        = Color(0xFFE11D48);
  static const Color roseBg      = Color(0xFFFFF1F2);
  static const Color blue        = Color(0xFF2563EB);
  static const Color blueBg      = Color(0xFFEFF6FF);

  // ── Notification type colours ────────────────────────────────────────────────
  static const Color notifGreen  = Color(0xFF16A34A);
  static const Color notifAmber  = Color(0xFFD97706);
  static const Color notifRed    = Color(0xFFDC2626);

  // ── Neutral shades ───────────────────────────────────────────────────────────
  static const Color grey50      = Color(0xFFF9FAFB);
  static const Color grey100     = Color(0xFFF3F4F6);
  static const Color grey200     = Color(0xFFE5E7EB);
  static const Color grey400     = Color(0xFF9CA3AF);
  static const Color grey600     = Color(0xFF4B5563);
  static const Color grey800     = Color(0xFF1F2937);
  static const Color white       = Color(0xFFFFFFFF);
  static const Color black       = Color(0xFF000000);
}
