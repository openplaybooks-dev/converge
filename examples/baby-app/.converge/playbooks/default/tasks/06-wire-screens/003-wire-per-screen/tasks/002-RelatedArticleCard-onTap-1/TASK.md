---
id: 002-RelatedArticleCard-onTap-1
title: Wire GestureDetector.onTap
checks:
  - id: handler-wired
    description: "GestureDetector.onTap has real logic at lib/screens/article_reader/widgets/related_article_card.dart:27"
    cmd: node .converge/playbooks/default/tasks/06-wire-screens/check-handler.mjs lib/screens/article_reader/widgets/related_article_card.dart 27 onTap
---

Wire the **GestureDetector** `onTap` handler in `lib/screens/article_reader/widgets/related_article_card.dart:27`.

**Current status:** empty
**Required action:** Navigate to article reader for selected related article
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
