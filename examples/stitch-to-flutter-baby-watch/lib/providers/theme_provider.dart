import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('SharedPreferences must be overridden in main.dart');
});

final themeNotifierProvider =
    StateNotifierProvider<ThemeNotifier, ThemeMode>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return ThemeNotifier(prefs);
});

class ThemeNotifier extends StateNotifier<ThemeMode> {
  static const _key = 'theme_mode';
  final SharedPreferences _prefs;

  ThemeNotifier(this._prefs) : super(_loadMode(_prefs));

  static ThemeMode _loadMode(SharedPreferences prefs) {
    final val = prefs.getString(_key);
    return ThemeMode.values.firstWhere(
      (e) => e.name == val,
      orElse: () => ThemeMode.dark,
    );
  }

  Future<void> setMode(ThemeMode mode) async {
    state = mode;
    await _prefs.setString(_key, mode.name);
  }

  void toggle() => setMode(state == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark);
}
