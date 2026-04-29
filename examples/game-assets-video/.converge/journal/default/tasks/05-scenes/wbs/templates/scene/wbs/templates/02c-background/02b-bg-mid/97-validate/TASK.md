---
id: "scene-{{scene_id}}-02c-background-02b-bg-mid-97-validate"
title: "Scene `{{scene_id}}` — validate bg-mid segments (vision judge)"
description: "Composite the per-segment PNGs and ask Gemini for a structured critique. If issues are flagged, the corresponding segments are deleted so the runner re-runs them; the critique becomes additional prompt context for the regen."
inputs:
  - "assets/scenes/{{scene_id}}/stage.json"
  - "assets/scenes/{{scene_id}}/concept.png"
  - "assets/scenes/{{scene_id}}/map.silhouette.png"
  - "assets/scenes/{{scene_id}}/bg-mid/segments/seg-*.png"
outputs:
  - "assets/scenes/{{scene_id}}/bg-mid/critique/critique.json"
checks:
  - id: bg-mid-critique-written
    cmd: test -s assets/scenes/{{scene_id}}/bg-mid/critique/critique.json
    description: critique JSON was written
  - id: bg-mid-validator-no-high-severity
    cmd: |
      python -c "
      import json
      c = json.load(open('assets/scenes/{{scene_id}}/bg-mid/critique/critique.json'))
      segs = c.get('segments') or []
      high = [s for s in segs if s.get('decision') == 'fix' and s.get('severity') == 'high']
      if high:
          tags = [(s.get('index'), s.get('issues')) for s in high]
          raise AssertionError(f'{len(high)} segment(s) flagged with severity=high: {tags}')
      "
    description: no segment was flagged with severity=high (low-severity issues are accepted)
tags:
  - scene
  - "{{scene_id}}"
  - background
  - bg-mid
  - validate
---

# Scene `{{scene_id}}` — validate bg-mid

## Role

You are a **paid-API operator**. Run the script and report its real result.

## What this does

Composites every `bg-mid/seg-NNN.png` side-by-side and asks Gemini (with the scene concept + macro silhouette as additional references) to critique the result. The output is a structured JSON listing per-segment verdicts (keep / fix) and fix-targets.

If the verdict is `pass`, this task succeeds and the runner moves to `99-stitch`.

If the verdict is `fix`, the script deletes the flagged `seg-NNN.png` files and exits non-zero. The runner sees the missing outputs and re-runs the corresponding segment tasks. Each retried segment's prompt now includes the validator's critique as feedback.

## Run

```bash
python scripts/validate_bg_layer.py {{scene_id}} mid
```

## Cost

- 1 text-out call per validation pass (~5¢).
- Each iteration that flags N segments adds N image-gen calls on the next pass.

## Loop bound

The task's check rejects `verdict != pass`. The runner caps task attempts via `maxTaskAttempts`, so the validate→regen loop is bounded by that cap (default 2). After the cap, this task fails and the next stitch attempt runs against whatever segments exist on disk — accept what the loop produced.
