# Needs: 04-drop-mc-only/004-drop-domain-api

## Expected Outputs

- `.converge/studio-state/dropped-domain-api.txt`

## Checks

- **only-allowlist-remains**: src/app/api/ contains only converge-native dirs
- **marker-written**: A marker file recording the drop is written
