# Needs: consumer

## Inputs

- `INPUT_FILE.txt`

## Checks

- **consumed-output**: CONSUMED_OUTPUT.txt exists with chained content
- **producer-retry-gate**: Producer ran at least twice (proves DependencyBackoffStrategy re-ran it)
