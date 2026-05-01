import 'package:flutter/material.dart';
import 'app_colors.dart';

class AppTheme {
  AppTheme._();

  static ThemeData get light => ThemeData(
    useMaterial3: true,
    fontFamily: 'Cairo',

    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.green,
      primary:   AppColors.green,
      onPrimary: AppColors.white,
      secondary: AppColors.amber,
      surface:   AppColors.card,
      onSurface: AppColors.text,
      error:     AppColors.red,
    ),

    scaffoldBackgroundColor: AppColors.bg,

    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.green,
      foregroundColor: AppColors.white,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: 'Cairo',
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: AppColors.white,
      ),
    ),

    cardTheme: CardThemeData(
      color: AppColors.card,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.border),
      ),
      margin: EdgeInsets.zero,
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.green,
        foregroundColor: AppColors.white,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(
          fontFamily: 'Cairo',
          fontSize: 15,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.green,
        minimumSize: const Size(double.infinity, 52),
        side: const BorderSide(color: AppColors.green),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(
          fontFamily: 'Cairo',
          fontSize: 15,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.card,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.green, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.red),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.red, width: 2),
      ),
      hintStyle: const TextStyle(color: AppColors.midMuted, fontSize: 14),
      labelStyle: const TextStyle(color: AppColors.muted, fontSize: 14),
    ),

    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: AppColors.card,
      selectedItemColor: AppColors.green,
      unselectedItemColor: AppColors.midMuted,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
      selectedLabelStyle: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.w700),
      unselectedLabelStyle: TextStyle(fontFamily: 'Cairo', fontSize: 11),
    ),

    chipTheme: ChipThemeData(
      backgroundColor: AppColors.greenLight,
      selectedColor: AppColors.green,
      labelStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 12),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),

    dividerTheme: const DividerThemeData(
      color: AppColors.border,
      thickness: 1,
      space: 1,
    ),

    textTheme: const TextTheme(
      displayLarge:  TextStyle(fontFamily: 'Cairo', fontSize: 32, fontWeight: FontWeight.w800, color: AppColors.text),
      displayMedium: TextStyle(fontFamily: 'Cairo', fontSize: 26, fontWeight: FontWeight.w800, color: AppColors.text),
      displaySmall:  TextStyle(fontFamily: 'Cairo', fontSize: 22, fontWeight: FontWeight.w700, color: AppColors.text),
      headlineMedium:TextStyle(fontFamily: 'Cairo', fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.text),
      headlineSmall: TextStyle(fontFamily: 'Cairo', fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.text),
      titleLarge:    TextStyle(fontFamily: 'Cairo', fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.text),
      titleMedium:   TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.text),
      titleSmall:    TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.text),
      bodyLarge:     TextStyle(fontFamily: 'Cairo', fontSize: 15, fontWeight: FontWeight.w400, color: AppColors.text),
      bodyMedium:    TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w400, color: AppColors.text),
      bodySmall:     TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.muted),
      labelLarge:    TextStyle(fontFamily: 'Cairo', fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.text),
      labelMedium:   TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.text),
      labelSmall:    TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.muted),
    ),
  );
}
