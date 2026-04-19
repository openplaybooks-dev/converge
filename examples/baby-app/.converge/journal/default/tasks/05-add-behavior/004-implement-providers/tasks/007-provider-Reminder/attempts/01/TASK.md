# Task: 05-add-behavior/004-implement-providers/007-provider-Reminder

Create a Riverpod provider for the **Reminder** entity in `lib/providers/reminder_provider.dart`.

Read `data-models.md` for the entity definition and relationships.

References: flutter-riverpod-patterns

**Instructions:**
1. Import the Reminder model from `package:folio/models/models.dart`
2. Import mock data from `package:folio/data/mock_data.dart`
3. Use `@riverpod` annotation
4. Initialize with mock data
5. Export from a barrel file at `lib/providers/providers.dart`

Verify with: `dart analyze lib/providers/reminder_provider.dart`