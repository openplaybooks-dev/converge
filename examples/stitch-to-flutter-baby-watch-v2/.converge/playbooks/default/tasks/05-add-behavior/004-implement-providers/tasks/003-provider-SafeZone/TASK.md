---
id: 003-provider-SafeZone
title: Create SafeZone Provider
checks:
  - id: file-exists
    description: safe_zone_provider.dart exists
    cmd: test -f lib/providers/safe_zone_provider.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/providers/safe_zone_provider.dart
---

Create a Riverpod provider for the **SafeZone** entity in `lib/providers/safe_zone_provider.dart`.

Read `data-models.md` for the entity definition and relationships.

References: flutter-riverpod-patterns

**Instructions:**
1. Import the SafeZone model from `package:baby_watch/models/models.dart`
2. Import mock data from `package:baby_watch/data/mock_data.dart`
3. Use `@riverpod` annotation
4. Initialize with mock data
5. Export from a barrel file at `lib/providers/providers.dart`

Verify with: `dart analyze lib/providers/safe_zone_provider.dart`
