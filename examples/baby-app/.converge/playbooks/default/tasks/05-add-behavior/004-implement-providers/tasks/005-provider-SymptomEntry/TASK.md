---
id: 005-provider-SymptomEntry
title: Create SymptomEntry Provider
checks:
  - id: file-exists
    description: symptom_entry_provider.dart exists
    cmd: test -f lib/providers/symptom_entry_provider.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/providers/symptom_entry_provider.dart
---

Create a Riverpod provider for the **SymptomEntry** entity in `lib/providers/symptom_entry_provider.dart`.

Read `data-models.md` for the entity definition and relationships.

References: flutter-riverpod-patterns

**Instructions:**
1. Import the SymptomEntry model from `package:folio/models/models.dart`
2. Import mock data from `package:folio/data/mock_data.dart`
3. Use `@riverpod` annotation
4. Initialize with mock data
5. Export from a barrel file at `lib/providers/providers.dart`

Verify with: `dart analyze lib/providers/symptom_entry_provider.dart`
