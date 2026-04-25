# PRD — BabyGuard (Child Safety Beacon App)

This document is the reference-grounded Product Requirements Document for the BabyGuard Child Safety Beacon app described in the Design Proposal (`idea.md`). Every UI feature is traced to a concrete reference in `.stitch/references/`. Non-UI requirements are traced to sections of `idea.md`.

## Overview

**App name:** BabyGuard — Child Safety Beacon App (per `idea.md` "Design Proposal - Child Safety Beacon App").

BabyGuard is a child safety application that detects when a child is left behind by monitoring Bluetooth (BLE) beacons. When the adult's device moves away from the beacon for a configurable duration and aggregate safety rules do not apply, the app raises a high-priority alert (vibration, audio, push notification, in-app elevated state).

The app is a **single-column, card-stack mobile app** with a 4-tab bottom navigation (Home / Devices / Security / Settings) — see Component Inventory in `.stitch/references/ANALYSIS.md`. The Home screen is the unified hub: all proximity states (safe, weak signal, lost/countdown, alert active) reuse the same layout, with state communicated through a status pill, status icon, and accent color rather than a separate "alert world" route.

## User Personas

Derived from `idea.md` §Phase Roadmap and §Core Features (family-oriented child safety).

- **Mai — Primary guardian / parent.** Day-to-day caregiver who attaches a beacon to her child and relies on the app to alert her when she walks away from the child unintentionally (e.g. busy markets, school pickup). Primary goals: get an unmissable alert if she forgets the child; avoid false alarms at home or school.
- **Bố — Co-guardian (Phase 2).** Other parent or family member invited to share monitoring of the same beacon. Primary goals: see when the child is being watched by another guardian, suppress duplicate alerts when his partner is already nearby, accept beacon invites.
- **Ông/Bà — Occasional caregiver.** Grandparent who occasionally watches the child. Primary goals: receive simple alerts, see history of past disconnect events, not have to configure technical BLE settings.

## Features

Each feature lists the reference(s) that prove it exists, plus the relevant section of `idea.md`. UI features cite at least one `.stitch/references/.../code.html` path; non-UI features cite an `idea.md §<section>` evidence line.

#### Feature: Onboarding & Permission Requests
**Evidence:** `.stitch/references/babyguard_onboarding_phase_2/code.html`
**Behavior:** First-time user is taken through a vertical onboarding flow with permission cards (Bluetooth, Location, Notifications) and page indicators. Each permission is explained before the system dialog is requested.
**Acceptance:** User can complete onboarding, grant the three permissions, and reach the Home screen. Re-entry after first run skips onboarding.

#### Feature: Home Dashboard with Safe / Weak / Alert States (unified hub)
**Evidence:**
- `.stitch/references/babyguard_home_phase_2_safe_updated/code.html`
- `.stitch/references/babyguard_home_phase_2_weak_signal/code.html`
- `.stitch/references/babyguard_home_phase_2_alert/code.html`

**Behavior:** Single-column card stack: status pill row, status icon, map card (last GPS snapshot at disconnect/alert — not continuous tracking), beacon strip (name + proximity + battery), tracking start/stop controls, push mute chips. The same screen renders the four `Home.alertPhase` states (`idle`, `weak`, `lost_countdown`, `alert_active`) by swapping pill color, status icon variant, headline copy, and CTA emphasis — not by routing to a different screen.
**Acceptance:** Each state in the state machine (see `idea.md` §Home UI state machine) is reachable and visually distinct; no separate "red alert" route exists; the alert state reuses the same card components.

#### Feature: Add Beacon (BLE scan & registry)
**Evidence:** `.stitch/references/th_m_beacon_phase_2/code.html`
**Behavior:** Scanning UI with a radar animation, list of discovered beacons (name, UUID/major/minor, RSSI bars), a name input, save and rescan actions.
**Acceptance:** User can scan, name, and save a beacon; saved beacon appears on Home's beacon strip.

#### Feature: Safe Zones (map + list management)
**Evidence:** `.stitch/references/safe_zones/code.html`
**Behavior:** Map + list bento layout. Each zone is a card with icon, name, address, radius badge, and an active/inactive toggle. A FAB ("Thêm vùng an toàn") adds a new zone using current GPS or manual address. Zones are used by the Safe Zone Detection algorithm (`idea.md` §Safe Zone Detection Algorithm) to skip alerts when the user is inside any active zone.
**Acceptance:** User can add, edit, toggle, and delete zones; zones with `is_active = 1` suppress alerts when the user's GPS is within `radius` meters at disconnect time.

#### Feature: Settings (alert config, beacon config, notifications)
**Evidence:** `.stitch/references/settings/code.html`
**Behavior:** Grouped card sections with toggle switches and a segmented control for timeout (2 / 5 / 10 / custom minutes). Sections cover Alert Configuration (timeout, audio on/off, vibration on/off, sound), Beacon Configuration (RSSI threshold, scan interval), and Notifications (DND handling, mute durations consistent with Home). Phase 2 adds an Account section.
**Acceptance:** Changing settings persists locally and immediately affects monitoring/alert behavior on next state transition.

