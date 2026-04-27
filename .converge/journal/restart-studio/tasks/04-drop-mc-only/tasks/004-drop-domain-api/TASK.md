---
id: 004-drop-domain-api
title: Drop MC-domain API routes (everything not in the converge allowlist)
outputs:
  - .converge/studio-state/dropped-domain-api.txt
checks:
  - id: only-allowlist-remains
    description: src/app/api/ contains only converge-native dirs
    cmd: "bash -c 'cd packages/studio/src/app/api && allowed=\"playbooks runs run watch events search settings\"; for d in */; do d=${d%/}; case \" $allowed \" in *\" $d \"*) ;; *) echo \"unexpected: $d\"; exit 1 ;; esac; done'"
  - id: marker-written
    description: A marker file recording the drop is written
    cmd: "test -f .converge/studio-state/dropped-domain-api.txt"
---

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
