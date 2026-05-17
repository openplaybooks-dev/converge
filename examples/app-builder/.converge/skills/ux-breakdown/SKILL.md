# UX Breakdown Skill

Turn `.stitch/UX.md` into:

- `.stitch/screens.json`
- `.stitch/SITE.md`

## Screen Object Contract

Each route-level screen must include:

- `id`
- `title`
- `route`
- `purpose`
- `backgroundStyle`
- `heroAssetIds`
- `interactions`

## Rules

- Include only route-level screens.
- Use stable, implementation-friendly ids.
- Capture interaction intent clearly enough for later screen and behavior phases.
- Keep routes simple and web-native.

