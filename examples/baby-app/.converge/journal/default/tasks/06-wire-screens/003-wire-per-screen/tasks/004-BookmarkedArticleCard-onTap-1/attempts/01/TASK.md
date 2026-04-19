# Task: 06-wire-screens/003-wire-per-screen/004-BookmarkedArticleCard-onTap-1

Wire the **GestureDetector** `onTap` handler in `lib/screens/education/widgets/bookmarked_article_card.dart:40`.

**Current status:** empty
**Required action:** Navigate to article reader for bookmarked article
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