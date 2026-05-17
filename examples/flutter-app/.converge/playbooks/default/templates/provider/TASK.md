---
title: "Create {{entity}} Provider"
description: "Create a Riverpod provider for the {{entity}} entity"
references:
  - flutter-riverpod-patterns
tags:
  - riverpod
  - provider
vars:
  entity:
  fileName:
  filePath:
inputs:
  - data-models.md
outputs:
  - "{{filePath}}"
checks:
  - id: file-exists
    cmd: "test -f {{filePath}}"
    description: "{{fileName}} exists"
  - id: dart-valid
    cmd: "dart analyze {{filePath}}"
    description: Dart analysis passes
---

# Create {{entity}} Provider

Create a Riverpod provider for the **{{entity}}** entity in `{{filePath}}`.

Read `data-models.md` for the entity definition and relationships.

References: flutter-riverpod-patterns

**Instructions:**
1. Import the {{entity}} model from `package:folio/models/models.dart`
2. Import mock data from `package:folio/data/mock_data.dart`
3. Use `@riverpod` annotation
4. Initialize with mock data
5. Export from a barrel file at `lib/providers/providers.dart`

Verify with: `dart analyze {{filePath}}`
