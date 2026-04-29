# Needs: 06-export/build-master-atlas

## Description

Aggregate every per-sheet *.atlas.json into engine-ready master atlas files. Skipped unless stop_after ∈ {export, full}; on `sprites` the atlas is kept fresh by the per-scene manifest hook.

## Checks

- **master-atlas-or-skipped**: Master atlas is fresh in export/full modes; cleanly skipped otherwise
