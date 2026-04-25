# SITE — BabyGuard Sitemap

Human-readable sitemap derived from `.stitch/references/ANALYSIS.md` and `PRD.md`.

## Route Table

| Route | Screen ID | Purpose | Reference |
|-------|-----------|---------|-----------|
| `/onboarding` | onboarding | First-run permission flow (BLE / Location / Notifications) | `.stitch/references/babyguard_onboarding_phase_2/code.html` |
| `/home` | home | Unified dashboard; renders safe/weak/lost_countdown/alert_active by phase | `.stitch/references/babyguard_home_phase_2_safe_updated/code.html` |
| `/home?phase=weak` | home (weak) | Home in weak-signal state | `.stitch/references/babyguard_home_phase_2_weak_signal/code.html` |
| `/home?phase=alert_active` | home (alert) | Home in alert-active state (deep-link target) | `.stitch/references/babyguard_home_phase_2_alert/code.html` |
| `/devices` | beacon-detail | Beacon info + co-guardian rollup | `.stitch/references/chi_ti_t_beacon_phase_2/code.html` |
| `/devices/add` | add-beacon | BLE scan, name, save | `.stitch/references/th_m_beacon_phase_2/code.html` |
| `/devices/co-guardians` | co-guardians-list | Manage guardians for the active beacon | `.stitch/references/ch_p_nh_n_l_i_m_i/code.html` |
| `/invites/accept` | invite-accept | Modal route to accept/reject a beacon invite | `.stitch/references/co_guardians_list_phase_2/code.html` |
| `/security` | safe-zones | Map + list of safe zones; FAB to add | `.stitch/references/safe_zones/code.html` |
| `/history` | history | Alert/safe event log with filter bar | `.stitch/references/history/code.html` |
| `/settings` | settings | Alert / Beacon / Notifications config (Phase 2: Account) | `.stitch/references/settings/code.html` |

## Nav Tree

```
root
├── /onboarding (first-run only)
└── (bottom nav)
    ├── Home → /home
    │   ├── phase: idle/safe
    │   ├── phase: weak
    │   ├── phase: lost_countdown
    │   └── phase: alert_active
    ├── Devices → /devices
    │   ├── /devices/add
    │   └── /devices/co-guardians
    │       └── /invites/accept (modal)
    ├── Security → /security
    └── Settings → /settings
        └── /history (entry from Settings or Home)
```

## Deep Links

Domain-relevant deep links:

| Deep link | Target route | Origin |
|-----------|--------------|--------|
| `babyguard://home?phase=alert_active` | `/home?phase=alert_active` | Push notification on alert escalation |
| `babyguard://home` | `/home` | Generic launch / push tap |
| `babyguard://invites/accept?token=…` | `/invites/accept` | Co-guardian invite push (Phase 2) |
| `babyguard://devices/{beaconId}` | `/devices` | Beacon-specific push (e.g. "back home" event) |
