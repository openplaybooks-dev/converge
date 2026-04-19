---
id: 006-provider-DoctorVisit
title: Create DoctorVisit Provider
checks:
  - id: file-exists
    description: doctor_visit_provider.dart exists
    cmd: test -f lib/providers/doctor_visit_provider.dart
  - id: dart-valid
    description: Dart analysis passes
    cmd: dart analyze lib/providers/doctor_visit_provider.dart
---

Create a Riverpod provider for the **DoctorVisit** entity in `lib/providers/doctor_visit_provider.dart`.

Read `data-models.md` for the entity definition and relationships.

References: flutter-riverpod-patterns

**Instructions:**
1. Import the DoctorVisit model from `package:folio/models/models.dart`
2. Import mock data from `package:folio/data/mock_data.dart`
3. Use `@riverpod` annotation
4. Initialize with mock data
5. Export from a barrel file at `lib/providers/providers.dart`

Verify with: `dart analyze lib/providers/doctor_visit_provider.dart`
