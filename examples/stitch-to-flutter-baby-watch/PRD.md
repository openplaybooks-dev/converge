# Design — Product Requirements Document

## 1. Overview

Design is a Flutter application that detects when a child is left behind by monitoring Bluetooth beacons. When the adult's device moves away from the beacon for a specified duration, the app triggers comprehensive alerts including device vibration, loud audio alarm, and high-priority push notifications.

## 2. User Personas

The application targets two primary user groups:

### Primary User: Parents / Guardians
- Primary caregivers responsible for child safety
- Key goals: Ensure child is never left behind, receive timely alerts when separation occurs, easily configure and monitor beacon status
- Technical comfort level: Moderate — may not be familiar with BLE technology

### Secondary User: Extended Family Members (Phase 2)
- Co-guardians who share monitoring responsibilities
- Key goals: Receive alerts when primary caregiver is unavailable, view child's proximity status, collaborate on safety monitoring
- Technical comfort level: Varies across family members

## 3. Features

### Beacon Connection
- Scan for available BLE beacons
- Select beacon to monitor from discovered list
- Save beacon configuration with custom name
- Store beacon credentials locally

**Acceptance Criteria:**
- App displays list of discoverable beacons within range
- User can assign a friendly name (e.g., "Blue Berry") to a selected beacon
- Beacon configuration persists across app restarts
- Saved beacon appears in Home screen beacon strip

### Distance Monitoring
- Continuous beacon signal reception
- Track RSSI (Received Signal Strength Indicator)
- Monitor connection state
- Real-time proximity detection (Near/Far status)

**Acceptance Criteria:**
- Home screen displays current proximity status derived from RSSI
- Status updates in real-time as RSSI changes
- "Last seen" timestamp shown for monitored beacon

### Disconnection Alert
- Trigger alert when signal lost for configured duration
- Safe zone evaluation before alert activation
- Aggregate beacon safety check (Phase 2)

**Acceptance Criteria:**
- Timer starts upon beacon signal loss
- Alert fires only when threshold exceeded AND not in safe zone
- Alert includes vibration, audio alarm, and push notification
- Alert can be acknowledged from Home screen

### History & Logging
- Record disconnection timestamps
- Record reconnection timestamps
- Calculate and store duration of disconnection events
- Maintain alert history with safe zone context

**Acceptance Criteria:**
- History screen shows chronological list of events
- Each event displays timestamp, duration, and safe zone status
- Filter by date range available

### Alert Configuration
- Configurable timeout: 2 min / 5 min / custom
- Audio enable/disable
- Vibration enable/disable
- Sensitivity adjustment (advanced)

**Acceptance Criteria:**
- Settings persist across app restarts
- Timeout change takes effect immediately

### Safe Zones
- Define locations where no alerts are triggered
- Home, school, and trusted location support
- Auto-detect current GPS location
- Configurable radius per zone (default: 50m)
- Active/Inactive toggle per zone

**Acceptance Criteria:**
- Safe zone list displayed with name, address, radius, and status
- Add new zone captures GPS or accepts manual address
- Zones can be edited and deleted
- Active zones prevent alert triggering

### Background Monitoring
- Android: Foreground Service for continuous scanning
- iOS: iBeacon region monitoring

**Acceptance Criteria:**
- App continues monitoring when in background
- Alerts fire even when app is not in foreground

## Requirements

### Performance
- RSSI updates processed within 1-2 seconds
- Alert latency from signal loss to notification: < 1 second after threshold
- Battery impact minimized through BLE scan intervals
- No continuous GPS tracking — only on-demand location capture

### Accessibility
- Voice announcements for critical alerts
- Haptic feedback for status changes
- Screen reader labels on all interactive elements
- WCAG AA contrast compliance
- Status communicated through color, text, and shape (not color alone)

### Platform Support
- iOS 12.0+
- Android API 21+ (Android 5.0 Lollipop)
- Flutter cross-platform framework
- Native BLE access via platform channels

### Security & Privacy
- Beacon credentials stored locally with encryption
- GPS data captured only at disconnect/alert events
- No continuous location tracking
- Safe zone data stored locally only
- No third-party data sharing

### Technical Constraints
- BLE beacon format: iBeacon (Apple) or Eddystone
- RSSI to distance formula: Distance = 10^((TxPower - RSSI) / (10 * n))
- Distance zones: Immediate (<1m), Near (1-10m), Far (>10m)
- Local storage: Hive or SQLite
- State management: Provider or Riverpod (Flutter)
