# FEEDBACK.md — Check Results

**Status**: ❌ 1/2 check(s) failed

- ❌ **no-empty-handlers**
- ✅ **dart-analysis-valid**

## ❌ no-empty-handlers

**Command**: `node .converge/playbooks/default/tasks/06-wire-screens/004-verify/check-all-handlers.mjs`
**Exit code**: 1
**Output**:
```
FAIL: 9 empty handler(s) found:

  lib/screens/beacon_detail/beacon_detail_screen.dart:37 — onPressed is empty
  lib/screens/beacon_detail/beacon_detail_screen.dart:59 — onPressed is empty
  lib/screens/beacon_detail/beacon_detail_screen.dart:206 — onPressed is empty
  lib/screens/beacon_detail/widgets/co_guardian_card.dart:92 — onPressed is empty
  lib/screens/beacon_detail/widgets/co_guardian_card.dart:119 — onPressed is empty
  lib/screens/beacon_detail/widgets/technical_accordion.dart:31 — onTap is empty
  lib/screens/home/home_screen.dart:59 — onPressed is empty
  lib/widgets/overlays/timeout_picker/timeout_picker.dart:125 — onPressed is empty
  lib/widgets/technical_accordion.dart:31 — onTap is empty
```
