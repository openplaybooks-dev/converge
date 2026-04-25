# Device Test Plan — Baby Watch

Manual test matrix to be executed on real hardware before release. Run on **one Android phone (≥ Android 9)** and **one iOS phone (≥ iOS 14)** with the Alibaba Nordic tag.

Capture pass/fail for each row × platform in `device-test-results.md`. Annotate failures with reproduction steps and suspected root cause.

## Test matrix

| # | Scenario | Setup | Expected | Android Result | iOS Result | Notes |
|---|---|---|---|---|---|---|
| 1 | First-run permissions | Fresh install | Onboarding prompts for Bluetooth + Location + Notifications; all three "Granted" pills appear; tapping Done navigates to /home | | | |
| 2 | Beacon discovery | Tap Add Beacon, place tag within 1m | Discovered list shows the tag with strong RSSI bars within 5s | | | |
| 3 | Pair beacon | Tap "Lưu" with a name "Bé Na" | Beacon appears on Home as "An toàn" pill, persists across app restart | | | |
| 4 | Walk-away weak | Walk 5m away | Pill turns yellow "Tín hiệu yếu" within 10s | | | |
| 5 | Walk-away countdown | Stay 15m away for `timeoutInterval / 2` (default 60s) | Pill shows "Đếm ngược" with countdown timer | | | |
| 6 | Walk-away alert | Stay away until full timeout (default 2min) | Pill turns peach "Cảnh báo!", audio plays, phone vibrates, local notification fires | | | |
| 7 | Walk-back reconnect | Walk back to within 2m of tag | Pill returns to "An toàn", audio + notification cancel, History shows "Kết nối lại" event | | | |
| 8 | Background alert | Repeat row 6 with screen off | Notification still fires (Android via foreground service; iOS via region monitoring) | | | |
| 9 | Notification deep-link | Tap the notification from row 8 | App opens directly to /home in alert state (not Onboarding) | | | |
| 10 | Safe zone create | Stand still, tap Safe Zones FAB, name "Nhà", save | Zone created at current GPS, toggle is on, appears in list | | | |
| 11 | Safe zone suppression | Repeat row 6 while inside the safe zone | Pill stays at "An toàn", no audio, no notification, History shows "An toàn" event with zone name | | | |
| 12 | Safe zone toggle off | Toggle the zone off, repeat row 6 | Alert fires normally (suppression bypassed) | | | |
| 13 | Multiple beacons | Pair a second tag, walk away from one only | Home shows separate status per beacon; only the absent one alerts | | | |
| 14 | Settings persist | Change timeout to 5min, restart app | Setting still 5min | | | |
| 15 | History filter | Apply "Last 7 days" filter | List filters to the past 7 days; empty state if no events | | | |

## Per-platform notes

### Android
- Test device(s): _to be filled in_
- OS version: _to be filled in_
- Bluetooth chipset / OEM-specific notes (Samsung, Xiaomi, etc.) for DOZE-mode behavior: _to be filled in_

### iOS
- Test device(s): _to be filled in_
- OS version: _to be filled in_
- Region-monitoring "first event" gap reset procedure: toggle Bluetooth off/on between rows 8 and 9 (per §07 risks).

## Operational notes

- Reset between scenarios: clear paired beacons via Settings or fresh install when a row depends on a clean state.
- Battery drain: rows 4–12 back-to-back will burn 10–15% phone battery; plan a charging break.
- DOZE/throttling: foreground service may be throttled after 60+ minutes of inactivity; capture the OEM workaround in `background-monitoring.md`.
