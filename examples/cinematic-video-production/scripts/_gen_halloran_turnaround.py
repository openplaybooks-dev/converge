#!/usr/bin/env python3
"""One-off: generate halloran turnaround sheet via Gemini (Nano-banana)."""
from __future__ import annotations
import json, os, random, sys
from datetime import datetime, timezone
from pathlib import Path

PROMPT = """Character reference turnaround sheet: Halloran.

Man, late sixties, gaunt sinewy frame, sallow weathered skin, thinning white hair swept back, deep-set dark eyes, bony long-fingered hands, stooped scholar's posture.

Four views on a single image, left-to-right: FRONT, 3/4 FRONT, SIDE, BACK.
Neutral expression. Relaxed stance (not T-pose - natural standing).
Default wardrobe: Long black oilcloth coat over a plain cream collarless shirt and black waistcoat. Dark grey wool trousers. Scuffed black leather boots. Solid colours throughout, no patterns or insignia.
Plain light-grey seamless background.
Evenly lit from front-left with soft fill.
Full body visible in every view. Same height, same scale across all four.
Photoreal cinematic style. No text, no watermarks, no labels.

Aspect ratio: 16:9.
"""

MODEL = "gemini-3.1-flash-image-preview"
PROJECT = Path(__file__).resolve().parent.parent
OUT_PNG = PROJECT / "characters/halloran/turnaround.png"
OUT_SEED = PROJECT / "characters/halloran/turnaround.seed.txt"
LOG = PROJECT / ".converge/logs/image-generate.log"


def main() -> int:
    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("GEMINI_API_KEY not set")

    client = genai.Client(api_key=api_key)
    seed_used = random.randint(1, 2_000_000_000)
    parts = [types.Part.from_text(text=PROMPT)]
    contents = [types.Content(role="user", parts=parts)]
    config = types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"])

    img_bytes: bytes | None = None
    for chunk in client.models.generate_content_stream(
        model=MODEL, contents=contents, config=config
    ):
        if chunk.parts is None:
            continue
        for part in chunk.parts:
            inline = getattr(part, "inline_data", None)
            if inline and inline.data:
                img_bytes = inline.data
                break
        if img_bytes:
            break

    if not img_bytes:
        raise SystemExit(f"no image in response model={MODEL}")

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    OUT_PNG.write_bytes(img_bytes)
    OUT_SEED.write_text(str(seed_used), encoding="utf-8")

    LOG.parent.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps({
            "ts": datetime.now(timezone.utc).isoformat(),
            "op": "character_sheet",
            "character": "halloran",
            "sheet": "turnaround",
            "model": MODEL,
            "seed": seed_used,
            "refs": [],
            "output": "characters/halloran/turnaround.png",
            "ok": True,
        }) + "\n")

    print(f"wrote {OUT_PNG.relative_to(PROJECT)} seed={seed_used}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
