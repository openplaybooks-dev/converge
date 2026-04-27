# LEARN.md — hero-knight-spritesheet-walk

**Blocker**: Cannot produce `walk.png` / `walk.prompt.txt` / `walk.seed.txt`.

The task requires running `scripts/generate_spritesheet.py hero-knight walk`, which calls the OpenAI image edit API. The call fails with:

```
openai.BadRequestError: Error code: 400 - 'Billing hard limit has been reached.'
```

The script itself works (the sibling `idle` spritesheet generated successfully under the same setup). The failure is external: the OpenAI account has hit its billing hard limit, so no further image-gen calls succeed until the user raises the cap or switches API keys.

**To unblock**: raise OpenAI billing limit (or rotate to a key with budget), then re-run:

```
python scripts/generate_spritesheet.py hero-knight walk
```

The four declared issues will all clear in one go, since both outputs and both checks depend on that single command succeeding.
