"""Per-frame pose descriptions for animation cycles.

Used by generate_spritesheet.py — Gemini draws the whole horizontal strip in
one call, and we list each keyframe pose inline in the prompt so it knows
what to draw in each frame slot.

Add new states here when the playbook expands beyond idle/walk.
"""

from __future__ import annotations


KEYFRAMES: dict[str, list[str]] = {
    # Walk: 8 frames spanning a full L/R cycle. Each entry is a SMALL
    # increment along a continuous arc — adjacent entries should look
    # 80–90% identical, with only the limbs in motion shifting by a
    # quarter-stride or less. The model treats the grid as 8 isolated
    # poses unless we tell it (via prose AND prompt language) that the
    # frames are an interpolated cycle.
    "walk": [
        "FRAME 1 of 8 — opening of the right-step. Right foot just planted forward at full stride length, heel kissing the ground. Left foot lifted slightly behind the back hip, knee bent about 90°. Body weight has just begun to shift onto the front (right) foot — torso almost vertical with a tiny forward lean. Left arm extends forward, hand near sternum height; right arm reaches back, hand near rear hip. Body height at neutral. Hold the limbs near the SAME position they would occupy on a slow-motion freeze of the walk's contact phase.",
        "FRAME 2 of 8 — small continuation of frame 1 (about 1/8 of the cycle further). Right (front) leg still planted but knee has bent ~10° more, body sinking 2–4 px below frame 1's height. Left foot has barely begun to swing forward — still lifted behind the body but slightly less elevated. Arms have inched a sliver back toward neutral from their frame-1 extremes. Torso lean unchanged.",
        "FRAME 3 of 8 — continuing the descent. Right knee at deepest bend (~30°), body at the LOWEST point of the cycle, head 4–6 px below neutral. Left foot has cleared the ground and is swinging forward beneath the body, knee bent. Arms passing through neutral position — closer to the sides than in frames 1–2 but still showing slight opposition.",
        "FRAME 4 of 8 — body beginning to rise from the low point. Right (rear) leg straightening to push off, foot still planted but heel lifting. Left leg passing under the torso, foot just under the body's centerline, knee lifting. Body height climbing back toward neutral. Arms continuing past neutral; the formerly-back right arm now drifts forward, the formerly-forward left arm drifts back.",
        "FRAME 5 of 8 — opening of the left-step (mirror of frame 1). Left foot just planted forward at full stride length, heel kissing the ground. Right foot lifted slightly behind the back hip. Body weight shifting onto the new front (left) foot, torso with a tiny forward lean. Right arm extends forward, hand near sternum; left arm reaches back, hand near rear hip. Mirror of frame 1's pose.",
        "FRAME 6 of 8 — small continuation of frame 5 (mirror of frame 2). Left (front) knee bending another ~10°, body sinking 2–4 px below frame 5's height. Right foot has barely begun its forward swing. Arms inching back toward neutral from the frame-5 extremes.",
        "FRAME 7 of 8 — mirror of frame 3. Left knee at deepest bend, body at the LOWEST point of the cycle again, head dropped. Right foot has cleared the ground and swings forward beneath the body. Arms passing through neutral, slight opposition reversed from frame 3.",
        "FRAME 8 of 8 — body rising from the low point, returning toward the cycle start. Left (rear) leg straightening to push off, heel lifting. Right leg passing under the torso, foot near body centerline. Body height climbing back to neutral. Arms drifting past neutral toward their FRAME-1 positions — left arm coming forward, right arm reaching back. This frame must lead seamlessly into frame 1 when the cycle loops.",
    ],
    # Idle: 8 frames of a calm breathing + sway cycle. The body should
    # move by AT MOST a few pixels per frame — almost imperceptible from
    # cell to cell. Frames 3 and 7 are peaks where the body holds briefly
    # before reversing direction.
    "idle": [
        "FRAME 1 of 8 — opening neutral pose at the start of the inhale. Standing relaxed, weight evenly distributed 50/50 on both feet, body at neutral height. Chest just barely beginning to rise. Shoulders softly rolled back. Arms hanging naturally at the sides with a small outward angle. Head perfectly level, eyes ahead. Almost a still pose — the motion is just starting.",
        "FRAME 2 of 8 — tiny continuation of frame 1 (about 1/8 into the cycle). Chest visibly lifting, shoulders rising 1–2 px. Weight gently transferring to the LEFT leg (right hip dipping ~2 px). Head tilting maybe 1–2° toward the right shoulder. Arms unchanged. The whole pose is 90% identical to frame 1 — only the upper body has begun the inhale.",
        "FRAME 3 of 8 — peak of the inhale. Body at its HIGHEST point in the cycle (3–4 px above neutral). Chest fully expanded. Shoulders at maximum lift. Weight fully on the left leg, right knee soft. Head tilted ~3° toward the right shoulder. Hold this pose — frame 4 will look almost identical, the inhale is briefly suspended at the top.",
        "FRAME 4 of 8 — exhale begins; very small continuation of frame 3. Body still near the high point but starting to settle (descent of just 1–2 px). Chest beginning to deflate. Shoulders rolling forward a hair. Weight beginning to drift back toward center. Head returning a degree or two toward level. Almost identical to frame 3 — the motion has just reversed.",
        "FRAME 5 of 8 — passing back through neutral. Body height has returned to neutral. Weight balanced 50/50 again. Shoulders relaxed level. Head straight. Arms at sides. This is the 'breath out' midpoint and looks nearly identical to frame 1, just with shoulders trending downward instead of up.",
        "FRAME 6 of 8 — mirror-symmetric counterpart of frame 2. Chest beginning a second inhale. Shoulders lifting again. This time weight transfers to the RIGHT leg (left hip dipping ~2 px). Head tilting ~1–2° toward the left shoulder. 90% identical to frame 5 with only the upper body shifting.",
        "FRAME 7 of 8 — second peak (mirror of frame 3). Body at its highest point again. Chest fully expanded. Weight fully on the right leg, left knee soft. Head tilted ~3° toward the left shoulder. Hold this pose briefly.",
        "FRAME 8 of 8 — settling back toward frame 1. Chest deflating. Shoulders dropping. Weight returning to center. Head leveling. Body descending the last few pixels back to neutral height. This frame must lead seamlessly into frame 1 — the closing of the breath cycle and the start of the next.",
    ],
    # --- Prop / hazard / interactive states (used by 06-props phase) ---
    # All prop states are 8 keyframes each to match the 4×2 sheet layout
    # used by generate_prop_spritesheet.py. Each state describes a full
    # forward+reverse cycle with intermediate phases for smooth playback.
    "prop_idle": [
        "object resting at base position, no rotation, soft inner highlight, faint shadow on ground",
        "object lifting 1px above base, hint of glow on top edge",
        "object at mid-hover height (3px above base), faint sparkle forming above it",
        "object at PEAK hover (5px above base), bright sparkle particle drifting upward, glow at max",
        "object descending toward mid-hover, sparkle fading, glow dimming",
        "object at low-hover position (1-2px above base), almost settled",
        "object touching base again, settling vibration, faint shadow restored",
        "object at base with subtle shimmer crossing left-to-right, ready to lift again next loop",
    ],
    "collect": [
        "object at rest, full opacity, ground-contact shadow",
        "object lifting upward 5px, scale 1.05x, faint glow forming around it",
        "object airborne 15px up, scale 1.15x, glow brighter, first sparkle particles appearing",
        "object airborne at PEAK (~30px up), scale 1.25x, glow at maximum intensity, particles radiating outward",
        "object beginning to dissolve, scale 1.20x, edges turning into particles, glow softening",
        "object half dissolved, scale 1.10x, only the silhouette outline remains, particles spreading",
        "object mostly dissolved, scale 1.0x, just sparkles in a cluster where the object was",
        "object fully gone, only fading sparkles drifting upward, ground shadow gone",
    ],
    "trigger": [
        "hazard fully retracted/inactive: body closed, mechanism flush with floor/surface, no danger indicator",
        "hazard barely emerging: tip of spike/blade just visible at the surface line",
        "hazard mid-extension (one third): spike/blade emerging, motion lines indicating upward thrust",
        "hazard mid-extension (two thirds): spike/blade further extended, sharp silhouette forming",
        "hazard FULLY EXTENDED/ACTIVE: spike/blade at maximum extension, dangerous pose, peak motion lines",
        "hazard holding extended: same height as previous frame but motion lines fading, danger steady",
        "hazard mid-retraction: spike/blade pulling back to two-thirds height, settling vibration starting",
        "hazard nearly retracted: spike/blade returning to surface, last vibration lines fading",
    ],
    "bounce": [
        "spring at NEUTRAL full height, coils evenly spaced, top plate level",
        "spring slightly compressed (10%), coils starting to squeeze",
        "spring half compressed (50%), top plate dropping, motion lines pressing down",
        "spring FULLY COMPRESSED, coils squeezed tight, top plate near base, peak compression motion lines",
        "spring rebounding (50% extended), coils releasing, top plate rising fast, upward motion lines",
        "spring at neutral height again, but moving up — top plate has upward motion blur",
        "spring at PEAK EXTENSION (110% height), coils stretched, top plate launched up, motion lines up",
        "spring settling back toward neutral, coils relaxing, top plate descending slowly",
    ],
    "activate": [
        "interactive object inactive: dim, no particles, flag/marker resting limp on the LEFT",
        "object beginning to activate: internal glow turning on (10% brightness), flag starting to lift",
        "object glow at 50% brightness, flag rising to mid-height, first light particles forming at base",
        "object glow at peak brightness, flag at PEAK upright position, light particles swirling at base",
        "object holding active: glow steady at peak, flag waving toward the RIGHT now, particles circulating",
        "object glow steady, flag at full RIGHT extension, mirror of frame 3",
        "object glow steady, flag returning toward center, particles fading slightly",
        "object glow steady, flag back near center but tilted slightly LEFT — start of next cycle",
    ],
    # ── Per-prop semantic cycles ─────────────────────────────────────────
    # These differ from the generic "trigger" / "prop_idle" / "bounce" cycles
    # above by anchoring EVERY frame to the same visual position/orientation
    # so the model sees one prop in 8 states, not 8 unrelated props. This
    # is the fix for the spike-trap-as-eight-different-stones failure.
    #
    # Convention: every frame opens with "SAME stone base block centered…"
    # (or equivalent shared anchor) so the model treats the visual subject
    # as fixed and only varies the active feature.
    "spike_trap_trigger": [
        "FRAME 1 of 8 — SAME flat stone base block centered in frame, lid flush with top, NO spikes visible. Ground shadow under the base. Static neutral pose, fully retracted state. The base, its position, and its proportions are the visual anchor that every other frame must preserve.",
        "FRAME 2 of 8 — SAME stone base in the SAME position. Lid cracking open by ~10% to reveal a slim dark slot at the top. Faint glints inside the slot hint at the spike tips. NO spike emerging yet. Anchor unchanged.",
        "FRAME 3 of 8 — SAME stone base. Three or four short metal spikes emerging vertically from the top of the base, just 1/4 of their final length. Spikes point STRAIGHT UP. Sharp silhouette starting to form. Faint upward motion lines beside the spikes.",
        "FRAME 4 of 8 — SAME stone base. Spikes at 1/2 their final length, still vertical, evenly spaced in a row. Motion lines stronger, indicating active emergence. Base unchanged.",
        "FRAME 5 of 8 — SAME stone base. Spikes at FULL extension, vertical, sharp tips at the top of the frame area. Maximum dangerous read. Strong motion lines + slight glow at the tips. This is the peak of the activation. Base position unchanged.",
        "FRAME 6 of 8 — SAME stone base. Spikes still fully extended at the SAME height as frame 5, motion lines fading, danger steady. Holding pose.",
        "FRAME 7 of 8 — SAME stone base. Spikes retracting back to ~1/2 length, vertical, short downward motion lines indicating retreat. Base unchanged.",
        "FRAME 8 of 8 — SAME stone base. Spikes nearly fully retracted (~1/8 visible), lid almost closed again. Last vibration lines fading. Returns to frame-1 pose seamlessly on the next loop.",
    ],
    "bounce_spring_trigger": [
        "FRAME 1 of 8 — SAME spring centered in frame, top plate level, coils evenly spaced at NEUTRAL full height. Fixed circular base on the ground. Soft drop shadow. Anchor pose: every frame keeps the base in the same position and the coil column aligned vertically.",
        "FRAME 2 of 8 — SAME base in SAME position. Top plate descending ~10%; the top one or two coils have begun to compress. Coils still mostly even.",
        "FRAME 3 of 8 — SAME base. Top plate at HALF compression height. Coils squeezed together at the top, fanning out toward the bottom. Downward motion lines beside the plate.",
        "FRAME 4 of 8 — SAME base. Top plate at MAXIMUM compression, just above the base. Coils tightly stacked. Strong downward motion lines. This is the bottom of the cycle.",
        "FRAME 5 of 8 — SAME base. Top plate rebounding through neutral, coils releasing. Upward motion blur on the plate. Energetic mid-rebound pose.",
        "FRAME 6 of 8 — SAME base. Top plate at PEAK extension (~110% neutral height). Coils stretched, slightly separated. Strong upward motion lines.",
        "FRAME 7 of 8 — SAME base. Top plate descending from peak back toward neutral, coils reseating. Light motion blur.",
        "FRAME 8 of 8 — SAME base. Top plate at NEUTRAL height again, coils settling, closing the cycle so frame 1 reads identically.",
    ],
    "gold_key_idle": [
        "FRAME 1 of 8 — ornate golden key centered in frame at neutral height, body horizontal, bow (loop) on the LEFT, teeth on the RIGHT. Soft drop shadow on the ground beneath. Gem inset visible on the bow. Anchor pose: every frame preserves this body orientation, scale, and centerline.",
        "FRAME 2 of 8 — SAME key. Lifted ~2 px. Faint glow forming on the bow's gem.",
        "FRAME 3 of 8 — SAME key, lifted ~4 px (mid hover). Single small sparkle particle drifting up from the teeth.",
        "FRAME 4 of 8 — SAME key, at PEAK hover (~5 px above ground). Gem glow at maximum brightness. Sparkle particle larger and brighter.",
        "FRAME 5 of 8 — SAME key, descending toward mid hover (~3 px). Gem glow dimming. Sparkle fading.",
        "FRAME 6 of 8 — SAME key, near base (~1 px above ground). Glow soft. Almost settled.",
        "FRAME 7 of 8 — SAME key, touching ground level. Glow at minimum. Drop shadow tightest.",
        "FRAME 8 of 8 — SAME key, settling vibration completing. Glow about to begin again next loop. Reads identically to frame 1.",
    ],
    "health_potion_idle": [
        "FRAME 1 of 8 — red glass potion flask centered in frame, cork stopper at the top, round body in the middle, narrow neck. Soft drop shadow. Inner liquid uniform red. Anchor pose: every frame keeps the bottle silhouette, stopper position, and body proportions identical.",
        "FRAME 2 of 8 — SAME potion. Inner liquid showing a small swirl at the lower-right of the body — the only change. No movement of the bottle itself.",
        "FRAME 3 of 8 — SAME potion. Swirl drifting upward to the middle of the body. Faint sparkle forming above the cork.",
        "FRAME 4 of 8 — SAME potion. Swirl peaks near the top of the body's interior. Sparkle above the cork at max brightness, single small particle.",
        "FRAME 5 of 8 — SAME potion. Swirl descending back toward the middle. Sparkle fading.",
        "FRAME 6 of 8 — SAME potion. Swirl at the lower-left of the body (mirror of frame 2). Sparkle gone.",
        "FRAME 7 of 8 — SAME potion. Swirl at the bottom of the body, settling. Inner liquid almost uniform again.",
        "FRAME 8 of 8 — SAME potion. Inner liquid fully uniform red, ready to begin the swirl again next loop.",
    ],
}


