"""Solid-color background removal — color matting (+ optional BiRefNet soft mask).

Ported from godogen (https://github.com/htdt/godogen — `shared/skills/godogen/
tools/rembg_matting.py`). The original combines a physical compositing-based
alpha (lower bound on opacity given a known background color) with a soft
mask from rembg+BiRefNet, auto-selecting one of three regimes based on
mask coverage.

Differences from the godogen source:
  - rembg is optional. If `import rembg` fails, we run pure color matting
    (regime=color) — which is still much better than naive chroma-key thanks
    to recover_foreground decontaminating fringe pixels.
  - bg_color may be passed once and reused across a batch (extract_video_frames
    samples it from the first frame and applies to all 24, so per-frame
    drift in Veo's output doesn't break consistency).
  - Library only (no CLI), called directly from Python.

Why this is better than `lib.image_api_gemini.ensure_transparent_background`:
  1. Decontamination — fringe pixels (e.g. cape edges that picked up green
     spill) get the green channel reduced to max(R,B), so colored halos go
     away in the output RGB, not just the alpha.
  2. Auto-detected bg color — works whether prompt produced #00FF00,
     medium-gray, dark-green, etc.
  3. Compositing-equation alpha — physically grounded lower bound on
     opacity, so semi-transparent edges (cape wisps, hair strands) get
     correct alpha rather than binary cutout.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image


# Mask coverage thresholds for regime auto-detection (BiRefNet path)
MASK_MIN_PCT = 5.0
MASK_MAX_PCT = 70.0
MASK_MIN_PX = 100

DEFAULTS = {
    "trust": {"bg_thresh": 0.05, "fg_thresh": 1.0},
    "adapt": {"bg_thresh": 0.05, "fg_thresh": 0.20},
    "color": {"bg_thresh": 0.10, "fg_thresh": 0.10},
}


# --- rembg session (optional) -----------------------------------------------

def _try_create_rembg_session(model: str = "birefnet-general"):
    """Return a rembg session or None if rembg/onnxruntime isn't installed."""
    try:
        from rembg import new_session
    except Exception:
        return None
    try:
        # Prefer GPU if onnxruntime advertises it.
        try:
            import onnxruntime as ort
            providers = []
            if "CUDAExecutionProvider" in ort.get_available_providers():
                providers.append("CUDAExecutionProvider")
            providers.append("CPUExecutionProvider")
        except Exception:
            providers = ["CPUExecutionProvider"]
        return new_session(model, providers=providers)
    except Exception as e:
        sys.stderr.write(f"  matting: rembg session creation failed ({e}); using color-only.\n")
        return None


_session_cache: dict = {}


def get_session(model: str = "birefnet-general"):
    """Cached session getter so a batch run pays the load cost once."""
    if model not in _session_cache:
        _session_cache[model] = _try_create_rembg_session(model)
    return _session_cache[model]


def get_soft_mask(img_pil: Image.Image, session) -> np.ndarray | None:
    """Return a 0–1 float soft mask, or None if rembg isn't available."""
    if session is None:
        return None
    try:
        from rembg import remove
        mask_pil = remove(img_pil, session=session, only_mask=True, post_process_mask=False)
        return np.array(mask_pil, dtype=np.float64) / 255.0
    except Exception as e:
        sys.stderr.write(f"  matting: rembg.remove failed ({e}); falling back to color-only.\n")
        return None


# --- Color matting math (always available) ----------------------------------

def sample_bg_color(img: np.ndarray, block: int = 16) -> np.ndarray:
    """Median color from larger corner patches.

    Median (not mean) is more robust to slight per-pixel chroma variation
    in real video frames — Veo's "solid green" actually wobbles between
    e.g. (8,247,17) and (28,228,21), and the mean of those produces a
    bg estimate that doesn't match either pixel cleanly. Median picks the
    central tendency, which paired with a tolerance ramp in
    compute_alpha_color produces clean cutouts.

    Returns a float64 RGB in [0,1].
    """
    corners = np.concatenate([
        img[:block, :block].reshape(-1, 3),
        img[:block, -block:].reshape(-1, 3),
        img[-block:, :block].reshape(-1, 3),
        img[-block:, -block:].reshape(-1, 3),
    ])
    return np.median(corners, axis=0)


def sample_bg_tolerance(img: np.ndarray, block: int = 16) -> np.ndarray:
    """Per-channel tolerance band measured as the spread of corner samples.
    Used to widen the bg "cube" so jittery solid-color bgs key out cleanly.
    """
    corners = np.concatenate([
        img[:block, :block].reshape(-1, 3),
        img[:block, -block:].reshape(-1, 3),
        img[-block:, :block].reshape(-1, 3),
        img[-block:, -block:].reshape(-1, 3),
    ])
    p5 = np.percentile(corners, 5, axis=0)
    p95 = np.percentile(corners, 95, axis=0)
    return np.maximum(p95 - p5, 0.02)  # at least 2% slack per channel


