# inspect/ — Phaser asset showcase

Two tools for validating generated game assets without leaving the browser.

| Page | Purpose |
| --- | --- |
| `gallery.html` | Asset validator. Tabbed list of every generated character / prop / tilesheet / background; click to play its animation. Use this to confirm spritesheets animate cleanly, tiles compose correctly, and backgrounds render at the right resolution. |
| `play.html` | Playable platformer prototype. Hero walks/jumps with arrow keys + space, parallax forest scrolls behind, grassland tiles form ground + platforms, hazards hurt you, potions vanish on overlap. Real assets render where available; placeholders fill in for missing categories. |
| `preview-sprite-animation.html` | Older drop-zone tool for previewing one PNG at a time. Kept for ad-hoc inspection. |

Both new pages read `assets/atlas.json` (produced by `scripts/build_master_atlas.py`). If the master atlas isn't present they fall back to walking per-sheet `*.atlas.json` files via the source manifests — so they work even after `stop_after: characters` runs that produce only character spritesheets.

## How to run

ES modules require an HTTP origin (browsers reject `file://` for `import`). Any static server works; Python's built-in is the path of least resistance:

```bash
cd examples/game-assets
python3 -m http.server 8000
```

Then open:

- http://localhost:8000/inspect/gallery.html
- http://localhost:8000/inspect/play.html

Phaser 3.80.1 loads from jsDelivr CDN. No `npm install`, no build step.

## Controls (play.html)

| Key | Action |
| --- | --- |
| ← / → | Move |
| Space | Jump (only when on ground) |
| R | Respawn at start |

## What you should see

After a fresh run with only characters generated (today's `stop_after: characters` mode):

- **Gallery**: Characters tab shows hero-knight idle, forest-elf idle/walk, etc. Other tabs say "no assets generated yet — run the playbook".
- **Play**: Hero appears and animates. Ground is green rectangles, sky is solid blue, no hazards. The "assets in use" sidebar shows real ✓ for hero, fallback ○ for everything else.

After running `stop_after: sprites` (full library) and rebuilding the master atlas:

- **Gallery**: All four tabs populated. Tile maps tab shows the composited tilesheet with a blue grid overlay marking cell boundaries.
- **Play**: Real grassland tiles replace the green rectangles, parallax forest layers scroll behind hero at three different speeds, spike-trap and bounce-spring and health-potion appear as animated sprites in the world. Sidebar flips most ○s to ✓s.

## Files

```
inspect/
├── README.md                          # this file
├── gallery.html                       # asset validator page
├── play.html                          # playable prototype page
├── preview-sprite-animation.html      # legacy single-sheet drop-zone
└── lib/
    ├── atlas-loader.js                # fetch atlas.json + per-sheet fallback walker
    └── animations.js                  # Phaser sheet/anim registration helpers
```

`lib/atlas-loader.js` and `lib/animations.js` are shared ES modules — both pages import from them. They have no other dependencies.

## Updating to a newer Phaser

Edit the `<script src="...phaser@VERSION/...">` line at the top of `gallery.html` and `play.html`. The current pin is `3.80.1`. Phaser 3 minor releases are largely API-stable; major version bumps (e.g. → Phaser 4) will need code review.
