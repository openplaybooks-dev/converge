"use client";

import type { Workspace } from "../types";
import { loadConfig, saveConfig } from "../state/config";

export function workspaceIdFromPath(path: string): string {
  // Deterministic stable id — slugified path
  return path
    .toLowerCase()
    .replace(/[\\\/]+/g, "-")
    .replace(/[^a-z0-9\-_:.]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function listWorkspaces(): Workspace[] {
  const cfg = loadConfig();
  const ws = cfg.workspaces ?? [];
  return [...ws].sort((a, b) =>
    (b.lastOpenedAt || "").localeCompare(a.lastOpenedAt || ""),
  );
}

export function getCurrentWorkspace(): Workspace | null {
  if (typeof window === "undefined") return null;
  const cfg = loadConfig();
  const id = cfg.currentWorkspaceId;
  if (!id) return null;
  return (cfg.workspaces ?? []).find((w) => w.id === id) ?? null;
}

export function addWorkspace(
  input: Omit<Workspace, "id" | "lastOpenedAt"> & { id?: string },
): Workspace {
  const cfg = loadConfig();
  const id = input.id || workspaceIdFromPath(input.path);
  const existing = (cfg.workspaces ?? []).find((w) => w.id === id);
  const now = new Date().toISOString();
  const next: Workspace = {
    id,
    name: input.name,
    path: input.path,
    description: input.description,
    playbookCount: input.playbookCount,
    lastOpenedAt: now,
  };
  const workspaces = existing
    ? (cfg.workspaces ?? []).map((w) => (w.id === id ? { ...w, ...next } : w))
    : [...(cfg.workspaces ?? []), next];
  saveConfig({ ...cfg, workspaces });
  return next;
}

export function removeWorkspace(id: string): void {
  const cfg = loadConfig();
  const workspaces = (cfg.workspaces ?? []).filter((w) => w.id !== id);
  const currentWorkspaceId =
    cfg.currentWorkspaceId === id ? null : cfg.currentWorkspaceId;
  saveConfig({ ...cfg, workspaces, currentWorkspaceId });
}

export function setCurrentWorkspace(id: string | null): void {
  const cfg = loadConfig();
  if (id === null) {
    saveConfig({ ...cfg, currentWorkspaceId: null });
    return;
  }
  const now = new Date().toISOString();
  const workspaces = (cfg.workspaces ?? []).map((w) =>
    w.id === id ? { ...w, lastOpenedAt: now } : w,
  );
  saveConfig({ ...cfg, workspaces, currentWorkspaceId: id });
}

export function updateWorkspaceMeta(
  id: string,
  patch: Partial<Workspace>,
): void {
  const cfg = loadConfig();
  const workspaces = (cfg.workspaces ?? []).map((w) =>
    w.id === id ? { ...w, ...patch } : w,
  );
  saveConfig({ ...cfg, workspaces });
}

const WORKSPACE_CHANGE_EVENT = "converge-workspace-change";

export function emitWorkspaceChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGE_EVENT));
}

export function onWorkspaceChange(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(WORKSPACE_CHANGE_EVENT, fn);
  return () => window.removeEventListener(WORKSPACE_CHANGE_EVENT, fn);
}
