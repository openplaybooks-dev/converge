#!/usr/bin/env python3
"""budget_status.py — print current budget state as JSON.

Usage:
  python scripts/budget_status.py
  python scripts/budget_status.py --set 2000   # set budget to 2000¢ ($20)

Output (JSON):
  {
    "budget_cents": 1000,
    "spent_cents": 215,
    "remaining_cents": 785,
    "log": [...]
  }
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from lib import budget
from lib.sprite import find_project_root


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--set", dest="set_to", type=int, help="Set budget_cents to this value")
    ap.add_argument("--reset-log", action="store_true", help="Clear the spend log (keeps budget)")
    args = ap.parse_args()

    project_root = find_project_root(Path.cwd())

    if args.set_to is not None:
        budget.init_budget(project_root, args.set_to)
    if args.reset_log:
        path = project_root / "assets" / "budget.json"
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            data["log"] = []
            path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    state = budget.status(project_root)
    print(json.dumps({
        "budget_cents": state.budget_cents,
        "spent_cents": state.spent_cents,
        "remaining_cents": state.remaining_cents,
        "log": state.log[-20:],  # tail to keep output small
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
