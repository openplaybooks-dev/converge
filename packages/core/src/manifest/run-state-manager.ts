import { atomicWriteFile } from "../checkpoint/atomic-write.js";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { Manifest, RunStateEntry, RunState } from "./types.js";

function hashManifest(manifest: Manifest): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(manifest)).digest("hex")}`;
}

export class RunStateManager {
  private state: RunState;
  private statePath: string;

  constructor(executionDir: string, manifest: Manifest) {
    this.statePath = join(executionDir, "runstate.json");
    // Derive execution ID from the directory name (e.g. "2026-05-02T13-24-33-rkhc4q")
    const executionId = executionDir.split("/").pop() ?? "";
    this.state = {
      metadata: {
        execution_id: executionId,
        selector: "",
        playbook: manifest.metadata.playbook,
        manifest_hash: hashManifest(manifest),
        status: "running",
      },
      results: Object.keys(manifest.nodes).map((id) => ({
        id,
        status: "pending" as const,
        attempts: 0,
        duration_ms: 0,
      })),
    };
    this.tryLoadExisting();
  }

  /**
   * Load existing runstate.json from disk if present, merging persisted
   * results into defaults so new manifest nodes start as "pending".
   */
  private tryLoadExisting(): void {
    try {
      if (!existsSync(this.statePath)) return;
      const raw = readFileSync(this.statePath, "utf-8");
      const existing: RunState = JSON.parse(raw);
      if (!existing?.results) return;
      const existingMap = new Map(existing.results.map((r) => [r.id, r]));
      for (const node of this.state.results) {
        const prev = existingMap.get(node.id);
        if (prev) {
          node.status = prev.status;
          node.attempts = prev.attempts;
          node.duration_ms = prev.duration_ms;
          if (prev.started_at) node.started_at = prev.started_at;
          if (prev.completed_at) node.completed_at = prev.completed_at;
          if (prev.error_message) node.error_message = prev.error_message;
          if (prev.output_hashes) node.output_hashes = prev.output_hashes;
        }
      }
      if (existing.metadata) {
        this.state.metadata.execution_id = existing.metadata.execution_id || "";
        this.state.metadata.status = existing.metadata.status || "running";
        this.state.metadata.selector = existing.metadata.selector || "";
      }
    } catch {
      // stale or unreadable — keep defaults
    }
  }

  get executionDir(): string {
    return this.statePath.replace(/\/runstate\.json$/, "");
  }

  get statePath_(): string {
    return this.statePath;
  }

  private getNode(nodeId: string): RunStateEntry {
    const node = this.state.results.find((r) => r.id === nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    return node;
  }

  private async persist(): Promise<void> {
    await atomicWriteFile(
      this.statePath,
      JSON.stringify(this.state, null, 2),
    );
  }

  // Mutations

  async markRunning(nodeId: string): Promise<number> {
    const node = this.getNode(nodeId);
    node.attempts += 1;
    node.status = "running";
    node.started_at = new Date().toISOString();
    await this.persist();
    return node.attempts;
  }

  async markComplete(nodeId: string, durationMs: number): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "pass";
    node.duration_ms = durationMs;
    node.completed_at = new Date().toISOString();
    await this.persist();
  }

  async markFailed(nodeId: string, error: string, durationMs: number): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "error";
    node.error_message = error;
    node.duration_ms = durationMs;
    node.completed_at = new Date().toISOString();
    await this.persist();
  }

  async markSkipped(nodeId: string): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "skipped";
    await this.persist();
  }

  async incrementAttempt(nodeId: string): Promise<number> {
    const node = this.getNode(nodeId);
    node.attempts += 1;
    await this.persist();
    return node.attempts;
  }

  // Queries

  async getNodeStatus(nodeId: string): Promise<RunStateEntry | undefined> {
    return this.state.results.find((r) => r.id === nodeId);
  }

  async isComplete(nodeId: string): Promise<boolean> {
    return this.getNode(nodeId).status === "pass";
  }

  async isFailed(nodeId: string): Promise<boolean> {
    return this.getNode(nodeId).status === "error";
  }

  async isLocked(nodeId: string): Promise<boolean> {
    const status = this.getNode(nodeId).status;
    return status === "pass" || status === "error" || status === "skipped";
  }

  async getAttemptCount(nodeId: string): Promise<number> {
    return this.getNode(nodeId).attempts;
  }

  async getCompletedCount(): Promise<number> {
    return this.state.results.filter((r) => r.status === "pass").length;
  }

  async getFailedCount(): Promise<number> {
    return this.state.results.filter((r) => r.status === "error").length;
  }

  async markPending(nodeId: string): Promise<void> {
    const node = this.getNode(nodeId);
    node.status = "pending";
    node.duration_ms = 0;
    node.error_message = undefined;
    node.completed_at = undefined;
    await this.persist();
  }

  async getStateSnapshot(): Promise<RunState> {
    return JSON.parse(JSON.stringify(this.state));
  }

  getStatusMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const r of this.state.results) {
      map.set(r.id, r.status);
    }
    return map;
  }

  getCompletedTaskIds(): string[] {
    return this.state.results.filter((r) => r.status === "pass").map((r) => r.id);
  }

  getFailedTaskIds(): string[] {
    return this.state.results.filter((r) => r.status === "error").map((r) => r.id);
  }

  getLockedTaskIds(): string[] {
    return this.state.results
      .filter((r) => r.status === "pass" || r.status === "error" || r.status === "skipped")
      .map((r) => r.id);
  }

  hasNode(nodeId: string): boolean {
    return this.state.results.some((r) => r.id === nodeId);
  }
}

export async function writeJournalManifest(
  executionDir: string,
  manifest: Manifest,
): Promise<void> {
  const path = join(executionDir, "manifest.json");
  await atomicWriteFile(path, JSON.stringify(manifest, null, 2));
}
