# Needs: 04-drop-mc-only/003-drop-domain-libs

## Expected Outputs

- `.converge/studio-state/dropped-domain-libs.txt`

## Checks

- **domain-libs-gone**: gateway-*, openclaw-*, websocket-*, agent-* lib files are gone
- **marker-written**: A marker file recording the drop is written
