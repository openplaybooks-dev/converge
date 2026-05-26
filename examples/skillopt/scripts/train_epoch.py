#!/usr/bin/env python3
"""Run one epoch of SkillOpt ReflACT training.

Thin wrapper that configures the trainer for a single epoch and writes
results to Converge-expected paths.
"""

import argparse
import json
import os
import sys
from pathlib import Path

vendor_path = str(Path(__file__).resolve().parent.parent / "vendor" / "skillopt")
sys.path.insert(0, vendor_path)

from skillopt.config import load_config, flatten_config, is_structured
from skillopt.engine.trainer import ReflACTTrainer
from skillopt.utils.scoring import compute_score


def parse_args():
    p = argparse.ArgumentParser(description="Run one SkillOpt training epoch")
    p.add_argument("--config", required=True, help="Path to resolved config YAML")
    p.add_argument("--epoch", type=int, required=True, help="Epoch number (0-indexed)")
    p.add_argument("--skill-dir", required=True, help="Directory for skill versions")
    p.add_argument("--history", required=True, help="Path to history.json")
    p.add_argument("--best-skill", required=True, help="Path to best_skill.md")
    p.add_argument("--train-data", required=True, help="Path to training data JSONL")
    p.add_argument("--eval-data", required=True, help="Path to evaluation data JSONL")
    return p.parse_args()


def load_history(path):
    with open(path) as f:
        return json.load(f)


def save_history(path, history):
    with open(path, "w") as f:
        json.dump(history, f, indent=2)


def main():
    args = parse_args()
    os.makedirs(args.skill_dir, exist_ok=True)

    history = load_history(args.history)

    if args.epoch == 0:
        baseline_dir = Path(args.best_skill).parent
        current_skill_path = str(baseline_dir / "baseline_skill.md")
    else:
        current_skill_path = args.best_skill

    cfg = load_config(args.config)
    if is_structured(cfg):
        cfg = flatten_config(cfg)

    cfg["num_epochs"] = 1
    cfg["skill_init"] = current_skill_path
    cfg["out_root"] = str(Path(args.skill_dir).parent / f"epoch_{args.epoch}")
    cfg["eval_test"] = False

    try:
        from skillopt.model.claude_backend import set_target_deployment, set_optimizer_deployment
        set_target_deployment(cfg.get("target_model", "claude-sonnet-4-6"))
        set_optimizer_deployment(cfg.get("optimizer_model", "claude-sonnet-4-6"))
    except ImportError:
        pass

    env_name = cfg.get("env", "searchqa")
    if env_name == "searchqa":
        from skillopt.envs.searchqa.adapter import SearchQAAdapter
        adapter = SearchQAAdapter(
            split_dir=str(Path(args.train_data).parent),
            split_mode="split_dir",
            workers=cfg.get("workers", 4),
            analyst_workers=cfg.get("analyst_workers", 4),
            minibatch_size=cfg.get("minibatch_size", 5),
            seed=cfg.get("seed", 42),
        )
    else:
        raise ValueError(f"Unsupported env: {env_name}. Add adapter import for your benchmark.")

    trainer = ReflACTTrainer(cfg, adapter)
    summary = trainer.train()

    skill_version_path = Path(args.skill_dir) / f"skill_v{args.epoch:04d}.md"
    best_skill_from_run = Path(cfg["out_root"]) / "best_skill.md"
    if best_skill_from_run.exists():
        skill_content = best_skill_from_run.read_text()
        skill_version_path.write_text(skill_content)
    elif Path(current_skill_path).exists():
        skill_content = Path(current_skill_path).read_text()
        skill_version_path.write_text(skill_content)

    epoch_score = summary.get("best_selection_hard", 0.0)
    step_record = {
        "epoch": args.epoch,
        "score": epoch_score,
        "action": "accept" if epoch_score > history.get("best_score", 0) else "reject",
        "total_steps": summary.get("total_steps", 0),
        "accepts": summary.get("total_accepts", 0),
        "rejects": summary.get("total_rejects", 0),
        "wall_time_s": summary.get("total_wall_time_s", 0),
    }

    history["steps"].append(step_record)

    if epoch_score > (history.get("best_score") or 0):
        history["best_score"] = epoch_score
        if best_skill_from_run.exists():
            Path(args.best_skill).write_text(skill_content)
        print(f"Epoch {args.epoch}: NEW BEST score={epoch_score:.4f}")
    else:
        print(f"Epoch {args.epoch}: score={epoch_score:.4f} (best={history['best_score']:.4f})")

    save_history(args.history, history)


if __name__ == "__main__":
    main()
