---
id: "{{taskId}}"
title: "A11y: {{title}}"
description: "Accessibility pass for {{screenId}}: labels, tap targets, contrast, decorative image exclusions, and an a11y widget test."
references:
  - flutter-improving-accessibility
  - flutter-testing-apps
dependencies:
  - "{{prevId}}"
tags:
  - a11y
  - {{screenId}}
inputs:
  - "{{screenPath}}"
  - "{{localWidgetsDir}}/**/*.dart"
  - lib/widgets/**/*.dart
  - .stitch/system/tokens.json
  - test/helpers/pump_app.dart
outputs:
  - "{{screenPath}}"
  - "{{localWidgetsDir}}/**/*.dart"
  - "{{testPath}}"
checks:
  - id: target-has-no-bare-icons
    cmd: "bash -c 'bad=$(grep -rnE \"IconButton\\(\" {{screenPath}} {{localWidgetsDir}} 2>/dev/null | while read -r line; do file=$(echo \"$line\" | cut -d: -f1); if ! grep -qE \"(tooltip:|semanticLabel:|Semantics\\()\" \"$file\"; then echo \"$file\"; fi; done | sort -u); test -z \"$bad\"'"
    description: "no IconButton without tooltip/semanticLabel/Semantics in this target"
  - id: a11y-test-exists
    cmd: "test -f {{testPath}}"
    description: "accessibility test file exists"
  - id: a11y-test-valid
    cmd: "dart analyze {{testPath}}"
    description: "a11y test file passes dart analyze"
  - id: a11y-test-passes
    cmd: "flutter test {{testPath}}"
    description: "flutter test {{testPath}} exits 0"
---

# A11y: {{title}}

Run the accessibility pass on **{{screenId}}** (kind: {{kind}}). Scope is `{{screenPath}}` and any files under `{{localWidgetsDir}}/`. Do **not** mass-edit `lib/widgets/` shared widgets — if a shared widget needs changes, this task touches only the ones rendered by this screen.

## 1. Semantics labels

For every interactive widget in the target:

- `IconButton` — add `tooltip:` (user-visible on long-press, also exposed to a11y) OR wrap in `Semantics(label: '...', button: true, child: …)`.
- Bare `Icon` inside `InkWell`/`GestureDetector`/`ListTile` — add `semanticLabel:` on the Icon, OR wrap the tappable parent in `Semantics(label: '...', button: true)`.
- Custom tappable `Container`/`Card` without a visible text label — wrap in `Semantics(label: '...', button: true)`.
- Status pills and badges conveying meaning by color — wrap in `Semantics(label: '<state description>')`.

Labels must be localized — if the screen renders Vietnamese copy, labels should be Vietnamese too.

## 2. Tap targets

Every interactive widget must have effective tap area ≥ 44×44. Flutter defaults are often enough, but verify:

- `IconButton` with default size: OK (48×48 default).
- Custom `InkWell`/`GestureDetector`: wrap in `SizedBox(width: max(44, contentWidth), height: max(44, contentHeight), child: …)` or add sufficient padding on the parent.
- `FilledButton` / `ElevatedButton`: default OK.
- Small list trailing icons: ensure the row itself is tappable with 48+ height.

## 3. Color contrast

Read `.stitch/system/tokens.json`. For each text role used on this screen (body, label, title, display), compute contrast vs the surface it renders on. WCAG AA requires:

- 4.5:1 for body text
- 3:1 for text ≥ 18.66 px regular or ≥ 14 px bold (large-text exception)

If a pairing fails, prefer adjusting the widget's color usage (swap `onSurfaceVariant` for `onSurface` on small body text) over editing the tokens. Record the swap in a comment on the widget.

Use this JS one-liner to compute contrast if you need to:
```
const L = (c) => c.map(v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); });
const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
```

## 4. Decorative images

- `CachedNetworkImage` used purely as background (no information conveyed): wrap in `ExcludeSemantics(child: …)`.
- `Image.asset` for decorative icons: use `excludeFromSemantics: true` parameter.
- Hero/banner illustrations with no alt-worthy content: same — exclude from semantics.

## 5. Emit a11y test

Write `{{testPath}}` using Flutter's `SemanticsHandle` and guidelines:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:<package_name>/screens/{{snakeName}}/{{snakeName}}_screen.dart';

import '../../helpers/pump_app.dart';

void main() {
  testWidgets('{{widgetName}} meets accessibility guidelines', (tester) async {
    final handle = tester.ensureSemantics();
    await pumpApp(
      tester,
      const {{widgetName}}Screen(),
      overrides: [/* populate with mock data so the screen renders happy-path */],
    );

    // Tap targets
    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));

    // Labeled tappable widgets
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));

    // Text contrast
    await expectLater(tester, meetsGuideline(textContrastGuideline));

    handle.dispose();
  });
}
```

If the widget is an overlay (`kind: overlay`), use `pumpWidget` helper instead and pump the overlay widget directly.

## Banned

- Broad `Semantics(label: '')` with empty label.
- Suppressing guideline failures with `reason:` — fix the root cause.
- Editing shared widgets in `lib/widgets/` that aren't rendered by this screen.

## Success Criteria

- `{{testPath}}` exists and `flutter test {{testPath}}` exits 0
- No unlabeled `IconButton` in `{{screenPath}}` or `{{localWidgetsDir}}`
- No decorative image without `ExcludeSemantics` / `excludeFromSemantics: true`
