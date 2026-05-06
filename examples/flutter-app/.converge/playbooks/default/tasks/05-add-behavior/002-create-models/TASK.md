---
id: 002-create-models
title: Create Dart Data Models
description: Convert data model specification to Freezed data classes
references:
  - flutter-architecting-apps
  - flutter-handling-http-and-json
blocking: true
depends_on:
  - 001-analyze-data-models
inputs:
  - data-models.md
tags:
  - models
  - dart
  - freezed
  - implementation
outputs:
  - lib/models/**/*.dart
checks:
  - id: models-dir-exists
    cmd: find lib/models -name '*.dart' -type f | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'
    description: Model files exist
  - id: dart-analysis
    cmd: dart analyze lib/models/
    description: Dart analysis passes on models
---

# Create Dart Data Models

Read **flutter-architecting-apps** for layered architecture patterns (domain models in the Data layer) and **flutter-handling-http-and-json** for JSON serialization with `json_serializable` and `freezed`.

Create Dart data models from the data model specification using Freezed.

**Read the data model specification:**

```bash
cat data-models.md
```

**Your Task:**

Create Freezed data classes in `lib/models/` for all entities in the data model.

**Instructions:**

1. Read the data model specification
2. For each entity, create a Freezed data class with:
   - All fields with correct Dart types
   - Optional fields marked with `?`
   - Enum types for fields with specific values
   - `DateTime` for timestamps
   - `@freezed` annotation for immutability
   - `fromJson` / `toJson` factory via `json_serializable`
3. Export all models from `lib/models/models.dart` barrel file
4. Run `dart run build_runner build` to generate `.freezed.dart` and `.g.dart` files

## Example Model

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'novel.freezed.dart';
part 'novel.g.dart';

@freezed
class Novel with _$Novel {
  const factory Novel({
    required String id,
    required String title,
    required String author,
    String? coverUrl,
    @Default(0) int chapterCount,
    @Default(0.0) double rating,
  }) = _Novel;

  factory Novel.fromJson(Map<String, dynamic> json) => _$NovelFromJson(json);
}
```

## Success Criteria

- All entities from data-models.md converted to Freezed classes
- Correct Dart types (no `dynamic`)
- Optional fields marked with `?`
- Enum types for constrained values
- Barrel export file exists at `lib/models/models.dart`
- Dart analysis passes
