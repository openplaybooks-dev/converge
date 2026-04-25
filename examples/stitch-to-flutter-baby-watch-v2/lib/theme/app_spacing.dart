import 'package:flutter/material.dart';

class AppRadius {
  AppRadius._();
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 32;
  static const double xl = 48;
  static const double full = 9999;
}

class AppSpacing {
  AppSpacing._();
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 24;
  static const double lg = 32;
  static const double xl = 40;
}

class AppShadows {
  AppShadows._();

  static const BoxShadow soft = BoxShadow(
    color: Color(0x66E7E3DC),
    offset: Offset(0, 8),
    blurRadius: 24,
  );
}
