---
id: 08-alerting
title: Alerting — In-App Audio + Haptic + Local Notification
description: When HomeAlertPhase transitions to alertActive, play a looped tone via just_audio, trigger an SOS vibration pattern, fire HapticFeedback, and post a local notification via flutter_local_notifications. Notification tap deep-links to /home?phase=alertActive.
blocking: true
dependencies:
  - 05-home-state-machine
tags:
  - alerts
  - audio
  - haptic
  - notifications
inputs:
  - lib/providers/home_alert_phase_provider.dart
  - lib/router/app_router.dart
  - pubspec.yaml
outputs:
  - lib/services/alert_player.dart
  - lib/services/local_notifications.dart
  - assets/sounds/alert.mp3
  - pubspec.yaml
  - test/services/alerting_test.dart
checks:
  - id: alert-player-exists
    cmd: test -f lib/services/alert_player.dart
    description: Alert player module exists
  - id: notifications-exists
    cmd: test -f lib/services/local_notifications.dart
    description: Local notifications module exists
  - id: alert-asset-exists
    cmd: test -f assets/sounds/alert.mp3
    description: Alert audio asset exists
  - id: asset-declared
    cmd: "grep -q 'assets/sounds/' pubspec.yaml"
    description: Audio asset declared in pubspec.yaml
  - id: alerting-tests-pass
    cmd: flutter test test/services/alerting_test.dart
    description: Alerting unit tests pass (mocked players)
---

# Alerting — Audio + Haptic + Notification

Driven by phase transitions from `HomeAlertPhaseNotifier`. Two services, both invoked on entry to `alertActive`:

1. `AlertPlayer` — plays audio + vibration + haptic feedback
2. `LocalNotifications` — fires a high-importance local notification

Both are stopped/cancelled on exit from `alertActive`.

## Sub-steps

### 1. `lib/services/alert_player.dart`

```dart
class AlertPlayer {
  final AudioPlayer _audio = AudioPlayer();
  bool _running = false;

  Future<void> start() async {
    if (_running) return;
    _running = true;
    await _audio.setAsset('assets/sounds/alert.mp3');
    await _audio.setLoopMode(LoopMode.one);
    await _audio.play();
    HapticFeedback.heavyImpact();
    if (await Vibration.hasVibrator() ?? false) {
      Vibration.vibrate(pattern: [0, 500, 200, 500, 200, 500], repeat: 0);
    }
  }

  Future<void> stop() async {
    _running = false;
    await _audio.stop();
    Vibration.cancel();
  }
}
```

### 2. `lib/services/local_notifications.dart`

```dart
class LocalNotifications {
  static const _channelId = 'babyguard_alerts';

  Future<void> initialize() async {
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings();
    await FlutterLocalNotificationsPlugin().initialize(
      const InitializationSettings(android: androidInit, iOS: iosInit),
      onDidReceiveNotificationResponse: _onTap,
    );
  }

  Future<void> fire({required String beaconName}) async {
    const androidDetails = AndroidNotificationDetails(
      _channelId,
      'BabyGuard Alerts',
      importance: Importance.max,
      priority: Priority.high,
      fullScreenIntent: true,
      playSound: true,
    );
    await FlutterLocalNotificationsPlugin().show(
      1,
      'Cảnh báo: Mất tín hiệu Bé Na',
      'Beacon $beaconName ngoài phạm vi',
      const NotificationDetails(android: androidDetails, iOS: DarwinNotificationDetails()),
      payload: '/home?phase=alertActive',
    );
  }

  Future<void> cancel() => FlutterLocalNotificationsPlugin().cancel(1);

  static void _onTap(NotificationResponse r) {
    if (r.payload != null) {
      // Use a global router key (added in §05) to navigate.
      AppRouter.instance.go(r.payload!);
    }
  }
}
```

### 3. Asset

`assets/sounds/alert.mp3` — short looping alert tone (≤5s). Add to `pubspec.yaml`:

```yaml
flutter:
  uses-material-design: true
  assets:
    - assets/sounds/alert.mp3
```

If no asset is supplied yet, ship a placeholder silent MP3 and document that the user should replace it.

### 4. Wire into the notifier

In `HomeAlertPhaseNotifier`:

```dart
void _onPhaseChanged(HomeAlertPhase next) {
  if (next == HomeAlertPhase.alertActive) {
    ref.read(alertPlayerProvider).start();
    ref.read(localNotificationsProvider).fire(beaconName: _activeBeacon.name);
  } else if (state == HomeAlertPhase.alertActive) {
    ref.read(alertPlayerProvider).stop();
    ref.read(localNotificationsProvider).cancel();
  }
}
```

Both `alertPlayerProvider` and `localNotificationsProvider` are simple `Provider<T>` factories declared next to the services.

### 5. Tests

`test/services/alerting_test.dart` — mock `AudioPlayer` and `FlutterLocalNotificationsPlugin`; assert that the notifier transitioning into `alertActive` calls `start()` + `fire()`, and transitioning out calls `stop()` + `cancel()`. Use `mocktail` (already a dev dep).

## Risks

- iOS notifications need user permission via `permission_handler` `Permission.notification.request()` — already requested in onboarding (§06).
- `fullScreenIntent: true` on Android requires the `USE_FULL_SCREEN_INTENT` permission on Android 14+; add to manifest if needed.
- Audio playback in the foreground service (Android background) requires `AudioServiceBinder` setup — `just_audio_background` may be needed for fully backgrounded playback. For the prototype, foreground audio is enough; document the gap.
