---
id: 05-breakdown
title: Breakdown — Scenes, Shots, Continuity State
description: Parse screenplay into scenes.json and shots.json, then precompute per-scene continuity state for downstream prompt building.
dependencies:
  - 01-story
  - 02-cast
  - 03-world
  - 04-style
tags:
  - breakdown
  - scenes
  - shots
inputs:
  - screenplay.fountain
  - characters.json
  - locations.json
outputs:
  - scenes.json
  - shots.json
  - scenes/**/state.json
checks:
  - id: scenes-json-exists
    cmd: test -s scenes.json
    description: scenes.json written
  - id: shots-json-exists
    cmd: test -s shots.json
    description: shots.json written
  - id: shots-within-cap
    cmd: node -e "const s=require('./shots.json');if(s.length>800){process.exit(1)}"
    description: Shot count within max_shots_hard_cap (800)
---

# Breakdown

This phase produces the spine that every downstream WBS iterates over. Get this right and everything downstream is mechanical.