def compute_alpha_color(
    img: np.ndarray,
    bg_color: np.ndarray,
    tolerance: np.ndarray | None = None,
) -> np.ndarray:
    """Physical lower bound on alpha from compositing equation.

    pixel = α * fg + (1-α) * bg, with fg in [0,1], so for each channel
    α >= max(diff_c, 0) / (1 - bg_c)  AND  α >= max(-diff_c, 0) / bg_c.

    `tolerance` widens the bg "cube" — diffs within ±tolerance count as zero
    so jittery solid-color bgs (Veo's chroma green isn't pixel-perfect)
    don't produce false alpha. If None, defaults to a tiny 0.02 per channel.
    """
    if tolerance is None:
        tolerance = np.full(3, 0.02, dtype=np.float64)
    diff = img - bg_color[None, None, :]
    # Soft-deadband: subtract tolerance from absolute diff. Anything within
    # bg_color ± tolerance produces zero alpha contribution from that channel.
    pos = np.maximum(diff - tolerance[None, None, :], 0.0)
    neg = np.maximum(-diff - tolerance[None, None, :], 0.0)
    alpha = np.zeros(img.shape[:2], dtype=np.float64)
    for c in range(3):
        denom_hi = max(1.0 - bg_color[c] - tolerance[c], 0.05)
        denom_lo = max(bg_color[c] - tolerance[c], 0.05)
        alpha = np.maximum(alpha, pos[:, :, c] / denom_hi)
        alpha = np.maximum(alpha, neg[:, :, c] / denom_lo)
    return np.clip(alpha, 0.0, 1.0)


def recover_foreground(img: np.ndarray, alpha: np.ndarray, bg_color: np.ndarray) -> np.ndarray:
    """Undo background compositing: fg = (pixel - (1-α)·bg) / α.

    Decontaminates fringe pixels — colored bg leak in semi-transparent edges
    is reversed so the output RGB doesn't show a halo.
    """
    a = alpha[:, :, np.newaxis]
    bg = bg_color[np.newaxis, np.newaxis, :]
    safe_a = np.where(a > 0.02, a, 1.0)
    fg = np.clip((img - (1.0 - a) * bg) / safe_a, 0.0, 1.0)
    fg[alpha < 0.02] = 0.0
    return fg


def despill(fg: np.ndarray, alpha: np.ndarray, bg_color: np.ndarray) -> np.ndarray:
    """Cap any channel that dominates the bg color.

    `recover_foreground` only fixes pixels with high enough alpha to "undo"
    the bg blend. Pixels at the character outline often have lower alpha
    *and* heavy green leak (the antialiased outline pixels are partly green-bg).
    The compositing math leaves them as dark-green opaque pixels — they
    show up as a visible halo around the character.

    This pass identifies which channel dominates the bg (typically green for
    chroma-key #00FF00) and caps it at `max(other_channels) + slack` for
    every fg pixel. Effectively: if green is the bg, no fg pixel is allowed
    to be more green than its red/blue neighbors plus a small tolerance.

    Tunable: `slack` of 0.06 (~15/255) lets natural green tints survive
    (foliage, painted shading) while killing pure bg-leak halos.
    """
    bg_max_idx = int(np.argmax(bg_color))  # which channel is the bg dominantly
    bg_max_val = bg_color[bg_max_idx]
    if bg_max_val < 0.5:
        # Bg isn't strongly chromatic (e.g. dark gray) — no single channel
        # dominates so per-channel despill would be too aggressive.
        return fg

    other_channels = [c for c in range(3) if c != bg_max_idx]
    other_max = np.maximum(fg[..., other_channels[0]], fg[..., other_channels[1]])

    slack = 0.06
    capped = np.minimum(fg[..., bg_max_idx], other_max + slack)
    out = fg.copy()
    out[..., bg_max_idx] = np.where(alpha > 0.02, capped, fg[..., bg_max_idx])
    return out


def detect_regime(mask_soft: np.ndarray) -> str:
    """Auto-pick regime from BiRefNet mask coverage."""
    mask_fg = (mask_soft > 0.5).sum()
    pct = mask_fg / mask_soft.size * 100
    if mask_fg < MASK_MIN_PX or pct < MASK_MIN_PCT:
        return "color"
    if pct > MASK_MAX_PCT:
        return "adapt"
    return "trust"


# --- High-level entry points -------------------------------------------------

