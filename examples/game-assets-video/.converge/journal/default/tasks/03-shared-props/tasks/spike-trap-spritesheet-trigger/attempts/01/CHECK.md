# Checks: 03-shared-props/spike-trap-spritesheet-trigger

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## prop-spritesheet-png-exists-and-large
**Description**: Prop sheet PNG exists with reasonable dimensions (>=512x256)
**Command**: `python -c "from PIL import Image; im=Image.open('assets/objects/spike-trap/spritesheets/trigger/trigger.png'); w,h=im.size; assert w>=512 and h>=256, f'sheet too small: {im.size}'"
`

## prop-atlas-json-matches-png
**Description**: Prop atlas JSON's grid + sheet_size match the PNG (auto-detected layout)
**Command**: `python -c "import json; from PIL import Image; a=json.load(open('assets/objects/spike-trap/spritesheets/trigger/trigger.atlas.json')); im=Image.open('assets/objects/spike-trap/spritesheets/trigger/trigger.png'); m=a['meta']; assert m['cols']>=2 and m['rows']>=1, f\"grid too small: {m}\"; assert len(a['frames'])==m['cols']*m['rows'], f\"frame count != cols*rows: {m}\"; assert m['sheet_size']['w']==im.size[0] and m['sheet_size']['h']==im.size[1], f\"atlas/sheet size mismatch: atlas={m['sheet_size']} png={im.size}\""
`

## prop-prompt-saved
**Description**: Sibling .prompt.txt exists for debugging
**Command**: `test -s assets/objects/spike-trap/spritesheets/trigger/trigger.prompt.txt`