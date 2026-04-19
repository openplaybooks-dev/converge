# FEEDBACK.md — Check Results

**Status**: ❌ 1/2 check(s) failed

- ❌ **no-empty-handlers**
- ✅ **dart-analysis-valid**

## ❌ no-empty-handlers

**Command**: `node .converge/playbooks/default/tasks/06-wire-screens/check-all-handlers.mjs`
**Exit code**: 1
**Output**:
```
FAIL: 22 empty handler(s) found:

  lib/screens/cycle_tracking/cycle_tracking_screen.dart:66 — onPressed is empty
  lib/screens/cycle_tracking/widgets/calendar_card.dart:79 — onPressed is empty
  lib/screens/cycle_tracking/widgets/calendar_card.dart:207 — onTap is empty
  lib/screens/cycle_tracking/widgets/calendar_card.dart:233 — onTap is empty
  lib/screens/cycle_tracking/widgets/calendar_card.dart:259 — onTap is empty
  lib/screens/cycle_tracking/widgets/calendar_card.dart:285 — onTap is empty
  lib/screens/cycle_tracking/widgets/calendar_card.dart:314 — onTap is empty
  lib/screens/cycle_tracking/widgets/cycle_history_card.dart:93 — onTap is empty
  lib/screens/health_log/health_log_screen.dart:117 — onPressed is empty
  lib/screens/mood_wellness/widgets/mood_history_entry.dart:43 — onTap is empty
  lib/screens/mood_wellness/widgets/recommendations_card.dart:67 — onTap is empty
  lib/screens/mood_wellness/widgets/todays_mood_card.dart:32 — onTap is empty
  lib/screens/settings/widgets/about_section.dart:76 — onTap is empty
  lib/screens/settings/widgets/pregnancy_section.dart:44 — onTap is empty
  lib/screens/weight_nutrition/widgets/weight_history_section.dart:94 — onTap is empty
  lib/widgets/article_card.dart:46 — onTap is empty
  lib/widgets/bookmarked_article_card.dart:40 — onTap is empty
  lib/widgets/exercise_card.dart:30 — onTap is empty
  lib/widgets/exercise_guide_card.dart:91 — onTap is empty
  lib/widgets/mood_banner.dart:17 — onTap is empty
  lib/widgets/mood_history_entry.dart:43 — onTap is empty
  lib/widgets/related_article_card.dart:27 — onTap is empty
```
