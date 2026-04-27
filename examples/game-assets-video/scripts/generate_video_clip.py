#!/usr/bin/env python3
"""
generate_video_clip.py — Generate one short video clip per character animation state.

Reads the canonical character reference (image), turns the 8 keyframe pose
descriptions in lib/keyframes.py into a continuous motion narration, and
calls the active video-generate backend (stub by default; kling-2.5 etc.
when wired) via a Node subprocess.

Usage:
  python scripts/generate_video_clip.py <char_id> <state> [--seed N] [--duration 5.0]

Outputs:
  assets/characters/{char_id}/videos/{state}/{state}.mp4
  assets/characters/{char_id}/videos/{state}/{state}.prompt.txt
  assets/characters/{char_id}/videos/{state}/{state}.seed.txt
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

from lib import budget
from lib.art_styles import get_preset
from lib.keyframes import get_keyframes, playback_for_state
from lib.sprite import find_project_root


DEFAULT_DURATION_S = 5.0
DEFAULT_FPS = 24
DEFAULT_ASPECT = "1:1"  # most img2vid backends prefer square; we extract + recompose


def load_character(project_root: Path, char_id: str) -> dict:
    sprites_file = project_root / "assets" / "sprites.json"
    sprites_data = json.loads(sprites_file.read_text(encoding="utf-8"))
    for sprite in sprites_data:
        if sprite.get("id") == char_id:
            return sprite
    raise SystemExit(f"Character '{char_id}' not found in {sprites_file}")


def read_active_backend(project_root: Path) -> str:
    env = os.environ.get("VIDEO_BACKEND")
    if env:
        return env.strip().lower()
    active_file = project_root / ".converge" / "skills" / "video-generate" / "backends" / "ACTIVE"
    if not active_file.exists():
        raise SystemExit(
            f"No video backend configured: {active_file} missing. "
            f"Write a backend name (e.g. 'stub') to that file."
        )
    name = active_file.read_text().strip().lower()
    if not name:
        raise SystemExit(f"{active_file} is empty.")
    return name


def build_motion_prompt(
    *,
    char_name: str,
    state: str,
    palette: str,
    palette_constraints: str,
    canonical_angle: str,
    keyframes: list[str],
    art_style: str | None,
    duration_s: float,
    frame_rate: int,
    yoyo: bool,
    compact: bool = False,
) -> str:
    """Translate the 8 grid keyframes into a single continuous motion narration.

    The image-gen pipeline asks the model to draw 8 stills in a grid — here
    we ask the video model to play those 8 poses back as one smooth cycle.

    Set `compact=True` for backends that cap prompts (e.g. Kling at 2500 chars).
    Compact mode drops the structured spec, the 8 inline beats, and the
    redundant style descriptions; keeps the hard-lock language and a single-
    sentence motion summary.
    """
    preset = get_preset(art_style)
    n = len(keyframes)

    if compact:
        return _build_compact_prompt(
            char_name=char_name,
            state=state,
            palette=palette,
            palette_constraints=palette_constraints,
            canonical_angle=canonical_angle,
            keyframes=keyframes,
            art_style_label=preset["style_name"],
            duration_s=duration_s,
            yoyo=yoyo,
        )

    pose_lines = [
        f"  Beat {i + 1}/{n} (~{(duration_s * i / max(n - 1, 1)):.2f}s): {kf}"
        for i, kf in enumerate(keyframes)
    ]
    poses_block = "\n".join(pose_lines)

    loop_clause = (
        "The motion is non-directional (breathing / sway / hover). It is a SHORT CYCLIC LOOP "
        "that completes ONE FULL PERIOD over the duration of this clip — not a slow drift, not "
        "a freeze. The character should clearly inhale and exhale (or sway and return) within "
        "the clip's runtime. The final pose lands back on the opening pose."
        if yoyo
        else "The motion is directional but cyclic (one stride, one strike, one leap that "
             "returns to the start). It must complete ONE FULL CYCLE within the clip's runtime "
             "— left-step + right-step for a walk, draw + release for an attack, crouch + jump "
             "+ land for a leap. Do not freeze, do not drift slowly, do not stall mid-pose. The "
             "final pose lands back on the opening pose so the clip can loop seamlessly."
    )

    palette_block = (
        f"PALETTE (hold these colors fixed for every frame): {palette_constraints or palette}"
        if (palette_constraints or palette)
        else f"PALETTE: follow the {preset['style_name']} preset's guidance — {preset.get('palette_guidance', '')}"
    )

    return textwrap.dedent(f"""\
        Animate the character shown in the reference image performing a {state} cycle. The reference image IS frame zero — do not reinvent the character, the costume, the proportions, or the face. The character is {char_name}.

        ART STYLE (mandatory, hold across every frame): {preset['style_description']}

        CAMERA AND VIEWPOINT (HARD LOCK — read carefully):
        - The viewing angle is {canonical_angle}. The character is shown from this exact angle in EVERY frame.
        - The character does NOT rotate, turn, pivot, spin, or change which way it faces. If frame 1 shows the character from {canonical_angle}, frame N also shows the character from {canonical_angle}. There is no walk-around shot, no turn-toward-camera, no profile-to-front transition.
        - The camera is bolted to a tripod. No pan, no zoom, no dolly, no orbit, no tilt, no rack focus, no breathing camera, no parallax.
        - The character stays centered horizontally at the same scale throughout. The ground line (where feet stand) is at the same Y in every frame.
        - This is a sprite-sheet animation cycle, not a cinematic shot.

        CHARACTER SIZE (HARD LOCK):
        - The character occupies the SAME pixel height and width region in every frame. Do not scale, zoom, or resize the character between frames — only the body parts that animate (chest rising, arm swinging, foot lifting) move. The character's outline silhouette stays roughly the same overall size from frame 1 to frame N.
        - Do not push the character toward or away from the camera. The feet stay anchored to the same ground line.

        BACKGROUND: pure flat chroma green (#00FF00) across the entire frame — the reference image is ALREADY on this green background, do not change it. No shadows, no gradients, no ground plane, no environment. Every non-character pixel stays solid #00FF00 in every frame. We will chroma-key it to transparent in post.

        DURATION: {duration_s:.2f} seconds at {frame_rate} fps. The clip must contain ONE COMPLETE animation cycle — start pose → motion arc → return to start pose — within this runtime. Do not stretch the motion, do not stall, do not pad with held poses. {loop_clause}

        BOOKEND CONSTRAINT (HARD): the FIRST frame and the LAST frame of this clip are BOTH the supplied reference image — the same pose, the same hand positions, the same accessories visible. The cycle starts at this pose, departs through the motion beats below, and returns to the EXACT same pose at the end so the clip can loop seamlessly. Frame N (final) must be visually indistinguishable from frame 0 (initial).

        MOTION (the cycle is one continuous arc — these are intermediate beats, not snapshots):
        {poses_block}

        {palette_block}

        IDENTITY (HARD LOCK — the reference image is the ONLY source of truth):
        - Every frame shows the SAME character — same face, same head shape, same proportions, same colors.
        - DO NOT ADD anything that is not visible in the reference image. If the reference has no helmet, the character does NOT wear a helmet at any point. If the reference shows a plain shield, the shield stays plain — do not add emblems, crests, insignia, or decorative trim. If the reference shows a specific hairstyle, it stays exactly that hairstyle.
        - DO NOT REMOVE anything the reference shows. Whatever clothing, accessories, weapons, or props are visible in the reference must stay attached, in the same hand/position, in every frame. Nothing dissolves, swaps hands, or fades.
        - DO NOT MODIFY costume textures. No restyling shields, no recoloring armor, no morphing capes into new shapes, no changing belt buckle designs.
        - The animation is small body motion only (limbs moving, breathing, stride). Costume and accessories stay 100% identical to frame 0 throughout.
        - No outfit changes, no morphing, no extra characters appearing, no weapon transformations, no hair-color shifts.

        QUALITY: smooth, fluid motion with subtle inertia and weight. No flicker, no flashing, no morphing artifacts, no text overlays, no logos, no UI, no captions, no watermarks. The character stays whole and visible at all times — never cropped at the head, never stepping out of frame.
    """).strip()


# Used as Veo's negative_prompt — concrete failure modes we've seen plus the
# generic "no video crap" list. Veo accepts free-form negative text and
# weights it against the positive prompt.
def _build_compact_prompt(
    *,
    char_name: str,
    state: str,
    palette: str,
    palette_constraints: str,
    canonical_angle: str,
    keyframes: list[str],
    art_style_label: str,
    duration_s: float,
    yoyo: bool,
) -> str:
    """Sub-2500-char prompt for short-context backends (Kling).

    Drops the structured spec, the per-beat narration, and the long art-style
    description. Keeps camera/identity hard-locks, a one-sentence motion
    summary, and a palette line.
    """
    motion_kind = (
        "non-directional cycle (breathing/sway/hover)"
        if yoyo
        else "directional cycle (e.g. one full walk stride, one attack swing) that returns to start"
    )
    motion_summary = _summarize_keyframes(keyframes, state)
    palette_line = palette_constraints or palette or f"follow the {art_style_label} style"

    return textwrap.dedent(f"""\
        Animate the supplied character ({char_name}) performing one full {state} cycle. The reference image IS frame 0; do not reinvent the character, costume, or proportions.

        CAMERA: locked at {canonical_angle}. No rotation, no pan, no zoom, no dolly. The character does not turn or change which way it faces. Sprite-sheet style, not cinematic.

        SIZE: character occupies the same pixel region in every frame. No scale drift, no forward/back motion. Feet on the same ground line throughout.

        BACKGROUND: pure flat #00FF00 chroma green; the reference is already on this. Every non-character pixel stays solid green. No shadows, no environment.

        MOTION: {motion_summary}. {motion_kind.capitalize()}; ~{duration_s:.0f}s, ONE complete cycle, final frame matches frame 0 for seamless looping. Do not freeze, do not stall, do not pad.

        IDENTITY (HARD LOCK — read carefully):
        - The reference image is the ONLY source of truth for what the character looks like. Every accessory, hairstyle, costume detail, color, proportion, and silhouette must match the reference exactly.
        - DO NOT ADD anything that is not in the reference. If the reference has no helmet, the character does NOT wear a helmet at any point. If the reference shows specific hair, it stays that hair. If the shield in the reference is plain, it stays plain — do not add emblems, crests, or insignia.
        - DO NOT REMOVE anything in the reference. Cape, sword, armor pieces, belt, all visible details persist in every frame.
        - DO NOT MODIFY costume details. Don't restyle the shield, don't change cape shape, don't morph face features, don't recolor anything.
        - The animation is small body motion (limbs, breathing, stride). Costume and accessories stay 100% identical to frame 0.

        PALETTE: {palette_line}.

        QUALITY: smooth motion, clean silhouette, no text, no captions, no UI, no logos. Character whole and visible at all times.
    """).strip()


def _summarize_keyframes(keyframes: list[str], state: str) -> str:
    """One-line distillation of the 8 inline beats. Picks the most descriptive
    fragment from the first and middle keyframes so the model gets the gist
    without 3000 chars of beat-by-beat detail.
    """
    if not keyframes:
        return f"a clean {state} animation cycle"
    first = keyframes[0].split(" — ", 1)[-1].split(".")[0]
    mid = keyframes[len(keyframes) // 2].split(" — ", 1)[-1].split(".")[0]
    return f"start at {first.lower()}, peak at {mid.lower()}, return to start"


NEGATIVE_PROMPT = (
    # Costume / identity hallucinations (the big one for Grok)
    "adding helmet, adding hat, adding crown, adding mask, adding cape if "
    "absent, adding shield emblem, adding crest, adding insignia, adding "
    "armor pieces, adding shoulder pads, adding gauntlets, restyling shield, "
    "morphing costume, costume change, accessory appearing, accessory not in "
    "reference, hairstyle change, hair color change, face morphing, "
    "proportions changing, identity drift, "
    # Camera / framing
    "character rotating, character turning toward camera, character pivoting, "
    "walk-around shot, orbit shot, camera pan, camera zoom, camera dolly, "
    "camera tilt, rack focus, change of viewing angle, switching from side "
    "view to front view, "
    # Scale / motion
    "character size changing, character growing larger, character shrinking, "
    "character moving toward camera, character moving away from camera, "
    "breathing zoom, scale jitter, motion that doesn't loop, freeze frame, "
    "slow drift, held pose, stalled motion, half cycle, incomplete "
    "animation, "
    # Costume removal
    "character disappearing, weapon disappearing, sword vanishing, shield "
    "vanishing, cape vanishing, helmet coming off, accessory swapping "
    "hands, outfit changing, color shifts, palette drift, "
    # Composition
    "extra characters, duplicate characters, environment, ground plane, "
    "shadows on the ground, sky, trees, buildings, props in background, "
    # Overlays
    "text, captions, subtitles, watermarks, logos, UI overlays, frame "
    "borders, vignette, lens flare, motion blur trails, ghosting, flicker, "
    "strobing"
)


def call_backend(
    project_root: Path,
    backend: str,
    payload: dict,
) -> dict:
    """Invoke the active video-generate backend.

    Backends can be implemented in either JavaScript (`generate.js`, called
    via a Node subprocess) or Python (`generate.py`, called as a subprocess
    that takes JSON on stdin and writes JSON on stdout). JS-first to mirror
    the cinematic-video-production convention; Python supported because the
    Gemini/Veo path uses google-genai which is already a Python dep here.
    """
    backend_dir = (
        project_root / ".converge" / "skills" / "video-generate" / "backends" / backend
    )
    js_path = backend_dir / "generate.js"
    py_path = backend_dir / "generate.py"

    if py_path.exists():
        proc = subprocess.run(
            [sys.executable, str(py_path)],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            cwd=str(project_root),
            check=False,
        )
    elif js_path.exists():
        # Minimal Node shim: import the backend and call generate(input). Pipe
        # the input as JSON on stdin and read the result as JSON on stdout.
        shim = textwrap.dedent(f"""\
            import {{ generate }} from {json.dumps(str(js_path))};
            let stdin = '';
            process.stdin.on('data', (c) => (stdin += c));
            process.stdin.on('end', async () => {{
              try {{
                const input = JSON.parse(stdin);
                const out = await generate(input);
                process.stdout.write(JSON.stringify(out));
              }} catch (e) {{
                process.stderr.write('backend error: ' + (e && e.stack || e) + '\\n');
                process.exit(1);
              }}
            }});
        """)
        proc = subprocess.run(
            ["node", "--input-type=module", "-e", shim],
            input=json.dumps(payload),
            capture_output=True,
            text=True,
            cwd=str(project_root),
            check=False,
        )
    else:
        raise SystemExit(
            f"Backend script not found in {backend_dir} (looked for generate.py and generate.js)."
        )

    if proc.returncode != 0:
        raise SystemExit(f"video backend failed:\n{proc.stderr}")
    if proc.stderr.strip():
        sys.stderr.write(proc.stderr)
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        raise SystemExit(f"backend returned invalid JSON: {proc.stdout!r}") from e


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("char_id")
    ap.add_argument("state")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--duration", type=float, default=DEFAULT_DURATION_S)
    ap.add_argument("--fps", type=int, default=DEFAULT_FPS)
    ap.add_argument("--aspect", default=DEFAULT_ASPECT)
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())
    char = load_character(project_root, args.char_id)

    char_name = char["name"]
    palette = char.get("palette", "")
    palette_constraints = char.get("palette_constraints", "")
    canonical_angle = char.get("canonical_angle", "side_right")
    art_style = char.get("art_style")

    keyframes = get_keyframes(args.state)
    if not keyframes:
        raise SystemExit(f"No keyframes defined for state '{args.state}'")

    playback = playback_for_state(args.state)

    canonical_path = (
        project_root / "assets" / "characters" / args.char_id / "ref" / "canonical" / "canonical.png"
    )
    if not canonical_path.exists():
        raise SystemExit(
            f"Canonical reference not found: {canonical_path}\n"
            f"Run first: python scripts/generate_character_angles.py {args.char_id}"
        )

    out_dir = project_root / "assets" / "characters" / args.char_id / "videos" / args.state
    out_dir.mkdir(parents=True, exist_ok=True)
    video_path = out_dir / f"{args.state}.mp4"
    prompt_path = out_dir / f"{args.state}.prompt.txt"
    seed_path = out_dir / f"{args.state}.seed.txt"

    backend = read_active_backend(project_root)
    # Use the compact prompt for backends that cap prompt length or simply
    # don't need the full beat-by-beat detail. Kling caps at 2500 chars
    # outright; Grok accepts long prompts but quality is similar with the
    # compact form. Veo and stub get the full prompt.
    compact = backend in ("kling", "grok")

    prompt = build_motion_prompt(
        char_name=char_name,
        state=args.state,
        palette=palette,
        palette_constraints=palette_constraints,
        canonical_angle=canonical_angle,
        keyframes=keyframes,
        art_style=art_style,
        duration_s=args.duration,
        frame_rate=playback["frameRate"],
        yoyo=playback["yoyo"],
        compact=compact,
    )
    prompt_path.write_text(prompt, encoding="utf-8")
    sys.stderr.write(f"  prompt: {len(prompt)} chars (compact={compact})\n")
    canonical_rel = str(canonical_path.relative_to(project_root))
    payload = {
        "first_frame_image": canonical_rel,
        # Same image as first AND last frame: forces the cycle to land where
        # it started so the loop seam is clean. Backends that don't support
        # bookend interpolation should silently ignore last_frame_image.
        "last_frame_image": canonical_rel,
        "prompt": prompt,
        "negative_prompt": NEGATIVE_PROMPT,
        "duration_s": args.duration,
        "aspect_ratio": args.aspect,
        "fps": args.fps,
        "output_path": str(video_path.relative_to(project_root)),
    }
    if args.seed is not None:
        payload["seed"] = args.seed

    cost = budget.cost_for_video(args.duration, backend)

    print(
        f"[{args.char_id}] generating {args.state} video ({args.duration}s @ {args.fps}fps) "
        f"backend={backend} cost={cost}¢",
        file=sys.stderr,
    )

    # `charged` provisionally records the spend on enter, refunds on exception.
    # 429 quota errors don't consume compute, so we don't want them in the log.
    with budget.charged(project_root, cost, f"video-{backend}",
                        note=f"{args.char_id}/{args.state} {args.duration}s"):
        result = call_backend(project_root, backend, payload)

    seed_used = result.get("seed", "")
    seed_path.write_text(str(seed_used), encoding="utf-8")

    print(
        f"  wrote {video_path.relative_to(project_root)} "
        f"(model={result.get('model')}, seed={seed_used})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
