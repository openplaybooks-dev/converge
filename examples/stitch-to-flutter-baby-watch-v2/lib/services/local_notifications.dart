import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

abstract class LocalNotifications {
  Future<void> initialize();
  Future<void> fire({required String beaconName});
  Future<void> cancel();
}

class LocalNotificationsImpl implements LocalNotifications {
  LocalNotificationsImpl({FlutterLocalNotificationsPlugin? plugin})
      : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  static const _channelId = 'babyguard_alerts';
  static const _notificationId = 1;

  final FlutterLocalNotificationsPlugin _plugin;

  @override
  Future<void> initialize() async {
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    await _plugin.initialize(
      settings: const InitializationSettings(android: androidInit, iOS: iosInit),
      onDidReceiveNotificationResponse: _onTap,
    );
  }

  @override
  Future<void> fire({required String beaconName}) async {
    const androidDetails = AndroidNotificationDetails(
      _channelId,
      'BabyGuard Alerts',
      importance: Importance.max,
      priority: Priority.high,
      fullScreenIntent: true,
      playSound: true,
    );
    await _plugin.show(
      id: _notificationId,
      title: 'Cảnh báo: Mất tín hiệu Bé Na',
      body: 'Beacon $beaconName ngoài phạm vi',
      notificationDetails: const NotificationDetails(
        android: androidDetails,
        iOS: DarwinNotificationDetails(),
      ),
      payload: '/home?phase=alertActive',
    );
  }

  @override
  Future<void> cancel() => _plugin.cancel(id: _notificationId);

  static void _onTap(NotificationResponse r) {
    // Navigation handled by the app router via a global key (see §05).
  }
}

final localNotificationsProvider =
    Provider<LocalNotifications>((ref) => LocalNotificationsImpl());