#### Feature: History / Alert Event Log
**Evidence:** `.stitch/references/history/code.html`
**Behavior:** Vertical list of events sorted by date with a filter bar. Alert events render with peach tint; safe (in-safe-zone, suppressed) events render with mint tint. Each row shows timestamp, duration, beacon name, action taken, and safe-zone status.
**Acceptance:** Every alert / disconnection / reconnection event is logged with timestamp, duration, and `in_safe_zone` flag; history is filterable by date.

#### Feature: Beacon Detail with Co-guardian list (Phase 2)
**Evidence:** `.stitch/references/chi_ti_t_beacon_phase_2/code.html`
**Behavior:** Beacon info card (name, UUID/major/minor) plus a "Người cùng theo dõi" card listing guardian users with avatar initials, status pill (Đang gần / Xa / Ngoại tuyến / Tạm dừng), and last update time. Actions: invite guardian, leave beacon group, open Multi-user screen.
**Acceptance:** Per-user rollup is computed from device telemetry (`idea.md` §Aggregate beacon safety) and rendered as one row per user, never per device.

#### Feature: Multi-user / Co-guardians Management (Phase 2)
**Evidence:** `.stitch/references/ch_p_nh_n_l_i_m_i/code.html`
**Behavior:** Editorial list of guardian users (avatar, name, status pill, last update) with an invite button. When opened from a beacon context, the list is filtered to that beacon's guardians.
**Acceptance:** Owner can invite/remove guardians; non-owners can leave a beacon group; the list reflects server rollup with pull-to-refresh.

#### Feature: Guardian Invite Accept (Phase 2)
**Evidence:** `.stitch/references/co_guardians_list_phase_2/code.html`
**Behavior:** Centered card / modal with the inviting beacon's name, owner info, permission bullets, and Accept / Reject buttons.
**Acceptance:** Accepting creates a `beacon_guardians` row for the current user; rejecting closes the modal without changing membership.

#### Feature: Aggregate Beacon Safety in Alert Pipeline (Phase 2)
**Evidence:** `idea.md` §Aggregate beacon safety (Phase 2); reflected on Home alert state in `.stitch/references/babyguard_home_phase_2_alert/code.html`
**Behavior:** Before escalating to `alert_active`, the client (or server) evaluates `beacon_safe_aggregate = in_active_safe_zone OR any_guardian_user_in_ble_proximity`, with freshness window `T` (30–90s configurable). Offline / stale peer data fails closed for peer suppression.
**Acceptance:** When another guardian user reports `in_range` for the same beacon within `T`, the local device does not enter `alert_active`; the suppression reason is logged.

#### Feature: Background Monitoring
**Evidence:** `idea.md` §Background Monitoring, §Background Execution
**Behavior:** Android uses a foreground service with BLE scan (SCAN_MODE_LOW_LATENCY, UUID filter). iOS uses CoreLocation iBeacon region monitoring + ranging. Push notifications deep-link to Home in `alert_active`.
**Acceptance:** App continues monitoring with the screen off / in background; deep-link from notification opens Home in alert state.

## Non-Functional Requirements

Sourced from `idea.md` §Technical Architecture, §Security & Privacy, §UI/UX Guidelines.

- **Platforms:** iOS and Android, single codebase. Framework: Flutter (preferred per `idea.md` §Technology Stack) or React Native.
- **Locale:** Primary locale is **Vietnamese (`vi`)** — matches reference copy ("Tạm tắt thông báo push", "Người cùng theo dõi", "Thêm vùng an toàn") observed in the references in `.stitch/references/`. English fallback is acceptable for technical labels.
- **Performance / Battery:** BLE-first design (no continuous GPS); GPS captured on-demand only at disconnect, alert, and safe-zone check. Heartbeat upload (Phase 2) throttled to every 15–30s while monitoring.
- **Background execution:** Android foreground service; iOS region monitoring + ranging.
- **Accessibility:** WCAG AA contrast minimum on text and pills; explicit text + pill always present alongside the status icon (not color-only); `aria-label` on status SVG (e.g. "Trạng thái: đang an toàn"); voice announcements + haptics for alerts; do not rely on red/green alone.
- **Offline behavior (Phase 1):** All monitoring, alerting, safe-zone evaluation, and storage works without a server. Phase 2 adds optional cloud sync; offline / stale-sync fails closed for peer suppression.
- **Security & Privacy:** Encrypted local storage; beacon and safe-zone data stored locally; no continuous GPS history; explicit user consent for Bluetooth, Location ("While in use"/"When in use" only), Notifications; Phase 2 server sync uses authenticated session/device tokens and discloses presence-heartbeat semantics in consent copy; GDPR / COPPA considerations per `idea.md` §Regulatory Considerations.
- **Visual system:** Warm neutral palette (Warm Background `#F4F2EE` / Card Surface `#FFFFFF`) with accent pills (mint = safe, honey/yellow = weak, peach = alert) — consistent with both `idea.md` §Visual design system and the merged design system in `.stitch/references/ANALYSIS.md` §Design System Synthesis.
