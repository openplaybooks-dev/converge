# Background Monitoring

BabyGuard must keep watching the paired beacon while the app is not in the
foreground. iOS and Android take very different paths and the feature has
to be designed for both.

## Android — foreground service

We use `flutter_background_service` to host a long-lived foreground service
that runs `RealBleScanner` continuously. The service is declared in
`android/app/src/main/AndroidManifest.xml` with
`foregroundServiceType="connectedDevice|location"` so the OS allows BLE
scanning and the safe-zone GPS check while the app is backgrounded.

### Notification

The foreground service must show a non-dismissable notification:

- Title: `BabyGuard đang theo dõi`
- Body: `Bé Na · An toàn` (updates as the phase changes — `An toàn`,
  `Cảnh báo`, `Mất tín hiệu`).

The user cannot swipe this notification away without stopping monitoring.
That is an OS rule, not a product choice — surface this in onboarding so
parents are not surprised.

### Phase sync

When the background isolate detects a phase transition, it sends a
`{phase, timestamp}` message to the main isolate via
`IsolateNameServer.lookupPortByName('home_alert_phase_port')`.
The foreground `HomeAlertPhaseNotifier` listens on that port and calls
`forcePhase` so the UI matches the service's view of the world.

### OEM allow-list

Xiaomi (MIUI), Huawei (EMUI), Oppo (ColorOS), Vivo (FuntouchOS) and
Samsung (with battery optimisation enabled) aggressively kill foreground
services even when they hold a notification. During onboarding we point
the user at the per-OEM "auto-start" or "protected apps" screen:

- Xiaomi: Settings → Apps → Manage apps → BabyGuard → Autostart + No
  battery restrictions.
- Huawei: Settings → Apps → BabyGuard → Battery → App launch → Manual
  with all three switches enabled.
- Oppo / Vivo: Settings → Battery → High background power consumption →
  allow BabyGuard.
- Samsung: Settings → Apps → BabyGuard → Battery → Unrestricted.

### DOZE mode

On stock Android, DOZE will throttle BLE scans after a few minutes of
device idle. The foreground service avoids the worst of this, but we
still set `setBackgroundScanPeriod` to a duty cycle of roughly
`scan 1.1s / pause 0s` while monitoring and `scan 1.1s / pause 10s`
while the app is in the foreground (battery vs latency trade-off).

## iOS — region monitoring only

iOS does **not** allow a general BLE scan from the background. The only
supported path is `CLLocationManager` iBeacon region monitoring, which
`flutter_beacon` wraps. This requires:

- The iBeacon UUID baked in at compile time (from §03 fingerprinting).
- `bluetooth-central` and `location` declared in `UIBackgroundModes`
  (already done in §01).

When the OS detects `didEnterRegion` or `didExitRegion`, it wakes the app
for ~10 seconds. During that window the service updates the phase
notifier and fires a local notification if needed (alerting itself is
handled in §08).

### Hard limitations

- **iBeacon only.** If §03 fingerprinted the tag as Eddystone or `raw`,
  iOS background monitoring is impossible. We surface this in onboarding
  with the string: *"Trên iOS, nền tảng chỉ hỗ trợ iBeacon — beacon hiện
  tại sẽ chỉ giám sát khi mở app."*
- **No event for "already in range" at startup.** Region monitoring only
  fires on transitions. If the tag is already in range when the app
  launches, we get nothing until the user moves out and back in. The
  Home screen has a manual "Refresh" button to cover the first run.
- **Throttling.** iOS limits region monitoring to a few transitions per
  minute and may further throttle after sustained activity.
- **Wake budget.** Each wake is ~10 seconds. We must keep the wake-time
  work tight — phase update, persistence, optional notification, done.

### Background App Refresh

If the user has Background App Refresh disabled (system-wide or for
BabyGuard specifically), region monitoring still fires but local
notifications and any post-event work become unreliable. We check the
flag at startup and prompt the user.

## Battery considerations

- Foreground service notification: negligible.
- BLE scan duty cycle: dominant factor on Android. Tune
  `setBackgroundScanPeriod` per the values above.
- iOS region monitoring: handled by the OS; no measurable battery
  impact beyond the existing location services usage.
- GPS for safe-zone check: only sampled when phase is `Cảnh báo` or on
  region transitions, not continuously.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Service stops after the screen is off for ~5 min (Android) | OEM battery killer | Walk the user through the OEM allow-list above. |
| No alert when leaving the room (Android) | DOZE / location services off | Check `ACCESS_BACKGROUND_LOCATION` is granted; verify scan duty cycle. |
| No first-launch event (iOS) | Region monitoring needs a transition | Press "Refresh" on Home or move out and back into range. |
| iOS misses events after a few hours | OS throttling | Expected; events resume once the system relaxes throttling. |
| Eddystone / raw beacon, iOS user | iBeacon-only on iOS | Use an iBeacon-compatible tag, or accept foreground-only monitoring. |
