---
id: 03-validate
title: Validate npm Availability
description: Check npm registry availability for every candidate name and add availability data.
inputs:
  - artifacts/name-exploration/all-candidates.json
outputs:
  - artifacts/name-exploration/validated-candidates.json
checks:
  - id: validated-exists
    cmd: test -f artifacts/name-exploration/validated-candidates.json
    description: Validated candidates file exists
  - id: valid-json
    cmd: jq empty artifacts/name-exploration/validated-candidates.json
    description: Valid JSON
  - id: all-have-availability
    cmd: jq -e 'all(has("available"))' artifacts/name-exploration/validated-candidates.json
    description: Every candidate has availability status
  - id: count-matches-input
    cmd: |
      in=$(jq 'length' artifacts/name-exploration/all-candidates.json)
      out=$(jq 'length' artifacts/name-exploration/validated-candidates.json)
      test "$in" -eq "$out"
    description: Same count as input (no candidates lost)
---

# Validate: npm Availability Check

For every candidate in `all-candidates.json`, check whether the name is available on npm.

## Method

For each candidate name, check two things:
1. **Unscoped package**: `npm view <name>` — returns 404 if available
2. **Scoped org**: `npm view @<name>/core` — returns 404 if the scope is available

## Process

1. **Read `all-candidates.json`.** Get the full candidate list.

2. **For each candidate, check availability.** Use `npm view <name> 2>&1` for the unscoped package name. If the command exits with a non-zero code containing "E404" or "404", the package name is AVAILABLE. If it returns package data, it's TAKEN.

   Also check `npm view @<name>/core 2>&1` to test scope availability. Same logic: E404/404 = scope AVAILABLE.

   **Rate limit:** npm may throttle. Add a 200ms delay between checks. If you get rate-limited (429), wait 5 seconds and retry.

   **Record for each candidate:**
   ```json
   {
     "available": true,
     "npm_check": {
       "package_available": true,
       "scope_available": true,
       "package_note": "E404 - not found",
       "scope_note": "E404 - not found"
     }
   }
   ```

   Or if taken:
   ```json
   {
     "available": false,
     "npm_check": {
       "package_available": false,
       "scope_available": true,
       "package_note": "Package taken by existing project (v1.2.3, 2020)",
       "scope_note": "E404 - scope available"
     }
   }
   ```

3. **Handle edge cases:**
   - **Unpublished packages** (E404 + "Unpublished on..."): Count as AVAILABLE (the name can be claimed)
   - **Rate limiting** (429): Wait, retry up to 3 times
   - **Network errors**: Mark as `available: null, error: "network_error"` and continue
   - **Invalid names** (special chars, too long): Mark as `available: false, error: "invalid_name"`

4. **Write `validated-candidates.json`.** Same array as input, preserving all agency fields (`territory`, `pronunciation`, `why_creative`, `risk`), but each candidate now has `available`, `npm_check.package_available`, `npm_check.scope_available`, and npm notes. Prefer running `node .converge/playbooks/name-exploration/tasks/03-validate/validate-npm.cjs` to keep behavior deterministic.

5. **Summary.** After processing all candidates, log:
   - Total checked: N
   - Available (package): X
   - Available (scope): Y
   - Available (both): Z
   - Errors: E

The file must have the same count as the input. The `count-matches-input` check enforces this.
