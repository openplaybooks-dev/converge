# BabyGuard — Navigation Map

## Bottom Navigation (ShellRoute)
- Home (/) — Primary dashboard with beacon monitoring status [tab: home icon]
- Safe Zones (/safe-zones) — Manage safe zone locations [tab: location icon]
- Settings (/settings) — Alert behavior and app preferences [tab: settings icon]

## Push Routes (detail screens)
- Beacon Scanner (/scan) <- tap Scan from Home
- Beacon Detail (/beacon/:id) <- tap beacon strip/card from Home
- Beacon Edit (/beacon/:id/edit) <- tap Edit from Beacon Detail overflow menu
- Add Safe Zone (/safe-zones/add) <- tap Add from Safe Zones list
- Edit Safe Zone (/safe-zones/:id/edit) <- tap zone card from Safe Zones list
- History (/history) <- tap from Home or Settings
- Co-Guardians List (/guardians) <- tap from Home or Settings
- Onboarding (/onboarding) <- first launch
- Invite Accept (/invite/:code) <- deep link from invitation

## Modal Overlays (bottom sheets & dialogs)
- Alert Screen (overlay:alert) — Full screen emergency modal, no nav chrome
- Pairing Confirmation (overlay:pairing) — Confirm beacon pairing
- Timeout Picker (overlay:timeout-picker) — Select alert timeout duration
- Filter Date Range (overlay:filter-date) — History date range filter
- Event Detail (overlay:event-detail) — Single history event details
- Test Alert Countdown (overlay:test-alert) — Long-press status orb
- Confirmation Dialogs (overlay:confirm) — Forget beacon, delete zone, remove guardian