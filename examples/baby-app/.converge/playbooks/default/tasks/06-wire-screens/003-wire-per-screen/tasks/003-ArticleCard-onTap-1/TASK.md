---
id: 003-ArticleCard-onTap-1
title: Wire GestureDetector.onTap
checks:
  - id: handler-wired
    description: "GestureDetector.onTap has real logic at lib/screens/education/widgets/article_card.dart:46"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/check-handler.mjs lib/screens/education/widgets/article_card.dart 46 onTap
---

Wire the **GestureDetector** `onTap` handler in `lib/screens/education/widgets/article_card.dart:46`.

**Current status:** empty
**Required action:** Navigate to article reader for selected article
**Target:** /education/article/:id

## Implementation

```dart
onTap: () => context.push('/education/article/:id'),
```

## Rules

- Only modify the single handler — do NOT change layout or add widgets
- Match existing code style in the file
- The handler must not be empty after your change
- The handler body must contain real logic — not just a comment
