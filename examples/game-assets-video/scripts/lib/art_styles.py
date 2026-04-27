"""
Art-style presets — pick one global aesthetic for the whole library.

Used by lib/prompts.build_grid_prompt and the per-asset generation scripts
to bias the model toward a specific look. Switch the active preset in one
place (DEFAULT_PRESET below, or pass `style="..."` per-asset in a manifest)
and every regenerated sheet will adopt that look.

Each preset has four fields:

  style_name             : machine-readable id passed in the structured
                           spec block (the model can pattern-match it)
  style_description      : prose paragraph with concrete visual references
                           — this is what actually steers the model
  palette_guidance       : default palette language used when a manifest
                           entry doesn't override `palette` itself
  negative_directives    : list of "do NOT" clauses that ride along in
                           the prompt's critical instructions section
"""

from __future__ import annotations


PRESETS: dict[str, dict] = {
    # ----- DEFAULT: warm, modern, indie cute --------------------------------
    "ghibli_modern_indie": {
        "style_name": "modern_indie_ghibli_inspired",
        "style_description": (
            "Modern hand-drawn 2D game art in the spirit of Studio Ghibli "
            "and contemporary indie titles like Hollow Knight, Hades, "
            "Spiritfarer, Cuphead, and Ori and the Blind Forest. "
            "Soft painterly shading, gentle gradients, clean rounded "
            "silhouettes, expressive eyes and faces, warm storybook "
            "lighting. Characters have appealing proportions (slightly "
            "stylized: larger heads, simplified bodies) and read as "
            "friendly and inviting at first glance. Color is rich and "
            "saturated but not garish — think watercolor + ink, not "
            "pixel art. Edges are smooth (no jaggies). Subtle ambient "
            "rim light hints at depth without heavy shadows."
        ),
        "palette_guidance": (
            "Modern saturated palette with painterly gradients (NOT a "
            "fixed 16-color limit). Use subtle color variation within "
            "each material — e.g. armor highlights pick up sky/ambient "
            "tints. Skin tones are warm and natural."
        ),
        "negative_directives": [
            "Do NOT produce pixel art, 8-bit, or 16-bit retro game graphics",
            "Do NOT use a hard-edged limited color palette, dithering, "
            "or visible chunky pixels",
            "Do NOT use the chunky aliased outlines typical of NES/SNES sprites",
        ],
    },

    # ----- Modern pixel art (still cute, but pixel-based) -------------------
    "modern_pixel_chunky": {
        "style_name": "modern_indie_pixel_art",
        "style_description": (
            "Modern indie pixel art in the style of Stardew Valley, "
            "Celeste, Dead Cells, and Eastward — chunky pixel resolution "
            "but with rich saturated palettes, soft anti-aliasing on "
            "interior shading, and expressive character silhouettes. "
            "Friendlier and warmer than NES/SNES retro pixel art."
        ),
        "palette_guidance": (
            "Saturated, modern indie palette — think Stardew or Celeste, "
            "not NES. ~32–48 colors per scene with subtle gradients."
        ),
        "negative_directives": [
            "Do NOT produce harsh 16-color NES/SNES retro art",
            "Do NOT use hard 1-pixel black outlines on every shape",
        ],
    },

    # ----- Disney-vector (cute, smooth, 2D animation feel) ------------------
    "disney_vector_cute": {
        "style_name": "disney_inspired_vector_2d",
        "style_description": (
            "Cute, modern 2D vector character art in the spirit of "
            "Disney shorts, Adventure Time, Steven Universe, and "
            "Cuphead's pose work. Bold flat colors with one or two soft "
            "shading layers, smooth curves, expressive cartoony "
            "proportions (big head, simplified hands, dot eyes or "
            "anime-style highlight eyes). Reads as a character from a "
            "modern animated film/show."
        ),
        "palette_guidance": (
            "Bold, vibrant flat colors with confident hue contrast. "
            "Two-tone shading per material (base + soft shadow); avoid "
            "complex gradients."
        ),
        "negative_directives": [
            "Do NOT produce realistic, photographic, or painterly art",
            "Do NOT use pixel art or chunky pixels",
        ],
    },

    # ----- Hollow Knight / Cuphead — moody hand-drawn -----------------------
    "hand_drawn_moody": {
        "style_name": "hand_drawn_silhouette_indie",
        "style_description": (
            "Hand-drawn 2D character art in the moodier indie tradition "
            "of Hollow Knight, Cuphead, and Don't Starve. Strong inked "
            "silhouettes, expressive line weight, painterly interior "
            "shading, slightly off-kilter proportions. Reads as charming "
            "and memorable rather than purely cute."
        ),
        "palette_guidance": (
            "Cool, slightly desaturated palette with strong silhouette "
            "darks. Color accents pop against muted base tones."
        ),
        "negative_directives": [
            "Do NOT produce pixel art",
            "Do NOT produce realistic / 3D-rendered art",
        ],
    },

    # ----- Ori-style painterly luminous -------------------------------------
    "ori_painterly_luminous": {
        "style_name": "painterly_luminous_indie",
        "style_description": (
            "Painterly 2D character art in the style of Ori and the "
            "Blind Forest, Gris, and Spiritfarer — soft luminous "
            "rim-lighting, watercolor-textured interior shading, "
            "ethereal color palette, characters glow gently against "
            "rich atmospheric backgrounds. Ultra-smooth edges, no "
            "outlines, color does the work of defining form."
        ),
        "palette_guidance": (
            "Luminous painterly palette — soft saturated mids with "
            "bright rim highlights and deep atmospheric darks. "
            "Subtle hue shifting between light and shadow."
        ),
        "negative_directives": [
            "Do NOT produce pixel art or vector flat-fill art",
            "Do NOT use hard black outlines",
        ],
    },
}


# Switch this to change the project's default look in one place. Per-asset
# overrides via a manifest's `art_style` field still win.
DEFAULT_PRESET = "ghibli_modern_indie"


def get_preset(name: str | None = None) -> dict:
    """Return a preset dict by name; falls back to DEFAULT_PRESET if name
    is None or unknown. Raises only if DEFAULT_PRESET itself is missing
    (a programming error)."""
    if name and name in PRESETS:
        return PRESETS[name]
    return PRESETS[DEFAULT_PRESET]


def list_presets() -> list[str]:
    return list(PRESETS.keys())


def style_clause(name: str | None = None) -> str:
    """A short paragraph + negatives, ready to drop into any prompt.

    Used by the canonical-angle, secondary-ref, background, and tile
    generators which build prompts inline rather than via build_grid_prompt.
    """
    p = get_preset(name)
    negatives = "\n".join(f"- {d}" for d in p.get("negative_directives", []))
    return (
        f"ART STYLE (mandatory): {p['style_description']}\n\n"
        f"Palette: {p['palette_guidance']}\n\n"
        f"Negative directives:\n{negatives}\n"
    )