def get_keyframes(state: str) -> list[str]:
    """Return the pose list for a state. Raises if state is undefined so we
    fail loudly rather than silently producing a generic animation."""
    if state not in KEYFRAMES:
        raise KeyError(
            f"No KEYFRAMES table for state '{state}'. "
            f"Add it to scripts/lib/keyframes.py. "
            f"Known states: {sorted(KEYFRAMES.keys())}"
        )
    return KEYFRAMES[state]


def keyframes_for_prop(
    keyframes_id: str | None,
    animation_type: str,
    state: str,
) -> list[str]:
    """Pick the right keyframe list for a prop generation call.

    Resolution order:
      1. If `keyframes_id` is set and exists in KEYFRAMES, use it.
         (Catalog-driven semantic cycles per prop_id, e.g.
         "spike_trap_trigger".)
      2. Else if `animation_type == "trigger"` and KEYFRAMES has "trigger",
         use the generic trigger cycle.
      3. Else if `state == "idle"` and KEYFRAMES has "prop_idle", use the
         generic prop hover cycle.
      4. Else fall back to get_keyframes(state) — the per-state default.

    Static props short-circuit ABOVE this function: their generators emit
    a 1-frame sheet without consulting keyframes at all.
    """
    if keyframes_id and keyframes_id in KEYFRAMES:
        return KEYFRAMES[keyframes_id]
    if animation_type == "trigger" and "trigger" in KEYFRAMES:
        return KEYFRAMES["trigger"]
    if state == "idle" and "prop_idle" in KEYFRAMES:
        return KEYFRAMES["prop_idle"]
    return get_keyframes(state)


