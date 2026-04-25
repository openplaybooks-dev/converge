import 'dart:async';
import 'dart:math';

import 'package:geolocator/geolocator.dart';

import '../models/safe_zone.dart';

class SafeZoneResult {
  final bool insideZone;
  final String? zoneId;
  const SafeZoneResult({required this.insideZone, this.zoneId});
}

class SafeZoneEvaluator {
  SafeZoneEvaluator(this._zonesProvider, this._geolocator);

  final List<SafeZone> Function() _zonesProvider;
  final Future<Position> Function() _geolocator;

  Future<SafeZoneResult> checkOnLostCountdown() async {
    final zones = _zonesProvider().where((z) => z.isActive).toList();
    if (zones.isEmpty) return const SafeZoneResult(insideZone: false);
    try {
      final pos = await _geolocator().timeout(const Duration(seconds: 5));
      for (final z in zones) {
        final meters = _haversineMeters(
          pos.latitude,
          pos.longitude,
          z.center.lat,
          z.center.lng,
        );
        if (meters <= z.radiusMeters) {
          return SafeZoneResult(insideZone: true, zoneId: z.id);
        }
      }
      return const SafeZoneResult(insideZone: false);
    } on TimeoutException {
      return const SafeZoneResult(insideZone: false);
    }
  }

  static double _haversineMeters(
    double lat1,
    double lng1,
    double lat2,
    double lng2,
  ) {
    const r = 6371000.0;
    final dLat = _rad(lat2 - lat1);
    final dLng = _rad(lng2 - lng1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_rad(lat1)) * cos(_rad(lat2)) * sin(dLng / 2) * sin(dLng / 2);
    return 2 * r * asin(sqrt(a));
  }

  static double _rad(double deg) => deg * pi / 180.0;
}
