# Task: 05-add-behavior/004-implement-providers/008-provider-WeekContent

Create a Riverpod provider for the **WeekContent** entity in `lib/providers/week_content_provider.dart`.

Read `data-models.md` for the entity definition and relationships.

References: flutter-riverpod-patterns

**Instructions:**
1. Import the WeekContent model from `package:folio/models/models.dart`
2. Import mock data from `package:folio/data/mock_data.dart`
3. Use `@riverpod` annotation
4. Initialize with mock data
5. Export from a barrel file at `lib/providers/providers.dart`

Verify with: `dart analyze lib/providers/week_content_provider.dart`