---
id: 08-shots
title: Shots — Video Generation
description: For each shot, build a video prompt, generate img2vid from the keyframe, QC the result, and regenerate on failure.
dependencies:
  - 07-keyframes
wbs:
  type: nodejs
  path: ./wbs/index.js
blocking: true
tags:
  - shot
  - video
  - generate
inputs:
  - shots.json
  - keyframes/**/*.png
  - scenes/**/state.json
  - style-guide.md
outputs:
  - clips/**/video.mp4
  - clips/**/video.prompt.txt
  - clips/**/video.seed.txt
  - clips/**/qc.json
checks:
  - id: at-least-one-clip
    cmd: find clips -name 'video.mp4' -type f | wc -l | awk '{if ($1 >= 1) exit 0; exit 1}'
    description: At least one clip video rendered
  - id: every-shot-has-video
    cmd: node -e "const s=require('./shots.json');const fs=require('fs');for(const x of s){const slug=x.id+'-'+(x.action||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40);const base='clips/'+slug;if(!fs.existsSync(base+'/video.mp4')){if(!fs.readdirSync('clips').some(d=>d.startsWith(x.id+'-')&&fs.existsSync('clips/'+d+'/video.mp4'))){console.error('Missing video for '+x.id);process.exit(1)}}}"
    description: Every shot has a rendered video.mp4
---

# Shots — Video Generation

The expensive phase. Per shot, a 4-step pipeline:

1. **01-prompt** — build the video prompt from the shot record + scene state + style. Saved to `clips/{NNN}-{slug}/video.prompt.txt`.
2. **02-generate** — call the `video-generate` skill with the keyframe as first frame. Saved to `clips/{NNN}-{slug}/video.mp4`.
3. **03-qc** — verify duration, check face similarity vs character ref, check frame-0 similarity to keyframe. Result at `clips/{NNN}-{slug}/qc.json`.
4. **04-regen-guard** — if qc fails, regenerate with a different seed, up to `maxTaskAttempts` (3).

`clips/{NNN}-{slug}/` naming: NNN is a zero-padded global order, slug is a short kebab-cased action snippet. The WBS computes this once so every task for the same shot writes to the same folder.

Per-shot folder will also receive dialogue / sfx / music from the 09-audio phase.
