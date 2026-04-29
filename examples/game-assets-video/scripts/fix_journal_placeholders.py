#!/usr/bin/env python3
"""fix_journal_placeholders.py — substitute {{scene_id}} in journal TASK.md files.

The converge runner sometimes leaves `{{scene_id}}` placeholders in journaled
TASK.md files (specifically in `checks[].cmd`) when WBS-spawned tasks bypass
the materializer or are re-discovered. This trips every check command and
blocks the chain.

This script walks `.converge/journal/default/tasks/<task>/tasks/scene-<id>/...`
and substitutes `{{scene_id}}` -> `<id>` in any TASK.md files that still
contain the placeholder. Idempotent — run as many times as needed.

Usage:
  python scripts/fix_journal_placeholders.py [<scene_id>]

If <scene_id> is omitted, every scene-<id> dir under the journal is processed.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


def fix_one(scene_dir: Path, scene_id: str) -> int:
    n = 0
    for task_md in scene_dir.rglob("TASK.md"):
        try:
            text = task_md.read_text(encoding="utf-8")
        except Exception:
            continue
        if "{{scene_id}}" not in text:
            continue
        new = text.replace("{{scene_id}}", scene_id)
        task_md.write_text(new, encoding="utf-8")
        n += 1
        sys.stderr.write(f"  substituted {{scene_id}} -> {scene_id} in {task_md}\n")
    return n


def main() -> int:
    project_root = Path.cwd()
    journal = project_root / ".converge" / "journal"
    if not journal.exists():
        sys.stderr.write(f"no journal at {journal}\n")
        return 0

    target_scene = sys.argv[1] if len(sys.argv) > 1 else None
    total = 0
    for playbook_dir in journal.iterdir():
        tasks_dir = playbook_dir / "tasks"
        if not tasks_dir.is_dir():
            continue
        # Walk every <task>/tasks/scene-<id>/ subtree.
        for scene_dir in tasks_dir.rglob("scene-*"):
            if not scene_dir.is_dir():
                continue
            m = re.match(r"^scene-(.+)$", scene_dir.name)
            if not m:
                continue
            scene_id = m.group(1)
            if target_scene and scene_id != target_scene:
                continue
            total += fix_one(scene_dir, scene_id)
    sys.stderr.write(f"total substitutions: {total}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
