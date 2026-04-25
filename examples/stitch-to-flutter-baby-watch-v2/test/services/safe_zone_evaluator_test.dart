import 'package:baby_watch/models/enums.dart';
import 'package:baby_watch/models/lat_lng.dart';
import 'package:baby_watch/models/safe_zone.dart';
import 'package:baby_watch/services/safe_zone_evaluator.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';

Position _pos(double lat, double lng) => Position(
      latitude: lat,
      longitude: lng,
      timestamp: DateTime.fromMillisecondsSinceEpoch(0),
      accuracy: 1,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );

SafeZone _zone({
  String id = 'z1',
  double lat = 10.0,
  double lng = 106.0,
  double radiusMeters = 100,
  bool isActive = true,
}) =>
    SafeZone(
      id: id,
      name: 'Home',
      iconKey: SafeZoneIcon.home,
      address: '',
      center: LatLng(lat: lat, lng: lng),
      radiusMeters: radiusMeters,
      radiusLabel: '${radiusMeters.toInt()}m',
      isActive: isActive,
    );

void main() {
  test('returns insideZone=true when within radius', () async {
    final evaluator = SafeZoneEvaluator(
      () => [_zone()],
      () async => _pos(10.0001, 106.0001),
    );
    final result = await evaluator.checkOnLostCountdown();
    expect(result.insideZone, isTrue);
    expect(result.zoneId, 'z1');
  });

  test('returns insideZone=false when outside all zones', () async {
    final evaluator = SafeZoneEvaluator(
      () => [_zone()],
      () async => _pos(10.01, 106.01),
    );
    final result = await evaluator.checkOnLostCountdown();
    expect(result.insideZone, isFalse);
    expect(result.zoneId, isNull);
  });

  test('returns insideZone=false when no active zones', () async {
    final evaluator = SafeZoneEvaluator(
      () => [_zone(isActive: false)],
      () async => _pos(10.0, 106.0),
    );
    final result = await evaluator.checkOnLostCountdown();
    expect(result.insideZone, isFalse);
  });

  test('returns insideZone=false when geolocator times out', () async {
    final evaluator = SafeZoneEvaluator(
      () => [_zone()],
      () => Future.delayed(const Duration(seconds: 30), () => _pos(10.0, 106.0)),
    );
    final result = await evaluator.checkOnLostCountdown();
    expect(result.insideZone, isFalse);
  }, timeout: const Timeout(Duration(seconds: 10)));
}
