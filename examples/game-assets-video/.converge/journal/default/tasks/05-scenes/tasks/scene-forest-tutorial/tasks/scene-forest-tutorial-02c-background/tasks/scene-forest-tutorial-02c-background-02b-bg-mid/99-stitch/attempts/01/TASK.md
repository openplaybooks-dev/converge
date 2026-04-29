# Task: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02b-bg-mid/99-stitch

# Scene `forest-tutorial` — stitch bg-mid

Run:

```bash
python scripts/stitch_bg_layer.py forest-tutorial mid
```

The stitcher reads every `assets/scenes/forest-tutorial/bg-mid/segments/seg-*.png`, resizes each to a common per-segment width, and feather-blends them onto a wide canvas. The output is one RGBA PNG sized to `bg.layers.mid.target_size`.

The default overlap is 128px for mid (less feathering than near because the silhouette content has more chroma-green negative space, where seams are invisible).

This task gates on `bg-mid/seg-*.png` via a glob, so it only fires once every segment has produced its file. (Glob inputs are matched at scheduling time — adding/removing segments and re-running is safe; the stitcher always reads what's actually on disk.)