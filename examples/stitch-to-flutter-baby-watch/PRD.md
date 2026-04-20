# Product Requirements Document — Child Safety Beacon App

## Overview

Design Proposal — Child Safety Beacon App is a child safety application built with Flutter that detects when a child is left behind by monitoring Bluetooth Low Energy (BLE) beacons. When the adult's device moves away from the beacon beyond a configured timeout, the app triggers comprehensive alerts — including vibration, audio alarm, and high-priority push notifications — to prevent children from being accidentally left unattended.

**Value Proposition:**
- Simple: no GPS required for core monitoring; uses BLE technology
- Battery efficient: BLE consumes minimal power compared to GPS
- Multi-user support (Phase 2): more powerful than AirTag-style local-only solutions
- Family-oriented: designed specifically for child safety

## User Personas

### 1. Primary Caregiver (Parent)
A parent who regularly transports their child and wants peace of mind that the child is never accidentally left behind in a vehicle or location.

**Key Goals:**
- Receive immediate alerts when moving away from the child's beacon
- Configure alert sensitivity and timeout for their routine
- Define safe zones (home, school) where alerts are suppressed

### 2. Co-Guardian (Phase 2)
A family member or caregiver who shares monitoring responsibility for the same child.

**Key Goals:**
- Monitor the same beacon as the primary caregiver
- See whether another guardian is still near the child before alerts fire
- Receive alerts only when no other guardian is in proximity

### 3. On-the-Go Parent
A busy parent who needs the app to work reliably in the background without constant interaction.

**Key Goals:**
- Set up once and forget — background monitoring must be reliable on both Android and iOS
- Quick glance at the home screen to confirm safe status
- Minimal battery drain

## Features

### 1. Beacon Connection
- Scan for available BLE beacons
- Select and name a beacon (e.g., "Blue Berry")
- Save beacon configuration and credentials locally

**Acceptance Criteria:**
- App discovers nearby BLE beacons and lists them with UUID, Major, Minor, and RSSI
- User can assign a friendly name and save the beacon
- Saved beacon persists across app restarts

### 2. Distance Monitoring
- Continuous beacon signal reception
- RSSI tracking and real-time proximity detection
- Connection state monitoring

**Acceptance Criteria:**
- App displays Near / Far proximity derived from RSSI
- Status updates within 1–2 seconds of signal change
- Last-seen timestamp shown on the home screen beacon strip

### 3. Disconnection Alert
Trigger when signal is lost for longer than the configured timeout and the beacon is not considered safe by safe-zone rules (Phase 1) or aggregate rules (Phase 2).

**Acceptance Criteria:**
- Alert fires after configurable timeout (default options: 2 / 5 / 10 minutes)
- Alert includes device vibration, loud audio alarm, and high-priority push notification
- Home screen transitions to alert_active state with elapsed time and GPS snapshot
- User must acknowledge the alert to dismiss it

### 4. Safe Zones
Define locations where alerts are suppressed.

**Acceptance Criteria:**
- User can add a safe zone by current GPS or manual address entry
- Configurable radius per zone (default 50 m)
- Active/inactive toggle per zone
- When disconnection occurs inside an active safe zone, alert is suppressed and event is silently logged

### 5. History & Logging
Store and display disconnection events, reconnection events, durations, and alert history.

**Acceptance Criteria:**
- Events listed chronologically with timestamp, duration, beacon name, and safe-zone status
- User can filter by date range
- User can export or clear history

### 6. Alert Configuration
Customizable settings for timeout, audio, vibration, and sensitivity.

**Acceptance Criteria:**
- Timeout options: 2 min / 5 min / 10 min / custom
- Audio and vibration individually toggleable
- Changes take effect immediately for ongoing monitoring

### 7. Background Monitoring
Continuous monitoring when the app is not in the foreground.

**Acceptance Criteria:**
- Android: foreground service with persistent notification
- iOS: iBeacon region monitoring via CoreLocation
- Alerts fire even when app is backgrounded or device is locked

### 8. Multi-User Support (Phase 2)
Many-to-many: one user can monitor many beacons; one beacon can be monitored by many users.

**Acceptance Criteria:**
- Owner can invite co-guardians via deep link or short code
- Aggregate beacon safety: alert is suppressed if another guardian still sees the beacon within freshness window T
- Guardian list displayed per-user (not per-device) with rolled-up status

## Non-Functional Requirements

### Performance
- BLE scan updates within 1–2 seconds
- Alert triggers within seconds of timeout expiry
- GPS capture on-demand only (disconnect / alert), not continuous
- Minimal battery impact from BLE scanning

### Accessibility
- Voice announcements for alerts
- Haptic feedback
- Screen reader labels on status icon SVG (e.g., "Trạng thái: đang an toàn")
- No reliance on color alone — text, shape, and motion convey state
- WCAG AA contrast on pills and primary buttons

### Platform Support
- iOS and Android from a single Flutter codebase
- Android: foreground service, FusedLocationProviderClient (on-demand)
- iOS: CoreLocation iBeacon region monitoring, UserNotifications

### Security & Privacy
- Beacon data and safe zones stored locally; no continuous GPS tracking
- Encrypted local storage
- Phase 2 server sync with encryption; presence heartbeats expose coarse proximity only
- User consent required for all permissions (Bluetooth, Location, Notifications)
- Compliance with GDPR / COPPA and child safety app-store guidelines
