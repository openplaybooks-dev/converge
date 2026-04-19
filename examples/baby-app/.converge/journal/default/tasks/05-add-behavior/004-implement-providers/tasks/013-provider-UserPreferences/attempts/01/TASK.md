# Task: 05-add-behavior/004-implement-providers/013-provider-UserPreferences

Create a Riverpod provider for the **UserPreferences** entity in `lib/providers/user_preferences_provider.dart`.

Read `data-models.md` for the entity definition and relationships.

References: flutter-riverpod-patterns

**Instructions:**
1. Import the UserPreferences model from `package:folio/models/models.dart`
2. Import mock data from `package:folio/data/mock_data.dart`
3. Use `@riverpod` annotation
4. Initialize with mock data
5. Export from a barrel file at `lib/providers/providers.dart`

Verify with: `dart analyze lib/providers/user_preferences_provider.dart`