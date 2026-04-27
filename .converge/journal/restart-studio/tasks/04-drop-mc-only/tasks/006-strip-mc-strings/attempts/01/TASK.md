# Task: 04-drop-mc-only/006-strip-mc-strings

```bash
for f in packages/studio/messages/*.json; do
  sed -i '' 's/Mission Control/Converge Studio/g' "$f"
done

mkdir -p .converge/studio-state
echo "Stripped MC strings at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .converge/studio-state/stripped-mc-strings.txt
```

DO NOT touch `LICENSE.upstream` or `NOTICE` — those need to keep "Mission Control" as the upstream attribution.

If MC has other strings worth scrubbing (Launch Sequence, Fleet Status, etc.), drop those too — but don't make the regex too broad. Keep `MetricCard`, `MainContent`, etc.