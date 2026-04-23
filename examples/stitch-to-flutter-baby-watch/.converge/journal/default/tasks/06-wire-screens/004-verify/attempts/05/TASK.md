# Task: 06-wire-screens/004-verify

# Verify — End-to-End Wiring Check

Run all checks and fix any failures with minimal changes.

## Steps

1. Run each check command
2. For any failure, make the minimal fix
3. Re-run checks until all pass

## What to look for

- Empty `onDestinationSelected: (index) {}` — must have `context.go()`
- Empty `onPressed: () {}` or `onPressed: () { // comment }` — must have real logic
- `onPressed: null` — must be replaced with a handler or removed
- Missing `context.go` / `context.push` in bottom nav handlers
- TODO/placeholder comments in navigation code