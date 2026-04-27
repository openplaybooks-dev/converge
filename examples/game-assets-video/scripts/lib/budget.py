"""Budget pre-spend gate for paid backend calls.

Ported from godogen (https://github.com/htdt/godogen — `shared/skills/godogen/
tools/asset_gen.py`'s check_budget pattern). Every paid call (Gemini image,
Veo video, OpenAI image, Kling video) calls `check_and_charge` BEFORE
spending. If over budget, exit non-zero with a JSON error that an LLM agent
or shell wrapper can parse. If under, append to log.

Storage: `assets/budget.json` at the project root.
  {
    "budget_cents": 1000,
    "log": [
      {"ts": "2026-04-27T18:00:00Z", "service": "gemini", "cost_cents": 5},
      ...
    ]
  }

Cost constants below are seed values — calibrate against actual provider
billing dashboards. They're conservative on the high side so first runs
don't surprise the user.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


# --- Cost constants ---------------------------------------------------------

IMAGE_GEMINI_CENTS_PER_CALL = 5     # gemini-2.5-flash-image at default ~1024×1024
IMAGE_OPENAI_CENTS_PER_CALL = 4     # gpt-image-1 standard quality
IMAGE_STUB_CENTS_PER_CALL = 0
VIDEO_VEO_CENTS_PER_SECOND = 30     # placeholder; calibrate after a few runs
VIDEO_KLING_CENTS_PER_CALL = 50     # 5s clip
VIDEO_GROK_CENTS_PER_SECOND = 5     # xAI Imagine 480p; 720p is roughly 2× this
VIDEO_STUB_CENTS_PER_CALL = 0


@dataclass
class BudgetState:
    budget_cents: int
    spent_cents: int
    remaining_cents: int
    log: list[dict]


# --- Internal -------------------------------------------------------------

def _budget_path(project_root: Path) -> Path:
    return project_root / "assets" / "budget.json"


def _load(project_root: Path, default_budget_cents: int = 1000) -> dict:
    p = _budget_path(project_root)
    if not p.exists():
        return {"budget_cents": default_budget_cents, "log": []}
    return json.loads(p.read_text(encoding="utf-8"))


def _save(project_root: Path, data: dict) -> None:
    p = _budget_path(project_root)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _spent_total(data: dict) -> int:
    return sum(int(e.get("cost_cents", 0)) for e in data.get("log", []))


# --- Public API -----------------------------------------------------------

def init_budget(project_root: Path, budget_cents: int) -> None:
    """Set or reset the budget. Existing log is preserved."""
    data = _load(project_root)
    data["budget_cents"] = int(budget_cents)
    _save(project_root, data)


def status(project_root: Path) -> BudgetState:
    data = _load(project_root)
    spent = _spent_total(data)
    return BudgetState(
        budget_cents=int(data.get("budget_cents", 0)),
        spent_cents=spent,
        remaining_cents=int(data.get("budget_cents", 0)) - spent,
        log=list(data.get("log", [])),
    )


def check_and_charge(
    project_root: Path,
    cost_cents: int,
    service: str,
    *,
    note: str | None = None,
    dry_run: bool = False,
) -> None:
    """Pre-flight gate. Exits non-zero with JSON error if would exceed budget,
    otherwise records the spend immediately. Suitable for fire-and-forget
    callers that aren't structured to refund on failure.

    Newer callers should use the `charged()` context manager — it only commits
    the spend if the wrapped call returns successfully, and refunds if it
    raises (notably the common 429 case where no compute happened).

    Set `dry_run=True` to check feasibility without recording the charge.
    """
    _check_only(project_root, cost_cents, service)
    if dry_run:
        return
    _record(project_root, cost_cents, service, note=note)


def _check_only(project_root: Path, cost_cents: int, service: str) -> None:
    data = _load(project_root)
    spent = _spent_total(data)
    budget = int(data.get("budget_cents", 0))
    remaining = budget - spent
    if cost_cents > remaining:
        sys.stdout.write(json.dumps({
            "ok": False,
            "error": f"Budget exceeded: need {cost_cents}¢ for {service} but only {remaining}¢ remaining (budget={budget}¢, spent={spent}¢).",
            "service": service,
            "cost_cents": cost_cents,
            "budget_cents": budget,
            "spent_cents": spent,
            "remaining_cents": remaining,
        }) + "\n")
        sys.exit(2)


def _record(project_root: Path, cost_cents: int, service: str, note: str | None = None) -> None:
    data = _load(project_root)
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "service": service,
        "cost_cents": int(cost_cents),
    }
    if note:
        entry["note"] = note
    data.setdefault("log", []).append(entry)
    _save(project_root, data)


def refund_last(project_root: Path, expected_service: str | None = None) -> bool:
    """Pop the most recent log entry. If `expected_service` is given, only pop
    if that's the service of the last entry (defensive). Returns True if
    something was popped.
    """
    data = _load(project_root)
    log = data.get("log", [])
    if not log:
        return False
    if expected_service and log[-1].get("service") != expected_service:
        return False
    log.pop()
    _save(project_root, data)
    return True


class charged:
    """Context manager: pre-flight gate on enter; commit on clean exit; refund
    on exception. Use this for paid API calls that may fail (429s, network
    errors) so the budget log only reflects calls that actually consumed
    compute.

        with charged(project_root, cost, "video-veo", note="hero/idle"):
            result = client.models.generate_videos(...)

    On exception, the spend is rolled back. Re-raises the original exception.
    """

    def __init__(
        self,
        project_root: Path,
        cost_cents: int,
        service: str,
        *,
        note: str | None = None,
    ):
        self.project_root = project_root
        self.cost_cents = cost_cents
        self.service = service
        self.note = note

    def __enter__(self):
        _check_only(self.project_root, self.cost_cents, self.service)
        # Provisionally record so concurrent runs see the budget tighten.
        _record(self.project_root, self.cost_cents, self.service, note=self.note)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # Roll back the provisional charge.
            refund_last(self.project_root, expected_service=self.service)
            return False  # re-raise
        return False


def cost_for_video(seconds: float, backend: str) -> int:
    """Return integer cents for a video call of `seconds`."""
    if backend == "veo":
        return int(round(seconds * VIDEO_VEO_CENTS_PER_SECOND))
    if backend == "kling":
        return VIDEO_KLING_CENTS_PER_CALL
    if backend == "grok":
        return int(round(seconds * VIDEO_GROK_CENTS_PER_SECOND))
    return VIDEO_STUB_CENTS_PER_CALL


def cost_for_image(backend: str) -> int:
    """Return integer cents for an image-gen call."""
    if backend == "gemini":
        return IMAGE_GEMINI_CENTS_PER_CALL
    if backend == "openai":
        return IMAGE_OPENAI_CENTS_PER_CALL
    return IMAGE_STUB_CENTS_PER_CALL
