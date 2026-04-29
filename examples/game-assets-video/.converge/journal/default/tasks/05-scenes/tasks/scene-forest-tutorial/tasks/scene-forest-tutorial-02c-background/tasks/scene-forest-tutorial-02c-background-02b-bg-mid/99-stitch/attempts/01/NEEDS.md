# Needs: 05-scenes/scene-forest-tutorial/scene-forest-tutorial-02c-background/scene-forest-tutorial-02c-background-02b-bg-mid/99-stitch

## Description

Concatenate every bg-mid/seg-NNN.png into one wide bg-mid.png. Each seam between adjacent segments is filled by an AI-inpainted bridge that sees both sides at once — eliminates the visible seam jumps. Cost: 1 stitch + (N-1) inpaint calls; for an 8-segment layer, ~35¢ extra.

## Inputs

- `assets/scenes/forest-tutorial/scene-plan.json`
- `assets/scenes/forest-tutorial/bg-mid/segments/seg-*.png`
- `assets/scenes/forest-tutorial/bg-mid/critique/critique.json`

## Expected Outputs

- `assets/scenes/forest-tutorial/bg-mid/final.png`
- `assets/scenes/forest-tutorial/bg-mid/final.atlas.json`

## Checks

- **bg-mid-stitched-png-exists**: stitched bg-mid.png exists
- **bg-mid-stitched-atlas-exists**: stitched bg-mid.atlas.json exists
- **bg-mid-stitched-width-matches-target**: stitched width matches scene-plan target_size[0]
