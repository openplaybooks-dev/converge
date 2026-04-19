# Pregnant Tracker - Baby Bump — Navigation Map

## Bottom Navigation (ShellRoute)
- Home (`/home`) — Pregnancy dashboard with progress, stats, and quick actions [tab: home icon]
- Progress (`/progress`) — Weekly pregnancy updates, body changes, baby development [tab: calendar icon]
- Health (`/weight`) — Weight tracking, nutrition tips, BMI gauge [tab: heart icon]
- Wellness (`/mindfulness`) — Breathing exercises, stretching, meditation [tab: self_improvement icon]
- Learn (`/education`) — Educational articles on maternal care and nutrition [tab: book icon]

## Push Routes (detail screens)
- Exercise Detail (`/mindfulness/exercise/:id`) ← tap exercise card from Wellness
- Article Reader (`/education/article/:id`) ← tap article card from Learn
- Cycle Tracking (`/cycle`) ← accessible from Health tab
- Health Log (`/health-log`) ← tap "Next Checkup" stat card from Home
- Mood & Wellness (`/mood`) ← tap mood stat card from Home, or mood banner from Wellness
- Settings (`/settings`) ← tap profile icon or gear from Home

## Modal Overlays (bottom sheets & dialogs)
- Mode Selection (overlay:mode-selector) — Switch between Pregnancy/Wellness modes
- Weight Entry (overlay:weight-entry) — Log weight via FAB on Health screen
- Mood Logging (overlay:mood-log) — Log mood and energy via FAB on Mood screen
- Health Log Entry (overlay:health-log-entry) — Select entry type (Visit/Symptom/Reminder) via FAB
- Cycle Entry (overlay:cycle-entry) — Log or edit cycle data from calendar day tap
- Due Date Picker (overlay:due-date-picker) — Set or recalculate due date from Settings
- Clear Data Confirmation (overlay:clear-data) — Destructive action confirmation in Settings
- Delete Entry Confirmation (overlay:delete-entry) — Confirm deletion of list items
