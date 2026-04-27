#!/usr/bin/env python3
"""
video-generate Veo 3 backend (Gemini API).

Reads JSON from stdin, generates a video via google-genai's Veo API, writes
the mp4 to `output_path`, and emits a JSON result on stdout matching the
video-generate contract.

Input (stdin JSON):
  {
    "first_frame_image": "<path>",
    "prompt": "<motion prompt>",
    "duration_s": 5.0,
    "aspect_ratio": "16:9" | "9:16",
    "seed": 12345 | null,
    "fps": 24 | null,
    "output_path": "<path to write mp4>"
  }

Output (stdout JSON):
  {
    "video_path": "<path>",
    "actual_duration_s": 5.0,
    "seed": 12345,
    "model": "veo-3.0-generate-001",
    "cost_usd": null
  }

Env:
  GEMINI_API_KEY   required
  VEO_MODEL        optional, defaults to veo-3.0-generate-001
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


LOG_PATH = Path(".converge/logs/video-generate.log")
DEFAULT_MODEL = os.environ.get("VEO_MODEL", "veo-3.0-generate-001")


def log(entry: dict) -> None:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")


def main() -> int:
    payload = json.loads(sys.stdin.read())

    first_frame = payload["first_frame_image"]
    prompt = payload["prompt"]
    duration_s = float(payload["duration_s"])
    aspect_ratio = payload.get("aspect_ratio", "16:9")
    seed = payload.get("seed")
    output_path = payload.get("output_path") or "output.mp4"

    # Veo only supports 16:9 and 9:16 today. Map our extended set down.
    veo_aspect = "9:16" if aspect_ratio in ("9:16", "3:4") else "16:9"
    # Duration support varies by model:
    #   veo-3.0-generate-001:  8s only
    #   veo-3.0-fast-...:      4-8s
    #   veo-3.1-*-preview:     4-8s
    # Below 4s isn't accepted on any current Veo variant — we render the
    # shortest valid clip (4s) and the caller's extract step samples a smaller
    # window if it needs less motion.
    if DEFAULT_MODEL.startswith("veo-3.0-generate-001"):
        veo_duration = 8
    else:
        veo_duration = max(4, min(8, round(duration_s)))

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        sys.stderr.write(
            "veo: GEMINI_API_KEY env var not set. Either export it, or switch "
            "to the stub backend by writing 'stub' to backends/ACTIVE.\n"
        )
        return 1

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        sys.stderr.write(
            "veo: google-genai not installed. Run: pip install -r scripts/requirements.txt\n"
        )
        return 1

    client = genai.Client(api_key=api_key)

    img_bytes = Path(first_frame).read_bytes()
    image = types.Image(image_bytes=img_bytes, mime_type="image/png")

    cfg_kwargs = {
        "aspect_ratio": veo_aspect,
        "duration_seconds": veo_duration,
        "number_of_videos": 1,
        # `allow_all` is region-restricted; `allow_adult` works broadly. Some
        # regions only accept `dont_allow` here — set VEO_PERSON_GENERATION to
        # override.
        "person_generation": os.environ.get("VEO_PERSON_GENERATION", "allow_adult"),
    }
    if isinstance(seed, int):
        cfg_kwargs["seed"] = seed
    negative_prompt = payload.get("negative_prompt")
    if negative_prompt:
        cfg_kwargs["negative_prompt"] = negative_prompt

    # Bookend interpolation: pass last_frame so the cycle lands where it
    # started. Critical for sprite-sheet usage — without it the clip ends on
    # whatever pose Veo decided was "natural" and the loop seam is jarring.
    # NOTE: as of preview testing, last_frame is only accepted by veo-3.1
    # standard preview AT THE 8-SECOND DURATION. Combining it with shorter
    # durations or fast/lite variants returns "use case not supported".
    # We honor the caller's request by silently dropping last_frame whenever
    # the combination would be rejected, so the call still succeeds.
    last_frame = payload.get("last_frame_image")
    bookend_supported = (
        DEFAULT_MODEL == "veo-3.1-generate-preview" and veo_duration == 8
    )
    if last_frame and bookend_supported:
        last_bytes = Path(last_frame).read_bytes()
        cfg_kwargs["last_frame"] = types.Image(image_bytes=last_bytes, mime_type="image/png")
    elif last_frame:
        sys.stderr.write(
            f"veo: last_frame_image dropped — model {DEFAULT_MODEL} at "
            f"duration {veo_duration}s does not support bookend frames. "
            f"Loop seam quality may suffer. Use veo-3.1-generate-preview at 8s for bookend.\n"
        )

    config = types.GenerateVideosConfig(**cfg_kwargs)

    sys.stderr.write(
        f"veo: starting generate_videos model={DEFAULT_MODEL} aspect={veo_aspect} "
        f"duration={veo_duration}s seed={seed}\n"
    )

    operation = client.models.generate_videos(
        model=DEFAULT_MODEL,
        prompt=prompt,
        image=image,
        config=config,
    )

    # Poll. Veo typically takes 60-180s.
    poll_interval = 10
    elapsed = 0
    max_wait = 600
    while not operation.done:
        time.sleep(poll_interval)
        elapsed += poll_interval
        operation = client.operations.get(operation)
        sys.stderr.write(f"veo: polling… {elapsed}s elapsed\n")
        if elapsed >= max_wait:
            sys.stderr.write(f"veo: timed out after {max_wait}s\n")
            return 1

    if operation.error:
        sys.stderr.write(f"veo: operation error: {operation.error}\n")
        return 1

    response = operation.response
    if response is None or not getattr(response, "generated_videos", None):
        sys.stderr.write(f"veo: empty response: {response}\n")
        return 1

    generated = response.generated_videos[0]
    video_handle = generated.video

    # The SDK returns either inline bytes or a URI we need to download. The
    # client.files.download() helper handles both.
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    client.files.download(file=video_handle)
    video_handle.save(output_path)

    seed_used = seed if isinstance(seed, int) else 0

    log({
        "ts": datetime.now(timezone.utc).isoformat(),
        "backend": "veo",
        "model": DEFAULT_MODEL,
        "output_path": output_path,
        "duration_s": veo_duration,
        "aspect_ratio": veo_aspect,
        "seed": seed_used,
        "cost_usd": None,
        "ok": True,
    })

    sys.stdout.write(json.dumps({
        "video_path": output_path,
        "actual_duration_s": float(veo_duration),
        "seed": seed_used,
        "model": DEFAULT_MODEL,
        "cost_usd": None,
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