# State -> variant pose name. None means "use the canonical reference directly"
# (the state is close enough to the resting pose that we don't want to spend
# an extra image-gen call building a variant). A non-None name routes through
# generate_secondary_refs.ensure_variant_ref(), which is idempotent — the
# variant is generated at most once per character per pose.
STATE_VARIANT: dict[str, str | None] = {
    "idle": None,
    "walk": None,
    "run": None,
    "attack": "attack",
    "defend": "defend",
    "jump": "jump",
    "crouch": "crouch",
    "cast": "cast",
}


# Default pose descriptions used when ensuring a variant lazily from a state.
# Kept short — the per-frame keyframe text in the spritesheet prompt carries
# the detail; this only seeds the single variant reference image.
VARIANT_DESCRIPTIONS: dict[str, str] = {
    "attack": "mid-attack pose, weight forward, weapon arm extended in a strike, opposite arm counter-balancing",
    "defend": "defensive stance, shield or guard arm raised in front, body angled, weight back",
    "jump": "airborne pose at the apex of a jump, both feet off the ground, knees tucked, arms balancing",
    "crouch": "low crouch, knees deeply bent, torso lowered, arms ready, head level",
    "cast": "spellcasting pose, arms raised forward, hands shaping a glyph, weight slightly back",
}


def variant_for_state(state: str) -> str | None:
    """Return the variant pose name for a state, or None to use canonical.

    Unknown states default to None (canonical) — generate_spritesheet still
    needs an entry in KEYFRAMES, so a typo there will fail loudly anyway.
    """
    return STATE_VARIANT.get(state)


