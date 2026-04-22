# Previous Attempt Did Not Produce All Required Outputs

Task `05-export-ready` is blocked and waiting for these files before it can run:

- `spritesheets/**/{state}.png`
- `spritesheets/**/{state}.frames.json`
- `objectsheets/**/*.png`
- `keyframes/**/*.png`

## Hints from Repair Analysis

- 03-sprite-sheet-gen: Ensure the WBS script actually writes PNG files to spritesheets/ and .frames.json files alongside them — the LEARN.md from a previous run already flagged missing .frames.json output
- 03-object-sheet-gen: Ensure the WBS script writes PNG files to objectsheets/
- 04-animation-keyframes: Ensure the WBS script writes PNG files to keyframes/

## What To Do This Attempt

Execute TASK.md instructions AND verify ALL files listed above exist when you finish.

For missing `.png` screenshot files:
- Generate from the HTML design (puppeteer, playwright, wkhtmltopdf, ImageMagick, or similar)
- Or create a minimal 1x1 white placeholder PNG if screenshot tools are unavailable

Do NOT stop until each missing file is verified to exist on disk.