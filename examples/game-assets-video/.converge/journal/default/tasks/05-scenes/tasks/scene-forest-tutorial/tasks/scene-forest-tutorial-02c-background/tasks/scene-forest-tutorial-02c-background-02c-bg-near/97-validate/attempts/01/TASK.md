# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02c-bg-near/97-validate

# Scene `forest-tutorial` — validate bg-near

## Role

You are a **paid-API operator**. Run the script and report its real result.

## What this does

Composites every `bg-near/seg-NNN.png` side-by-side and asks Gemini (with the scene concept + macro silhouette as additional references) to critique the result. The output is a structured JSON listing per-segment verdicts (keep / fix).

If the verdict is `pass`, this task succeeds and the runner moves to `99-stitch`.

If the verdict is `fix`, the script deletes the flagged `seg-NNN.png` files and exits non-zero. The runner sees the missing outputs and re-runs the corresponding segment tasks. Each retried segment's prompt now includes the validator's critique as feedback.

## Run

```bash
python scripts/validate_bg_layer.py forest-tutorial near
```

## Cost

- 1 text-out call per validation pass (~5¢).
- Each iteration that flags N segments adds N image-gen calls on the next pass.