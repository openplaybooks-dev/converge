---
id: 004-breakdown-ux-to-screens
title: Breakdown UX to Screens
description: Extract screen definitions and sitemap from UX overview
skill: ux-breakdown
dependencies:
  - 003-generate-ux
tags:
  - screens
  - sitemap
  - structure
inputs:
  - .stitch/UX.md
outputs:
  - .stitch/SITE.md
  - .stitch/screens.json
---

# Breakdown UX to Screens

Invoke **/ux-breakdown** skill to extract structured screen definitions from the UX overview.

## Purpose

This task transforms the high-level UX.md into machine-readable artifacts that downstream tasks can consume. It serves as the bridge between user experience design and implementation.

## What Gets Generated

### 1. `.stitch/SITE.md`
A human-readable sitemap showing:
- Navigation hierarchy
- All routes and their purposes
- User flow diagrams
- Screen relationships

### 2. `.stitch/screens.json`
Machine-readable screen metadata for each screen:
- Unique screen IDs (kebab-case)
- Routes and paths (GoRouter format, e.g., `/novel/:id`)
- Descriptions
- Key features
- Data requirements
- Implementation priority

## Flutter-Specific Notes

- Routes use GoRouter path format: `/path/:param`
- Bottom navigation screens use top-level routes: `/`, `/browse`, `/library`, `/profile`
- Detail screens use nested routes: `/novel/:id`, `/novel/:id/chapter/:chapterId`
- Overlay screens use `overlay:` prefix: `overlay:audio-player`

## Success Criteria

After completion:
- `.stitch/SITE.md` exists with clear navigation structure
- `.stitch/screens.json` exists with valid JSON schema
- All screens from UX.md are represented
- Screen IDs are unique and follow kebab-case convention
- Each screen has required fields (id, title, route, description)
