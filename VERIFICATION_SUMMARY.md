# Converge Environment Variable Verification

## Summary
Successfully verified that the converge CLI can read project.yml and use environment variables for image generation, but discovered that the `env` section in project.yml is not automatically applied to process.env.

## What Works

1. **Manual Environment Variable Setup**
   - When GEMINI_API_KEY is exported in the shell, image generation works perfectly
   - Generated 3 character reference images (128x128 PNG, 18-30KB each)
   - Images created using Gemini 2.5 Flash Image API

2. **Project Configuration**
   - project.yml correctly defines: `env: GEMINI_API_KEY: AQ.Ab8RN6LyDAM_tfVfTwlgq7-ejoFBP2mC8c32A42LTg8UPtOtvQ`
   - Converge loads project.yml successfully
   - WBS scripts execute and call Python scripts

3. **Image Generation Pipeline**
   - Python script: `scripts/generate_character_ref.py` ✓
   - Image API: `scripts/lib/image_api.py` ✓
   - WBS script: `.converge/playbooks/default/tasks/02-character-refs/wbs/index.js` ✓
   - Backend: Switched from `stub` to `gemini` ✓

## Issue Discovered

The `env` section in project.yml is **not automatically applied** to `process.env` by converge:
- `ConvergeConfig` interface (packages/core/src/config/types.ts) has no `env` property
- `buildConfigFromData()` function (packages/core/src/config/loader.ts) doesn't extract or apply env variables
- WBS scripts receive empty GEMINI_API_KEY unless manually exported

## Workaround

Export the environment variable before running converge:
```bash
export GEMINI_API_KEY="AQ.Ab8RN6LyDAM_tfVfTwlgq7-ejoFBP2mC8c32A42LTg8UPtOtvQ"
pnpm --filter @converge/cli converge run --playbook=default
```

## Test Results

✅ Image generation with manual env export:
```bash
GEMINI_API_KEY="..." node test_wbs.js
# Generated 3 character reference sheet(s)
# - hero-knight: 21KB PNG
# - forest-elf: 30KB PNG  
# - shadow-mage: 18KB PNG
```

❌ Image generation without env export:
```bash
node test_wbs.js
# GEMINI_API_KEY not set. Export it first: export GEMINI_API_KEY=...
# Generated 0 sheet(s), 3 failed
```

## Recommendation

To fully support the `env` section in project.yml, converge needs to:
1. Add `env?: Record<string, string>` to `ConvergeConfig` interface
2. Extract env from YAML in `buildConfigFromData()`
3. Apply env variables to `process.env` before executing tasks/WBS scripts
