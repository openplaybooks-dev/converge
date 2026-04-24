# Task Journal: 03-build-screens/011-onboarding/011-03-convert

## Current attempt — `attempts/02/`

| File | Purpose |
|------|---------|
| `NEEDS.md` | Needs spec (inputs, outputs, checks defined) |
| `NEEDS.result.md` | Input evaluation (files found, blocked/ready) |
| `TASK.md` | Task instructions for the AI |
| `CHECK.md` | Check spec (ids, commands) |
| `CHECK.result.md` | Check outcomes after execution (pass/fail, output state) |
| `LEARN.md` | Failure analysis from previous attempt (attempt 2+) |
| `data/needs.json` | Machine-readable needs (inputs, outputs, blocked state) |
| `data/check.json` | Machine-readable check definitions |
| `data/facts.json` | Facts collected during execution |

## How to run / resume

```bash
pnpm converge run --step   # run next pending task
pnpm converge run          # run all remaining tasks
```

## Verify checks manually

```bash
  test -f lib/screens/onboarding/onboarding_screen.dart
  flutter analyze lib/screens/onboarding/onboarding_screen.dart
  grep -q 'Theme.of(context)' lib/screens/onboarding/onboarding_screen.dart
  grep -qE 'Color\(0x|Colors\.' lib/screens/onboarding/onboarding_screen.dart && exit 1 || exit 0
```