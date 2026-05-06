---
id: 003-create-mock-data
title: Create Mock Data
description: Generate comprehensive mock data for all entities based on the data model analysis
blocking: true
depends_on:
  - 002-create-models
inputs:
  - data-models.md
  - lib/models/**/*.dart
tags:
  - mock-data
  - development
  - testing
outputs:
  - lib/data/mock_data.dart
checks:
  - id: file-exists
    cmd: test -f lib/data/mock_data.dart
    description: Mock data file exists
  - id: file-size
    cmd: test $(wc -l < lib/data/mock_data.dart) -gt 200
    description: File is >200 lines
  - id: dart-analysis
    cmd: dart analyze lib/data/mock_data.dart
    description: Dart analysis passes
---

# Create Mock Data

Create comprehensive mock data for development and testing.

**Read the data model specification:**

```bash
cat data-models.md
```

**Your Task:**
Create `lib/data/mock_data.dart` with realistic mock data for all entities based on the data model specification.

**Instructions:**

1. **Import models** from `package:folio/models/models.dart`
2. **Create mock data based on the data model specification** — read data-models.md to determine entity counts, field types, and relationships
3. **Ensure data coherence** — IDs match across entities, realistic dates, varied values
4. **Use const where possible** for compile-time constants

## Example

```dart
import 'package:folio/models/models.dart';

final List<Novel> mockNovels = [
  Novel(
    id: 'novel-1',
    title: 'The Dragon\'s Apprentice',
    author: 'Sarah Chen',
    coverUrl: 'https://picsum.photos/seed/novel1/200/300',
    chapterCount: 142,
    rating: 4.8,
  ),
  // ... more novels
];
```

## Success Criteria

- File created at `lib/data/mock_data.dart`
- Data is coherent (IDs match across entities)
- Realistic values (dates, scores, text)
- Dart analysis passes
- File is >200 lines