def variant_description(pose_name: str) -> str:
    """Default plain-language pose description for a variant name."""
    return VARIANT_DESCRIPTIONS.get(pose_name, f"{pose_name} pose")


# Per-state Phaser playback hints. The generators write these into each
# spritesheet's atlas meta so the showcase (inspect/lib/animations.js)
# picks the right frame-rate and yoyo policy automatically — no global
# tuning, no hardcoding in the play scene.
#
# yoyo=True plays 0..N-1, N-2..0, ... which masks a non-perfect loop seam
# by reversing direction. Right for cyclic *non-directional* motion (idle
# breathing, prop hover, spring bounce). Wrong for directional motion
# (walk, run): a reverse-played walk reads as moonwalk.
STATE_PLAYBACK: dict[str, dict] = {
    # Character states
    "idle":      {"frameRate": 6,  "yoyo": True},
    "walk":      {"frameRate": 10, "yoyo": False},
    "run":       {"frameRate": 12, "yoyo": False},
    "attack":    {"frameRate": 14, "yoyo": False},
    "defend":    {"frameRate": 8,  "yoyo": True},
    "jump":      {"frameRate": 10, "yoyo": False},
    "crouch":    {"frameRate": 6,  "yoyo": True},
    "cast":      {"frameRate": 10, "yoyo": False},
    # Prop / hazard / interactive states
    "prop_idle": {"frameRate": 6,  "yoyo": True},
    "collect":   {"frameRate": 12, "yoyo": False},  # one-shot effect
    "trigger":   {"frameRate": 12, "yoyo": False},  # one-shot effect
    "bounce":    {"frameRate": 10, "yoyo": True},   # cyclic spring oscillation
    "activate":  {"frameRate": 8,  "yoyo": True},   # cyclic flag wave
    # Per-prop semantic cycles
    "spike_trap_trigger":    {"frameRate": 12, "yoyo": False},
    "bounce_spring_trigger": {"frameRate": 10, "yoyo": False},
    "gold_key_idle":         {"frameRate": 6,  "yoyo": True},
    "health_potion_idle":    {"frameRate": 6,  "yoyo": True},
}

DEFAULT_PLAYBACK = {"frameRate": 8, "yoyo": False}


def playback_for_state(state: str) -> dict:
    """Return Phaser playback hints (frameRate, yoyo) for a state.
    Falls back to DEFAULT_PLAYBACK for unknown states."""
    return STATE_PLAYBACK.get(state, DEFAULT_PLAYBACK)
