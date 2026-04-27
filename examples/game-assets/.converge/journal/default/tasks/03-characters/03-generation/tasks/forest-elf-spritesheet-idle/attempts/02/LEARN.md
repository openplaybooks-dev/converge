# LEARN.md — forest-elf-spritesheet-idle

## Blocker

Cannot produce `assets/characters/forest-elf/spritesheets/idle/idle.png` (or sibling `.prompt.txt` / `.seed.txt`) because the OpenAI image API call inside `scripts/generate_spritesheet.py` fails with:

```
openai.BadRequestError: Error code: 400 - {'error': {'message': 'Billing hard limit has been reached.', 'type': 'billing_limit_user_error', 'code': 'billing_hard_limit_reached'}}
```

## What was attempted

- Verified parent dir `assets/characters/forest-elf/spritesheets/idle/` exists and is empty — no on-disk artifact to point the spec at.
- Verified canonical reference `assets/characters/forest-elf/ref/canonical/canonical.png` exists (the `forest-elf-02-ref` dependency is satisfied).
- Ran `python scripts/generate_spritesheet.py forest-elf idle` — failed at the image API call.

## Why I cannot resolve this

- The image generation requires a paid third-party API; the account has hit its hard billing limit.
- Creating a stub `idle.png` would violate the explicit "Do NOT create empty stub files just to satisfy the outputs list" rule and would also fail the `>=256px square 4x4 grid` check.
- No code change in this repo can bypass an upstream billing limit.

## Unblocking

Either raise/reset the OpenAI account billing limit, or switch `image_api` backend (see `scripts/lib/image_api.py`) to a backend with available quota, then re-run:

```
python scripts/generate_spritesheet.py forest-elf idle
```
