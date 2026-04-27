---
id: 006-strip-mc-strings
title: Replace "Mission Control" → "Converge Studio" in i18n
outputs:
  - .converge/studio-state/stripped-mc-strings.txt
checks:
  - id: no-mission-control-in-messages
    description: Literal "Mission Control" not in messages/
    cmd: "test -z \"$(grep -ril 'mission control' packages/studio/messages 2>/dev/null)\""
  - id: marker-written
    description: A marker file recording the strip is written
    cmd: "test -f .converge/studio-state/stripped-mc-strings.txt"
---

```bash
for f in packages/studio/messages/*.json; do
  sed -i '' 's/Mission Control/Converge Studio/g' "$f"
done

mkdir -p .converge/studio-state
echo "Stripped MC strings at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .converge/studio-state/stripped-mc-strings.txt
```

DO NOT touch `LICENSE.upstream` or `NOTICE` — those need to keep "Mission Control" as the upstream attribution.

If MC has other strings worth scrubbing (Launch Sequence, Fleet Status, etc.), drop those too — but don't make the regex too broad. Keep `MetricCard`, `MainContent`, etc.
