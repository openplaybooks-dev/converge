---
id: child-alpha
title: Child Alpha — a spawner task that decides its own grandchildren
passthrough: true
vars:
  sprint_id:
  owner:
  wave: 0
outputs:
  - output/alpha-manifest.json
checks:
  - id: alpha-flag-has-context
    cmd: grep -q "sprint=sprint-042 owner=alice wave=3" output/alpha.flag
---

# Child Alpha

This task IS the spawner: it does its work, then **emits a manifest** of the
sub-alphas to spawn (here, one per `wave`). The flow reads this result and
fans out the grandchildren — so child-alpha drives its own subtree at runtime.

```bash
mkdir -p output
echo "sprint={{sprint_id}} owner={{owner}} wave={{wave}}" > output/alpha.flag

# Decide the grandchildren (count driven by `wave`) and emit them as the result.
n={{wave}}
printf '{"subs":[' > output/alpha-manifest.json
for i in $(seq 1 "$n"); do
  [ "$i" -gt 1 ] && printf ',' >> output/alpha-manifest.json
  printf '{"index":%d}' "$i" >> output/alpha-manifest.json
done
printf ']}' >> output/alpha-manifest.json

echo "[child-alpha] emitted $(cat output/alpha-manifest.json)"
```
