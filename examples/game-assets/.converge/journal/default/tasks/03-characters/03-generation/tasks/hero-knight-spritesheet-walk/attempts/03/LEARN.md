# LEARN.md — Stuck

## What I tried
Ran `python scripts/generate_spritesheet.py hero-knight walk` to produce the missing
`assets/characters/hero-knight/spritesheets/walk/walk.{png,prompt.txt,seed.txt}`.

## Why I'm stuck
The OpenAI image edit call fails with HTTP 400:

```
openai.BadRequestError: Error code: 400 - {'error': {'message': 'Billing hard limit has been reached.', 'type': 'billing_limit_user_error', 'code': 'billing_hard_limit_reached'}}
```

This is an account-level external constraint — not a code bug, missing file, or wrong
output name. The sister task (`idle`) succeeded earlier when the budget was available,
so the script and reference assets (`assets/characters/hero-knight/ref/canonical/canonical.png`)
are confirmed working.

## What needs to happen
Raise the OpenAI billing hard limit (or switch the active backend in
`scripts/lib/image_api.py`) and re-run:

```
python scripts/generate_spritesheet.py hero-knight walk
```

No spec edit is appropriate: the declared outputs match the script's actual output
filenames, and no on-disk artifact serves the task's intent yet.
