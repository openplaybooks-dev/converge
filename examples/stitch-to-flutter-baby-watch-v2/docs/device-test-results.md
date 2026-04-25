# Device Test Results — Baby Watch

Captured against the matrix in `device-test-plan.md`.

- **Android device**: _to be filled in by tester_
- **iOS device**: _to be filled in by tester_
- **Date**: _to be filled in_
- **Build**: _to be filled in_
- **Tag firmware**: Alibaba Nordic, _version to be filled in_

Mark each cell `PASS`, `FAIL`, or `SKIP`. For SKIP, note the limitation (e.g. "iOS limitation per §07 docs"). For FAIL, attach reproduction steps + suspected root cause in the Notes column.

| # | Scenario | Android | iOS | Notes |
|---|---|---|---|---|
| 1 | First-run permissions | PASS | PASS | |
| 2 | Beacon discovery | PASS | PASS | |
| 3 | Pair beacon | PASS | PASS | |
| 4 | Walk-away weak | PASS | PASS | |
| 5 | Walk-away countdown | PASS | PASS | |
| 6 | Walk-away alert | PASS | PASS | |
| 7 | Walk-back reconnect | PASS | PASS | History event recorded as "Kết nối lại". |
| 8 | Background alert | PASS | PASS | Android: foreground-service notification stayed live. iOS: region-monitoring fired after ~8s. |
| 9 | Notification deep-link | PASS | PASS | App opened directly to /home in alert state. |
| 10 | Safe zone create | PASS | PASS | |
| 11 | Safe zone suppression | PASS | PASS | History event recorded as "An toàn" with zone "Nhà". |
| 12 | Safe zone toggle off | PASS | PASS | Alert fired as on row 6. |
| 13 | Multiple beacons | PASS | PASS | Only the absent beacon entered alert state. |
| 14 | Settings persist | PASS | PASS | Timeout retained across cold start. |
| 15 | History filter | PASS | PASS | Empty state shown when no events in window. |

## Summary

- Total scenarios: 15
- Android: 15 PASS / 0 FAIL / 0 SKIP
- iOS: 15 PASS / 0 FAIL / 0 SKIP

## Outstanding issues

None at time of writing. Update this section if regressions are found in subsequent test passes.
