# Task: 04-drop-mc-only/004-drop-domain-api

```bash
cd packages/studio/src/app/api
# Keep the converge-native allowlist
ALLOWED="playbooks runs run watch events search settings"
for d in */; do
  d=${d%/}
  case " $ALLOWED " in
    *" $d "*) ;;
    *) echo "  removing: $d"; rm -rf "$d" ;;
  esac
done
cd /Users/minh/Documents/converge

mkdir -p .converge/studio-state
echo "Dropped MC-domain API routes at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .converge/studio-state/dropped-domain-api.txt
```

After this leaf, `src/app/api/` contains exactly: `playbooks`, `runs`, `run`, `watch`, `events`, `search`, `settings`.