# UX — BabyGuard

Reference-grounded UX. This document covers app shell, primary flows, state transitions, overlays, locale, and out-of-scope items. Per-screen layouts live in `.stitch/references/ANALYSIS.md`. Design tokens are produced in phase 02.

## App Shell

The app uses a 4-tab **bottom nav** (BottomNavBar) as observed in `.stitch/references/ANALYSIS.md` §Component Inventory.

| Tab | Route | Default Screen | Reference |
|-----|-------|----------------|-----------|
| Home | `/home` | Home Dashboard (unified state hub) | `.stitch/references/babyguard_home_phase_2_safe_updated/code.html` |
| Devices | `/devices` | Beacon Detail (or Add Beacon if none) | `.stitch/references/chi_ti_t_beacon_phase_2/code.html` |
| Security | `/security` | Safe Zones | `.stitch/references/safe_zones/code.html` |
| Settings | `/settings` | Settings | `.stitch/references/settings/code.html` |

The bottom nav is persistent across top-level routes; drill-down detail screens (Add Beacon, History, Co-guardians, Invite Accept) push over the active tab and show a back arrow in the TopAppBar.

## Primary Flows

### Flow 1 — First-run onboarding → Home

1. App launch with no prior session → onboarding (`.stitch/references/babyguard_onboarding_phase_2/code.html`).
2. User steps through permission cards (Bluetooth → Location → Notifications), each requesting the system dialog.
3. Onboarding completion routes to Home (`/home`) in `idle/safe` state.
4. Re-entry on subsequent launches skips onboarding.

### Flow 2 — Home state machine: safe → weak → lost_countdown → alert_active

The Home screen is a **single route** that swaps content by `Home.alertPhase`. State transitions and references:

- `idle` / `safe` → `.stitch/references/babyguard_home_phase_2_safe_updated/code.html` (mint pill, `verified_user`).
- `weak` → `.stitch/references/babyguard_home_phase_2_weak_signal/code.html` (honey pill, `signal_cellular_0_bar`).
- `lost_countdown` → still uses the safe/weak layout with peach accent pre-escalation; countdown begins when proximity drops below RSSI threshold for configured timeout.
- `alert_active` → `.stitch/references/babyguard_home_phase_2_alert/code.html` (peach pill, pulsing map marker, "Kiểm tra ngay" headline, primary CTA).

No separate "alert world" route; same card stack, different pill / icon / headline / CTA emphasis.

### Flow 3 — Alert delivery (push + in-app)

1. Background monitoring (Android foreground service / iOS region+ranging) detects timeout breach without aggregate suppression.
2. Push notification fires; deep-link payload targets `/home?phase=alert_active`.
3. Tapping the push opens Home directly in `alert_active`.
4. In-app, vibration + audio + haptics accompany the elevated state.

### Flow 4 — Add a beacon

1. From Devices tab (or empty Home prompt) → Add Beacon (`.stitch/references/th_m_beacon_phase_2/code.html`).
2. User starts scan (radar animation), picks a discovered device, names it, saves.
3. Saved beacon appears on Home's beacon strip and Devices tab.

### Flow 5 — Manage Safe Zones

1. Security tab opens Safe Zones (`.stitch/references/safe_zones/code.html`).
2. FAB "Thêm vùng an toàn" creates a zone from current GPS or manual address.
3. Per-zone toggle activates/deactivates; active zones suppress alerts at disconnect time.

### Flow 6 — Co-guardian invite & accept (Phase 2)

1. Owner opens Beacon Detail (`.stitch/references/chi_ti_t_beacon_phase_2/code.html`) → "Người cùng theo dõi" card → invite.
2. Invitee receives push → opens Invite Accept modal (`.stitch/references/co_guardians_list_phase_2/code.html`).
3. Accept creates a `beacon_guardians` row; reject closes the modal.
4. Co-guardians list (`.stitch/references/ch_p_nh_n_l_i_m_i/code.html`) reflects current membership.

### Flow 7 — Review history

1. From Home or Settings → History (`.stitch/references/history/code.html`).
2. Filter bar narrows by date; alert events tint peach, safe-suppressed events tint mint.

## State Transitions

The Home `alertPhase` machine, anchored to reference variants:

| From | Trigger | To | Reference |
|------|---------|-----|-----------|
| `idle/safe` | RSSI drops below weak threshold but above lost threshold | `weak` | `babyguard_home_phase_2_weak_signal` |
| `weak` | RSSI recovers above safe threshold | `idle/safe` | `babyguard_home_phase_2_safe_updated` |
| `weak` | Proximity stays below lost threshold; timeout countdown starts | `lost_countdown` | (uses alert layout pre-escalation) |
| `lost_countdown` | Countdown elapses AND `beacon_safe_aggregate = false` | `alert_active` | `babyguard_home_phase_2_alert` |
| `lost_countdown` | Re-acquired OR safe-zone match OR peer-guardian in proximity | `idle/safe` | `babyguard_home_phase_2_safe_updated` |
| `alert_active` | User dismisses / re-acquires beacon | `idle/safe` | `babyguard_home_phase_2_safe_updated` |

Onboarding triggers: cold start with no `onboarding_complete` flag. Push mute chips on Home temporarily silence push for 5/10/15 minutes (in-app state remains accurate).

## Overlays

Modal / dialog / bottom-sheet behaviour observed in references:

- **Invite Accept modal** — centered card, dim backdrop. Reference: `.stitch/references/co_guardians_list_phase_2/code.html`.
- **System permission dialogs** — triggered from each onboarding step in `.stitch/references/babyguard_onboarding_phase_2/code.html`.
- **Push mute chips** — in-place inline chip group on Home (not a separate sheet); see safe/weak/alert references.
- **Add Safe Zone entry** — invoked from FAB on `.stitch/references/safe_zones/code.html`; the reference shows the FAB but not a discrete modal layout, so the entry surface is treated as a push route, not an overlay.

## Locale

Primary locale: **Vietnamese (`vi`)**, derived directly from reference copy ("Tạm tắt thông báo push", "Người cùng theo dõi", "Thêm vùng an toàn", "Kiểm tra ngay"). English fallback is acceptable only for technical labels.

## Out-of-Scope (no reference anchor)

Items mentioned in `idea.md` that have no `.stitch/references/` anchor and are deferred or hand-coded later:

- Account / profile editing UI (referenced as a Phase 2 Settings section in `idea.md`, but no dedicated reference screen).
- Server-side admin / web dashboard.
- Cloud sync configuration UI beyond the existing Settings sections.
- Alert sound picker UI (Settings shows toggles only).
- Detailed map editing UI for safe-zone polygon creation (reference shows radius-based zones only).
- Crash / diagnostics screens.
