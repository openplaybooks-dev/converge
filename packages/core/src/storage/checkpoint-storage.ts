/**
 * Checkpoint Storage
 *
 * Handles reading and writing checkpoints to filesystem.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import yaml from "yaml";
import type { Checkpoint } from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Checkpoint Storage                                                */
/* ------------------------------------------------------------------ */

export class CheckpointStorage {
  private checkpointDir: string;

  constructor(projectDir: string) {
    this.checkpointDir = path.join(projectDir, ".converge", "checkpoints");
  }

  /**
   * Save checkpoint to disk
   */
  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    // Ensure directory exists
    await mkdir(this.checkpointDir, { recursive: true });

    // Save checkpoint with unique ID
    const checkpointPath = path.join(
      this.checkpointDir,
      `${checkpoint.id}.yaml`,
    );
    const checkpointYaml = yaml.stringify(checkpoint);
    await writeFile(checkpointPath, checkpointYaml, "utf-8");

    // Update latest symlink
    const latestPath = path.join(this.checkpointDir, "latest.yaml");
    await writeFile(latestPath, checkpointYaml, "utf-8");
  }

  /**
   * Load latest checkpoint
   */
  async loadLatestCheckpoint(): Promise<Checkpoint | null> {
    const latestPath = path.join(this.checkpointDir, "latest.yaml");

    if (!existsSync(latestPath)) {
      return null;
    }

    const checkpointYaml = await readFile(latestPath, "utf-8");
    return yaml.parse(checkpointYaml) as Checkpoint;
  }

  /**
   * Load checkpoint by ID
   */
  async loadCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
    const checkpointPath = path.join(
      this.checkpointDir,
      `${checkpointId}.yaml`,
    );

    if (!existsSync(checkpointPath)) {
      return null;
    }

    const checkpointYaml = await readFile(checkpointPath, "utf-8");
    return yaml.parse(checkpointYaml) as Checkpoint;
  }

  /**
   * Check if checkpoint exists
   */
  async checkpointExists(): Promise<boolean> {
    const latestPath = path.join(this.checkpointDir, "latest.yaml");
    return existsSync(latestPath);
  }

  /**
   * List all checkpoints
   */
  async listCheckpoints(): Promise<string[]> {
    if (!existsSync(this.checkpointDir)) {
      return [];
    }

    const { readdir } = await import("node:fs/promises");
    const files = await readdir(this.checkpointDir);

    return files
      .filter((f) => f.endsWith(".yaml") && f !== "latest.yaml")
      .map((f) => f.replace(".yaml", ""));
  }

  /**
   * Delete checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    const checkpointPath = path.join(
      this.checkpointDir,
      `${checkpointId}.yaml`,
    );

    if (existsSync(checkpointPath)) {
      const { unlink } = await import("node:fs/promises");
      await unlink(checkpointPath);
    }
  }

  /**
   * Clear all checkpoints
   */
  async clearCheckpoints(): Promise<void> {
    if (!existsSync(this.checkpointDir)) {
      return;
    }

    const checkpoints = await this.listCheckpoints();

    for (const checkpointId of checkpoints) {
      await this.deleteCheckpoint(checkpointId);
    }

    // Delete latest
    const latestPath = path.join(this.checkpointDir, "latest.yaml");
    if (existsSync(latestPath)) {
      const { unlink } = await import("node:fs/promises");
      await unlink(latestPath);
    }
  }
}
