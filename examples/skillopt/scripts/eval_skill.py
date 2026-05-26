#!/usr/bin/env python3
"""Evaluate a skill on a dataset using SkillOpt's evaluation pipeline.

Thin wrapper that runs the skill on each item and computes hard/soft scores.
"""

import argparse
import json
import os
import sys
from pathlib import Path

vendor_path = str(Path(__file__).resolve().parent.parent / "vendor" / "skillopt")
sys.path.insert(0, vendor_path)


def parse_args():
    p = argparse.ArgumentParser(description="Evaluate a skill on a dataset")
    p.add_argument("--skill", required=True, help="Path to skill markdown file")
    p.add_argument("--data", required=True, help="Path to evaluation data JSONL")
    p.add_argument("--output", required=True, help="Path to write evaluation results JSON")
    return p.parse_args()


def load_jsonl(path):
    items = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                items.append(json.loads(line))
    return items


def main():
    args = parse_args()

    skill_content = Path(args.skill).read_text()
    items = load_jsonl(args.data)

    from skillopt.utils.scoring import compute_score

    try:
        from skillopt.config import load_config, flatten_config, is_structured
        config_path = Path(args.skill).parent / "config.yaml"
        if config_path.exists():
            cfg = load_config(str(config_path))
            if is_structured(cfg):
                cfg = flatten_config(cfg)
        else:
            cfg = {}
    except Exception:
        cfg = {}

    try:
        from skillopt.envs.searchqa.adapter import SearchQAAdapter

        data_dir = str(Path(args.data).parent)
        adapter = SearchQAAdapter(
            split_dir=data_dir,
            split_mode="split_dir",
            workers=cfg.get("workers", 4),
            seed=cfg.get("seed", 42),
        )
        adapter.setup(cfg)

        eval_env = adapter.build_eval_env(
            env_num=len(items),
            split="eval",
            seed=cfg.get("seed", 42),
        )
        results = adapter.rollout(
            eval_env,
            skill_content,
            out_dir=str(Path(args.output).parent / "eval_rollout"),
        )
    except Exception as e:
        print(f"Warning: adapter rollout failed ({e}), falling back to direct scoring", file=sys.stderr)
        results = []
        for item in items:
            results.append({
                "id": item.get("id", ""),
                "hard": 0,
                "soft": 0.0,
                "question": item.get("question", ""),
                "predicted": "",
                "expected": item.get("answer", ""),
            })

    hard_score, soft_score = compute_score(results) if results else (0.0, 0.0)

    output = {
        "hard_score": hard_score,
        "soft_score": soft_score,
        "num_items": len(items),
        "results": results,
    }

    os.makedirs(Path(args.output).parent, exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Evaluation: hard={hard_score:.4f} soft={soft_score:.4f} items={len(items)}")


if __name__ == "__main__":
    main()
