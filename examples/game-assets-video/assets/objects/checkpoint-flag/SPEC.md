# Checkpoint Flag — SPEC

**ID**: checkpoint-flag
**Category**: interactive
**States**: idle, activate

## Visual Identity

A stone pedestal supporting a slender wooden pole with a triangular fabric flag, shaped to read clearly as a save-point landmark at sprite scale. The pedestal uses muted grey stone tones with a single warm highlight on its top edge, while the flag holds a saturated accent hue (warm crimson) against the cool stone — palette discipline keeps it to two greys plus the flag accent so it reads as a beacon without competing with characters or hazards.

## Per-State Animation Intent

- **idle** — Flag hangs slack against the pole with a slow, low-amplitude sway so the prop reads as dormant but present.
- **activate** — Flag snaps taut and waves in a confident, looping ripple as if catching a sudden wind, signaling the checkpoint has registered.

## Category Behavior — interactive

Triggered by player action (proximity or contact); the prop transitions idle → activate and remains in the activated state. The prop is **persistent** — it is not consumed and stays in the scene as a visible marker of the recorded checkpoint.
