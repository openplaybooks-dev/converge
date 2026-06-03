"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, FolderOpen, Loader2, Plus, X, Check } from "lucide-react";
import {
  addWorkspace,
  setCurrentWorkspace,
  emitWorkspaceChange,
  listWorkspaces,
  getCurrentWorkspace,
} from "../lib/workspaces";
import type { Workspace } from "../types";
import { FolderBrowser } from "./FolderBrowser";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdded?: (ws: Workspace) => void;
  /** Optional title override (default: "Open workspace"). */
  title?: string;
  /** Optional subtitle/explanation shown above the recents list. */
  subtitle?: string;
  /** Override labels for the two action buttons. */
  openLabel?: string;
  createLabel?: string;
}

type Step =
  | { kind: "menu" }
  | { kind: "open-browse" }
  | { kind: "create-browse" }
  | { kind: "create-name"; path: string };

export function AddWorkspaceModal({
  open,
  onClose,
  onAdded,
  title: customTitle,
  subtitle,
  openLabel,
  createLabel,
}: Props) {
  const [step, setStep] = useState<Step>({ kind: "menu" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [recents, setRecents] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");

  useEffect(() => {
    if (open) {
      setRecents(listWorkspaces().slice(0, 6));
      setCurrentId(getCurrentWorkspace()?.id ?? null);
    }
  }, [open]);

  if (!open) return null;

  function close() {
    setStep({ kind: "menu" });
    setError("");
    setCreateName("");
    setCreateDescription("");
    onClose();
  }

  function selectRecent(ws: Workspace) {
    setCurrentWorkspace(ws.id);
    emitWorkspaceChange();
    onAdded?.(ws);
    close();
  }

  async function handleOpenSelect(path: string, hasConverge: boolean) {
    if (!hasConverge) {
      setError(
        `No .converge/ found at ${path}. Use "Create new folder" instead.`,
      );
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/workspaces/inspect?path=${encodeURIComponent(path)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      const ws = addWorkspace({
        name: data.name,
        path: data.path,
        description: data.description,
        playbookCount: data.playbookCount,
      });
      setCurrentWorkspace(ws.id);
      emitWorkspaceChange();
      onAdded?.(ws);
      close();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCreatePick(path: string) {
    setStep({ kind: "create-name", path });
    const segs = path.split(/[\\\/]/).filter(Boolean);
    setCreateName(segs[segs.length - 1] || "");
    setError("");
  }

  async function handleCreate() {
    if (step.kind !== "create-name") return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspaces/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: step.path,
          name: createName,
          description: createDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      const ws = addWorkspace({
        name: data.workspace.name,
        path: data.workspace.path,
        description: data.workspace.description,
        playbookCount: data.workspace.playbookCount,
      });
      setCurrentWorkspace(ws.id);
      emitWorkspaceChange();
      onAdded?.(ws);
      close();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const title =
    step.kind === "open-browse"
      ? "Pick a workspace folder"
      : step.kind === "create-browse"
        ? "Pick a folder to create the workspace in"
        : step.kind === "create-name"
          ? "Name your workspace"
          : customTitle || "Open workspace";

  return (
    <div className="folder-picker__backdrop" onClick={close}>
      <div className="add-workspace-modal" onClick={(e) => e.stopPropagation()}>
        <header className="add-workspace-modal__head">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {step.kind !== "menu" && (
              <button
                type="button"
                onClick={() => {
                  setStep({ kind: "menu" });
                  setError("");
                }}
                className="add-workspace-modal__close"
                aria-label="Back"
                title="Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h2 className="folder-picker__title">{title}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="add-workspace-modal__close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        {error && (
          <div
            className="folder-picker__error"
            style={{ margin: "8px 16px 0" }}
          >
            {error}
          </div>
        )}

        {/* MENU — recents + two action buttons */}
        {step.kind === "menu" && (
          <div className="add-workspace-modal__menu">
            {subtitle && (
              <p className="add-workspace-modal__subtitle">{subtitle}</p>
            )}
            {recents.length > 0 && (
              <>
                <div className="add-workspace-modal__section-label">
                  Recent workspaces
                </div>
                <div className="add-workspace-modal__recents">
                  {recents.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      className={`add-workspace-modal__recent${ws.id === currentId ? " is-current" : ""}`}
                      onClick={() => selectRecent(ws)}
                      title={ws.path}
                    >
                      <span className="add-workspace-modal__recent-check">
                        {ws.id === currentId ? <Check size={12} /> : null}
                      </span>
                      <span className="add-workspace-modal__recent-main">
                        <span className="add-workspace-modal__recent-name">
                          {ws.name}
                        </span>
                        <span className="add-workspace-modal__recent-path">
                          {ws.path}
                        </span>
                      </span>
                      {typeof ws.playbookCount === "number" && (
                        <span className="add-workspace-modal__recent-count">
                          {ws.playbookCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="add-workspace-modal__divider">
                  <span>or</span>
                </div>
              </>
            )}

            <div className="add-workspace-modal__actions">
              <button
                type="button"
                className="add-workspace-modal__action"
                onClick={() => {
                  setStep({ kind: "open-browse" });
                  setError("");
                }}
              >
                <FolderOpen size={18} />
                <span>
                  <span className="add-workspace-modal__action-title">
                    {openLabel || "Open folder"}
                  </span>
                  <span className="add-workspace-modal__action-desc">
                    Pick a folder that already has a <code>.converge/</code>
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="add-workspace-modal__action"
                onClick={() => {
                  setStep({ kind: "create-browse" });
                  setError("");
                }}
              >
                <Plus size={18} />
                <span>
                  <span className="add-workspace-modal__action-title">
                    {createLabel || "Create new folder"}
                  </span>
                  <span className="add-workspace-modal__action-desc">
                    Scaffold a new workspace in a folder
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* OPEN — folder browser (workspaces-only) */}
        {step.kind === "open-browse" && (
          <div className="add-workspace-modal__body">
            <FolderBrowser
              onSelect={handleOpenSelect}
              selectLabel={loading ? "Opening…" : "Open this workspace"}
              selectDisabled={loading}
              requireConverge
            />
          </div>
        )}

        {/* CREATE step 1 — pick parent folder */}
        {step.kind === "create-browse" && (
          <div className="add-workspace-modal__body">
            <FolderBrowser
              onSelect={handleCreatePick}
              selectLabel="Use this folder →"
            />
          </div>
        )}

        {/* CREATE step 2 — name + description */}
        {step.kind === "create-name" && (
          <div className="add-workspace-modal__create-form">
            <label className="folder-picker__label">Workspace folder</label>
            <code className="add-workspace-modal__path">{step.path}</code>

            <label className="folder-picker__label" style={{ marginTop: 12 }}>
              Name
            </label>
            <input
              type="text"
              className="folder-picker__input"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="my-workspace"
              autoFocus
            />

            <label className="folder-picker__label" style={{ marginTop: 12 }}>
              Description (optional)
            </label>
            <input
              type="text"
              className="folder-picker__input"
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Short description for this workspace"
            />

            <div className="folder-picker__actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="folder-picker__cancel"
                onClick={close}
              >
                Cancel
              </button>
              <button
                type="button"
                className="folder-picker__run"
                onClick={handleCreate}
                disabled={!createName.trim() || loading}
              >
                {loading && <Loader2 size={14} className="run-view__spin" />}
                Create workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
