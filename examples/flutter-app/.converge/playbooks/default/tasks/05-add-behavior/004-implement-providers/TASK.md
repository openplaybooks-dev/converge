---
id: 004-implement-providers
title: Implement Riverpod Providers
description: Create Riverpod providers for each entity in the data model
references:
  - flutter-managing-state
  - flutter-architecting-apps
  - flutter-riverpod-patterns
seed:
  mode: cli
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

Spawn one Riverpod provider task per entity defined in `data-models.md` (entity headers match `## Entity: <Name>`).

```bash
PROVIDER_TPL=".converge/playbooks/default/templates/provider/TASK.md"

# Fallback when data-models.md is missing or has no entities.
emit_fallback() {
  converge spawn template \
    --path "${PROVIDER_TPL}" \
    --id 001-create-providers \
    --var "entity=AllModels" \
    --var "fileName=providers.dart" \
    --var "filePath=lib/providers/providers.dart"
}

if [ ! -f data-models.md ]; then
  emit_fallback
  exit 0
fi

# Extract entity names from `## Entity: <Name>` headers.
ENTITIES=$(grep -E '^## Entity:[[:space:]]+[A-Za-z_][A-Za-z0-9_]*' data-models.md \
  | sed -E 's/^## Entity:[[:space:]]+([A-Za-z_][A-Za-z0-9_]*).*/\1/' || true)

if [ -z "${ENTITIES}" ]; then
  emit_fallback
  exit 0
fi

i=0
echo "${ENTITIES}" | while read -r ENTITY; do
  [ -z "${ENTITY}" ] && continue
  i=$((i + 1))
  IDX=$(printf '%03d' "${i}")
  # CamelCase → snake_case
  SNAKE=$(echo "${ENTITY}" | sed -E 's/([a-z0-9])([A-Z])/\1_\2/g' | tr '[:upper:]' '[:lower:]')
  converge spawn template \
    --path "${PROVIDER_TPL}" \
    --id "${IDX}-provider-${ENTITY}" \
    --var "entity=${ENTITY}" \
    --var "fileName=${SNAKE}_provider.dart" \
    --var "filePath=lib/providers/${SNAKE}_provider.dart"
done
```
