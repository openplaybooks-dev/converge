# LEARN — forest-elf-spritesheet-walk attempt 2

## Blocker

`scripts/generate_spritesheet.py forest-elf walk` cannot complete: the OpenAI image API returns
HTTP 400 `billing_hard_limit_reached`:

```
openai.BadRequestError: Error code: 400 - {'error': {'message': 'Billing hard limit has been reached.', ...}}
```

Trace: `scripts/generate_spritesheet.py:204` → `lib/image_api.py:75` → `lib/image_api_openai.py:170` (`client.images.edit`).

## What I confirmed before stopping

- Output dir exists but is empty: `assets/characters/forest-elf/spritesheets/walk/` (no `walk.png`, no `walk.prompt.txt`, no `walk.seed.txt`).
- Sibling task `idle` succeeded earlier (`spritesheets/idle/idle.{png,prompt.txt,seed.txt}` all present), so the script and reference inputs (`assets/characters/forest-elf/ref/canonical/canonical.png`) are wired correctly.
- The script invocation in TASK.md (`python scripts/generate_spritesheet.py forest-elf walk`) is the right one — it printed the expected setup line before the API call failed.
- This is not a spec/disk-name mismatch (branch 1 does not apply) and not a rename (branch 3 does not apply). The artifact was simply never produced because the upstream service is unavailable.

## What unblocks this

Either:
1. Raise / reset the OpenAI billing hard limit on the account backing `OPENAI_API_KEY`, then re-run `python scripts/generate_spritesheet.py forest-elf walk`.
2. Switch the backend (`lib/image_api.py` selects via `active_backend()`) to one with available quota and re-run.

Both checks (`spritesheet-png-is-4x4-grid`, `prompt-saved`) will pass once the script can complete a single image-edit call — the script writes `walk.png`, `walk.prompt.txt`, and `walk.seed.txt` in one pass.

## What I did NOT do (and why)

- Did not create empty stub files for `walk.png` / `walk.prompt.txt` — explicitly forbidden by the reconciliation rules and would mask the real failure.
- Did not edit the spec `outputs:` list — the declared filenames are correct; the issue is production, not naming.
- Did not modify the check command — it is functioning correctly (it surfaces the missing file).
