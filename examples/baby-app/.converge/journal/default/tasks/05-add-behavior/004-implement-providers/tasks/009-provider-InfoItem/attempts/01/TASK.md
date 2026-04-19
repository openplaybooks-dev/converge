# Task: 05-add-behavior/004-implement-providers/009-provider-InfoItem

Create a Riverpod provider for the **InfoItem** entity in `lib/providers/info_item_provider.dart`.

Read `data-models.md` for the entity definition and relationships.

References: flutter-riverpod-patterns

**Instructions:**
1. Import the InfoItem model from `package:folio/models/models.dart`
2. Import mock data from `package:folio/data/mock_data.dart`
3. Use `@riverpod` annotation
4. Initialize with mock data
5. Export from a barrel file at `lib/providers/providers.dart`

Verify with: `dart analyze lib/providers/info_item_provider.dart`