def remove_background_array(
    img_rgb: np.ndarray,
    img_pil: Image.Image,
    *,
    bg_color: np.ndarray | None = None,
    regime: str = "auto",
    bg_thresh: float | None = None,
    fg_thresh: float | None = None,
    session=None,
) -> tuple[np.ndarray, np.ndarray, str]:
    """Run the full hybrid pipeline. Returns (rgba_uint8, bg_color_used, regime_used).

    Inputs:
      img_rgb — float64 RGB array in [0,1], shape (H, W, 3).
      img_pil — same image as PIL RGBA (rembg wants PIL).
      bg_color — optional override. If None, sampled from corners.
      session — cached rembg session, or None for color-only.

    The bg_color return value lets the caller cache it across a batch.
    """
    if bg_color is None:
        bg_color = sample_bg_color(img_rgb)
    tolerance = sample_bg_tolerance(img_rgb)
    alpha_color = compute_alpha_color(img_rgb, bg_color, tolerance=tolerance)
    mask_soft = get_soft_mask(img_pil, session=session) if session is not None else None

    if mask_soft is None:
        regime = "color"
    elif regime == "auto":
        regime = detect_regime(mask_soft)

    bt = bg_thresh if bg_thresh is not None else DEFAULTS[regime]["bg_thresh"]
    ft = fg_thresh if fg_thresh is not None else DEFAULTS[regime]["fg_thresh"]

    if regime == "color" or mask_soft is None:
        # Color-only: ramp alpha hard. Below bg_thresh -> 0; above fg_floor -> 1;
        # narrow soft band between. Without a foreground mask, color matting
        # leaves much of the character semi-transparent (any green tint reduces
        # alpha), so we lift everything above fg_floor to opaque.
        fg_floor = max(ft, 0.5)  # color-mode default ft=0.10; lift to 0.5 so fg is solid
        alpha = np.where(alpha_color < bt, 0.0, alpha_color)
        alpha = np.where(alpha_color > fg_floor, 1.0,
                         (alpha - bt) / max(fg_floor - bt, 1e-6))
        alpha = np.clip(alpha, 0.0, 1.0)
    elif regime == "trust":
        is_bg = (alpha_color < bt) | (mask_soft < 0.05)
        alpha = np.where(is_bg, alpha_color, np.maximum(alpha_color, mask_soft))
    else:  # adapt
        thresh = bt + mask_soft * (ft - bt)
        is_bg = alpha_color < thresh
        alpha = np.where(is_bg, alpha_color, np.maximum(alpha_color, mask_soft))

    alpha[alpha < 0.01] = 0.0
    fg = recover_foreground(img_rgb, alpha, bg_color)
    fg = despill(fg, alpha, bg_color)

    # Belt-and-suspenders: any pixel whose dominant-bg-channel still wildly
    # exceeds the other channels is fg leak from the matting threshold being
    # too loose. Push its alpha to 0 so it disappears entirely (no halo).
    bg_max_idx = int(np.argmax(bg_color))
    if bg_color[bg_max_idx] >= 0.5:
        other_idx = [c for c in range(3) if c != bg_max_idx]
        other_max = np.maximum(img_rgb[..., other_idx[0]], img_rgb[..., other_idx[1]])
        residual = img_rgb[..., bg_max_idx] - other_max  # >0 means bg-dominant
        # Kill alpha for any pixel still strongly bg-dominant (residual > 0.20)
        # and not already opaque-confident from a soft mask.
        kill = residual > 0.20
        if mask_soft is not None:
            kill = kill & (mask_soft < 0.5)
        alpha[kill] = 0.0
        fg[kill] = 0.0

    h, w = img_rgb.shape[:2]
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, :3] = (fg * 255).clip(0, 255).astype(np.uint8)
    out[:, :, 3] = (alpha * 255).clip(0, 255).astype(np.uint8)
    return out, bg_color, regime


def matte_in_place(
    path: Path,
    *,
    bg_color: np.ndarray | None = None,
    regime: str = "auto",
    session=None,
    preview: bool = False,
) -> tuple[np.ndarray, str]:
    """Read an image, run the matte, write the RGBA back. Returns
    (bg_color_used, regime_used) so the caller can cache them.

    If `preview` is True, also writes `<path>_qa.png` — a composite on a
    contrasting solid color (white if bg dark, black if bg light). Necessary
    for visually verifying alpha (transparent areas don't render in many
    viewers).
    """
    img_pil = Image.open(path).convert("RGBA")
    # Skip if fully transparent (placeholder frame)
    if img_pil.mode == "RGBA":
        alpha_extrema = img_pil.split()[-1].getextrema()
        if alpha_extrema == (0, 0):
            return (bg_color if bg_color is not None else np.zeros(3)), "skipped-empty"

    img_rgb = np.array(img_pil.convert("RGB"), dtype=np.float64) / 255.0
    out, bg_used, regime_used = remove_background_array(
        img_rgb, img_pil, bg_color=bg_color, regime=regime, session=session,
    )
    Image.fromarray(out).save(path, format="PNG")

    if preview:
        _write_qa_preview(out, path, bg_used)

    return bg_used, regime_used


def _write_qa_preview(rgba: np.ndarray, output_path: Path, bg_color: np.ndarray) -> Path:
    """Write a `<stem>_qa.png` composite on a contrasting solid color so
    the alpha can be visually verified."""
    lum = 0.299 * bg_color[0] + 0.587 * bg_color[1] + 0.114 * bg_color[2]
    qa_rgb = (0, 0, 0) if lum > 0.5 else (255, 255, 255)
    img_rgba = Image.fromarray(rgba)
    bg_layer = Image.new("RGBA", img_rgba.size, qa_rgb + (255,))
    bg_layer.paste(img_rgba, mask=img_rgba.split()[3])
    preview_path = output_path.with_stem(output_path.stem + "_qa")
    bg_layer.convert("RGB").save(preview_path)
    return preview_path
