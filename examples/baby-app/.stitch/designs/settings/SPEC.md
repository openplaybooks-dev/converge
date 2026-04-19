# Screen Specification: Settings

## 1. Screen Title

Settings

## 2. Purpose

Provide a centralized configuration hub where users manage their pregnancy profile (name, avatar, due date), toggle notification preferences (daily reminders, checkup alerts, self-care nudges), adjust display settings (units, reduced motion), and perform data management operations (export, clear). Accessed via push navigation from the profile icon or home menu.

## 3. Route

`/settings`

## 4. Widget Name

`SettingsScreen`

## 5. Design Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| Primary Canvas | Lavender Mist (#EDE8F7) | Screen background |
| Card Surface | Cloud White (#FFFFFF) | All settings section cards |
| Primary Accent | Coral Bloom (#F28B8B) | Active toggle highlight, due date action |
| Coral Whisper | rgba(242, 139, 139, 0.12) | Avatar fallback background |
| Secondary Accent | Lilac Pulse (#8B7ED8) | Active toggle track fill, section icons |
| Lilac Whisper | rgba(139, 126, 216, 0.14) | Selection highlights |
| Text Primary | Ink Charcoal (#2A2A3A) | Setting labels, section headings, user name |
| Text Secondary | Muted Quartz (#8B8B9C) | Setting descriptions, due date display, version text |
| Divider | Ghost Divide rgba(42, 42, 58, 0.06) | Separators between setting items within a card |
| Chip Background | Chip Mist rgba(139, 126, 216, 0.08) | Toggle track inactive, unit selector inactive |
| Destructive | Fault Red (#E85C5C) | "Clear All Data" button text and confirmation dialog action |
| Success | Field Green (#6DC48A) | Export success feedback |

### Typography

| Role | Scale | Weight | Usage |
|------|-------|--------|-------|
| Screen title | Display (2rem) | 800 | "Settings" in app bar |
| Section headers | Heading (1.5rem) | 700 | "Profile", "Pregnancy", "Notifications", "Display", "Data", "About" |
| Setting labels | Subheading (1.125rem) | 600 | Individual setting names |
| User name | Subheading (1.125rem) | 600 | Name display in profile section |
| Description text | Body (1rem) | 400 | Setting descriptions and explanations |
| Metadata | Data (0.875rem) | 500 | Due date value, trimester display, unit labels |
| Helper text | Caption (0.8125rem) | 400 | Version number, privacy notice link |
| Badges | Micro (0.6875rem) | 700 | Trimester badge (uppercase) |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| Screen horizontal padding | 20dp (1.25rem) | Left/right content inset |
| Section gap | 24dp | Between settings section cards |
| Card internal padding | 20dp | Inside each settings section card |
| List item gap | 12dp | Between individual setting rows within a card |
| Profile avatar size | 64dp | Avatar circle in profile section |

### Corner Radius

| Token | Value | Usage |
|-------|-------|-------|
| Section cards | 24dp (1.5rem) | Settings group cards |
| Avatar | 9999px | Profile avatar circle |
| Toggle track | 9999px | Fully rounded toggle switch |
| Destructive button | 9999px | "Clear All Data" pill button |

### Elevation

| Token | Shadow | Usage |
|-------|--------|-------|
| Standard | 0 4px 20px rgba(139, 126, 216, 0.12) | Settings section cards |
| Subtle | 0 2px 8px rgba(139, 126, 216, 0.08) | Card press state |

## 6. Layout Rules

### Scaffold

- **AppBar:** Standard app bar with title "Settings" in Display scale, Ink Charcoal. Leading back button (Lucide `arrow-left`, 22px, Ink Charcoal). Cloud White background.
- **Body:** `ListView` on Lavender Mist canvas. Vertical scroll with settings sections as cards.
- **BottomNavigationBar:** Hidden. Settings is a push route, not a tab destination.
- **FAB:** None.

### Content Width

Full viewport width with 20dp horizontal padding. No max-width wrapper. Cards fill available width.

### Vertical Spacing

Content starts 0.75rem below status bar safe-area inset. Section cards separated by 24dp gaps. Content ends with 0.75rem bottom padding above safe-area inset.

## 7. Sections

### 7.1 Profile Section

- **Description:** Displays user identity — avatar, name, and due date. Entry point for editing the user's name.
- **Widget type:** Cloud White card containing a `Row` (avatar + name column) and due date display below.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** `PregnancyProfile` entity: `userName`, `dueDate`.
- **Content:**
  - Avatar: 64dp circle. 2px Cloud White border with `0 2px 8px rgba(139, 126, 216, 0.16)` outer shadow. Fallback: user initials in Plus Jakarta Sans 700, Coral Bloom text on Coral Whisper fill.
  - User name: Subheading scale, Ink Charcoal, right of avatar.
  - Due date: Data scale, Muted Quartz, below name. Format: "Due: [date]".
- **Interactive elements:**
  - Tap avatar → present edit name bottom sheet with text input field.

### 7.2 Pregnancy Settings

- **Description:** Configure pregnancy-specific settings including due date and trimester display.
- **Widget type:** Cloud White card containing a `Column` of setting rows separated by Ghost Divide lines.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** `PregnancyProfile` entity: `dueDate`, `currentTrimester` (calculated).
- **Content:**
  - Section heading: "Pregnancy" in Heading scale, Ink Charcoal.
  - Due date row: "Due Date" label (Subheading), current due date value (Data scale, Muted Quartz), right-aligned chevron icon (Lucide `chevron-right`, 18px, Muted Quartz).
  - Trimester display row: "Current Trimester" label (Subheading), trimester value as Micro badge (uppercase, Lilac Pulse text on Chip Mist pill).
  - Ghost Divide separator between rows.
- **Interactive elements:**
  - Tap due date row → present date picker dialog.

### 7.3 Notifications

- **Description:** Toggle switches for controlling notification preferences — daily reminders, checkup alerts, and self-care nudges.
- **Widget type:** Cloud White card containing a `Column` of toggle rows separated by Ghost Divide lines.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** User preferences: `dailyReminders` (bool), `checkupAlerts` (bool), `selfCareNudges` (bool).
- **Content:**
  - Section heading: "Notifications" in Heading scale, Ink Charcoal.
  - Each toggle row: Setting label (Subheading scale, Ink Charcoal) left-aligned, toggle switch right-aligned.
    - "Daily Reminders" — toggle for daily pregnancy tips and reminders.
    - "Checkup Alerts" — toggle for upcoming doctor visit notifications.
    - "Self-Care Nudges" — toggle for gentle wellness activity prompts.
  - Toggle switch styling: 52px wide, 30px tall track. Inactive: Chip Mist track. Active: Lilac Pulse track. Thumb: 26px Cloud White circle with subtle shadow. Spring easing, 300ms slide, 200ms color crossfade.
  - Ghost Divide separator between rows.
- **Interactive elements:**
  - Tap toggle → update preference immediately. Thumb slides with spring easing.

### 7.4 Display

- **Description:** Adjust visual and measurement preferences — reduced motion toggle and weight unit selection.
- **Widget type:** Cloud White card containing a `Column` of setting rows separated by Ghost Divide lines.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** User preferences: `reducedMotion` (bool), `units` (WeightUnit: kg/lbs).
- **Content:**
  - Section heading: "Display" in Heading scale, Ink Charcoal.
  - Reduced motion row: "Reduced Motion" label (Subheading), toggle switch right-aligned. When enabled, all spring animations and staggered reveals are disabled.
  - Units row: "Weight Units" label (Subheading), segmented control right-aligned showing "kg" and "lbs" options. Active segment: Lilac Whisper background, Lilac Pulse text. Inactive: Chip Mist background, Muted Quartz text. Pill-shaped segments.
  - Ghost Divide separator between rows.
- **Interactive elements:**
  - Tap reduced motion toggle → update preference, disable/enable animations globally.
  - Tap unit segment → switch weight display unit across all screens.

### 7.5 Data

- **Description:** Data management actions — export user data and clear all data with destructive confirmation.
- **Widget type:** Cloud White card containing a `Column` of action rows separated by Ghost Divide lines.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** None (action triggers only).
- **Content:**
  - Section heading: "Data" in Heading scale, Ink Charcoal.
  - Export row: "Export Data" label (Subheading, Ink Charcoal), right-aligned chevron icon (Muted Quartz).
  - Clear data row: "Clear All Data" label (Subheading, Fault Red), right-aligned chevron icon (Fault Red).
  - Ghost Divide separator between rows.
- **Interactive elements:**
  - Tap "Export Data" → trigger data export flow.
  - Tap "Clear All Data" → present confirmation dialog. Dialog: Cloud White surface, 24dp radius, Prominent elevation. Title: "Clear All Data?" (Heading scale). Body: "This will permanently delete all your entries and preferences." (Body scale, Muted Quartz). Cancel button: Ghost style. Confirm button: Fault Red fill, Cloud White text, pill-shaped. Backdrop: Dim Veil overlay.

### 7.6 About

- **Description:** App metadata — version number and privacy notice link.
- **Widget type:** Cloud White card containing a `Column` of info rows.
- **Container:** 24dp border-radius, standard elevation, 20dp internal padding.
- **Data requirements:** Static: app version string.
- **Content:**
  - Section heading: "About" in Heading scale, Ink Charcoal.
  - Version row: "Version" label (Subheading, Ink Charcoal), version value right-aligned (Data scale, Muted Quartz).
  - Privacy row: "Privacy Notice" label (Subheading, Ink Charcoal), right-aligned chevron icon (Muted Quartz).
  - Ghost Divide separator between rows.
- **Interactive elements:**
  - Tap "Privacy Notice" → navigate to privacy content.

## 8. Data

### Entities

**PregnancyProfile** (primary)
- `userName`: String — user display name
- `dueDate`: DateTime — estimated due date
- `currentTrimester`: int — calculated from dueDate (1, 2, or 3)
- `height`: double — user height for BMI calculation
- `units`: WeightUnit — kg or lbs

**UserPreferences** (settings-specific)
- `dailyReminders`: bool — daily tip notifications enabled
- `checkupAlerts`: bool — upcoming visit notifications enabled
- `selfCareNudges`: bool — wellness prompts enabled
- `reducedMotion`: bool — disable spring animations
- `units`: WeightUnit — kg or lbs (mirrors PregnancyProfile)

### Screen Data Flow

- Profile data is loaded from the local `PregnancyProfile` entity on screen mount.
- Notification preferences are read from and written to local `UserPreferences` storage.
- Display preferences update globally — unit changes propagate to Weight & Nutrition and all stat displays.
- Reduced motion preference disables all spring physics, staggered reveals, and count-up animations app-wide.
- "Clear All Data" deletes all user-generated entities (WeightEntry, CycleEntry, MoodEntry, SymptomEntry, DoctorVisit, Reminder) and resets PregnancyProfile.
- "Export Data" serializes all entities to a shareable format.

## 9. Motion

### Entry Animations

- Settings section cards cascade with 80ms stagger delay. Each enters via `translateY(12px)` → `translateY(0)` with opacity 0 → 1, spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`), 450ms.

### Toggle Animations

- Toggle thumb slides with spring easing, 300ms. Track color crossfades from Chip Mist to Lilac Pulse over 200ms.
- Thumb shadow: `0 2px 6px rgba(42, 42, 58, 0.12)`.

### Card Press States

- Setting rows: subtle background highlight on press, 100ms ease-in.

### Page Transitions

- Entry (push from home/profile): content slides up 20px and fades in, 350ms spring.
- Exit (pop back): content fades out, 180ms ease-out.

### Dialog Animations

- Confirmation dialog: scale from 0.95 to 1.0 with opacity fade, 250ms spring. Backdrop: Dim Veil fades in over 200ms.

### Reduced Motion Override

- When `reducedMotion` is enabled, all entry animations resolve instantly (0ms duration), toggles use linear 100ms transition, and no stagger delays are applied.

## 10. Accessibility

### Semantics Labels

- Screen: `Semantics(label: "Settings")`.
- Back button: `Semantics(label: "Go back", button: true)`.
- Profile avatar: `Semantics(label: "Edit profile name", button: true)`.
- User name: `Semantics(label: "Name: [userName]")`.
- Due date row: `Semantics(label: "Due date: [date], tap to change", button: true)`.
- Trimester display: `Semantics(label: "Current trimester: [n]")`.
- Toggle switches: `Semantics(label: "[setting name], [on/off]", toggled: true)` for each toggle.
- Unit selector: `Semantics(label: "Weight units: [current unit]", button: true)`.
- Export data: `Semantics(label: "Export data", button: true)`.
- Clear all data: `Semantics(label: "Clear all data, destructive action", button: true)`.
- Version: `Semantics(label: "App version [version]")`.
- Privacy notice: `Semantics(label: "Privacy notice", button: true)`.

### Focus Order

1. Back button
2. Screen title
3. Profile avatar
4. User name
5. Due date
6. Pregnancy settings (due date picker, trimester)
7. Notification toggles (daily reminders, checkup alerts, self-care nudges)
8. Display settings (reduced motion, units)
9. Data actions (export, clear all)
10. About section (version, privacy)

### Contrast Notes

- Ink Charcoal (#2A2A3A) on Cloud White (#FFFFFF): contrast ratio ~13.5:1 — exceeds AAA. Used for all setting labels and headings.
- Muted Quartz (#8B8B9C) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for descriptions and metadata at Data scale or larger.
- Fault Red (#E85C5C) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for destructive action labels at Subheading scale.
- Lilac Pulse (#8B7ED8) on Cloud White: contrast ratio ~3.5:1 — meets AA for large text. Used for active toggle tracks and trimester badges.
- All interactive elements maintain 44x44dp minimum touch targets.

## 11. Anti-Patterns

- No emojis in settings UI — use Lucide icons for all visual indicators
- No pure black (#000000) anywhere — use Ink Charcoal (#2A2A3A) as darkest value
- No glass morphism or backdrop blur — opaque Cloud White cards on Lavender Mist canvas
- No circular loading spinners — use skeleton shimmer loaders if data loading is needed
- No floating detached tab bar — bottom nav is hidden on this push route
- No hover-only interaction states — all interactions are tap-based
- No Inter, Poppins, Roboto, or Montserrat fonts — use Plus Jakarta Sans exclusively
- No linear easing on any animation — spring or ease-out only
- No gradient text on headings — flat color only
- No hard black drop-shadows — all shadows carry lilac tint per Pastel Elevation spec
- No `h-screen` — use `min-h-[100dvh]` for full-height sections
- No landscape layouts — portrait only
- No destructive actions without confirmation dialog — "Clear All Data" must always present a confirmation
- No floating label inputs — label always above, error always below
- No visible card borders — separation via shadow and surface contrast only
