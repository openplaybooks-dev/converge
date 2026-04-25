# Beacon Fingerprint

This document records the advertising format of the physical BLE tag(s) paired
with BabyGuard. It is the source of truth for `lib/config/beacon_signature.dart`
and drives the OS-level scan filters in §04 and the iOS background path in §07.

> **Status:** placeholder values below. A human must run
> `flutter run -t tool/scan_dump.dart` against the real Alibaba Nordic IoT Tag
> and replace the rows in the *Captured signatures* table with the observed
> bytes.

## Tag inventory

| Physical tag | Model                  | Date captured | Format  | UUID / namespace                       | Major | Minor |
| ------------ | ---------------------- | ------------- | ------- | -------------------------------------- | ----- | ----- |
| #1           | Alibaba Nordic IoT Tag | _TBD_         | iBeacon | fda50693-a4e2-4fb1-afcf-c6eb07647825   | 1     | 1     |

## Captured advertisement (raw)

Paste the strongest stable advertiser from `tool/scan_dump.dart` here, e.g.:

```
id=AA:BB:CC:DD:EE:FF rssi=-52
name=(none)
serviceUuids=[]
manufacturerData={76: [2, 21, 0xfd, 0xa5, ..., 0x25, 0x00, 0x01, 0x00, 0x01, 0xc5]}
serviceData={}
```

## Decoded fields

- **Format:** iBeacon (`manufacturerData[0x004C]` starts with `02 15`).
- **UUID:** `fda50693-a4e2-4fb1-afcf-c6eb07647825`
- **Major:** `1`
- **Minor:** `1`
- **Tx power (1 m):** _TBD_ dBm

If the tag turns out to be Eddystone instead, record `serviceData[FEAA]` frame
type, namespace (10 bytes), and instance (6 bytes) here. If it is a vendor /
raw frame, record the company-id and the byte pattern in `vendorAdData`.

## Scanner library mapping

| Format    | Foreground scanner | iOS background path                |
| --------- | ------------------ | ---------------------------------- |
| iBeacon   | `flutter_beacon`   | CoreLocation iBeacon ranging — OK  |
| Eddystone | `flutter_blue_plus`| Foreground only on iOS             |
| Raw       | `flutter_blue_plus`| Foreground only on iOS             |

## Notes & risks

- If multiple identical tags are present, `(major, minor)` distinguishes them —
  record which physical tag corresponds to which pair above.
- Some Nordic dev kits ship in a "configurable" mode that requires a vendor app
  to enable iBeacon advertising. If `scan_dump` shows no iBeacon frames, check
  the tag's manual for an "iBeacon mode" toggle.
- Eddystone-only tags **cannot** be tracked in iOS background — §07 must plan
  for foreground-only iOS in that case.
