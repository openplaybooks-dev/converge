---
id: 004-implement-providers
title: Implement Riverpod Providers
description: Create Riverpod providers for each entity in the data model
references:
  - flutter-managing-state
  - flutter-architecting-apps
seeds:
  - type: nodejs
    path: ./seed.js
blocking: true
depends_on:
  - 002-create-models
  - 003-create-mock-data
tags:
  - riverpod
  - state-management
  - providers
backlogs:
  - id: hardcoded-data-in-screens
    cmd: "grep -rnE '^(final|const) [a-z].*= \\[' lib/screens/ 2>/dev/null || true"
    description: Hardcoded data arrays still in screens (should use providers)
    severity: medium
---

# Implement Riverpod Providers

All Riverpod providers have been spawned and implemented.
Verify that all provider files exist and compile correctly.

**Verify providers:**

```bash
# List all providers
ls -la lib/providers/

# Verify all providers compile
dart analyze lib/providers/
```

**Success Criteria:**
- All provider files created in lib/providers/
- All providers use Riverpod annotations (`@riverpod`)
- All providers import from models and mock data
- All providers pass Dart analysis
