"use client";

import { useState } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { AddWorkspaceModal } from "./AddWorkspaceModal";
import type { Workspace } from "../types";
import { emitWorkspaceChange } from "../lib/workspaces";

export function NoWorkspacePrompt() {
  const [showAdd, setShowAdd] = useState(false);

  function handleWorkspaceChosen(ws: Workspace) {
    emitWorkspaceChange();
    setShowAdd(false);
    // Force re-render by navigating to home (workspace change will update App state)
    window.location.href = "/";
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: 0,
          gap: 24,
          padding: 32,
          background: "var(--cv-bg)",
        }}
      >
        <svg width="48" height="48" viewBox="0 0 170 170" aria-hidden="true">
          <polygon points="0,170 170,170 170,0" fill="#D1CDB8" />
          <polygon points="0,0 0,170 170,0" fill="#8B8772" opacity="0.7" />
          <line
            x1="0"
            y1="170"
            x2="170"
            y2="0"
            stroke="#BE5133"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            maxWidth: 400,
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--cv-sans)",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--cv-text)",
              margin: 0,
            }}
          >
            No workspace selected
          </h2>
          <p
            style={{
              fontFamily: "var(--cv-sans)",
              fontSize: 14,
              color: "var(--cv-text-dim)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Open an existing folder or create a new one to get started with
            Converge Studio.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            className="cv-btn cv-btn--ghost"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
            }}
            onClick={() => setShowAdd(true)}
          >
            <FolderOpen size={16} />
            Open workspace
          </button>
          <button
            type="button"
            className="cv-btn cv-btn--primary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
            }}
            onClick={() => setShowAdd(true)}
          >
            <Plus size={16} />
            Create new workspace
          </button>
        </div>
      </div>
      <AddWorkspaceModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={handleWorkspaceChosen}
        title="Open or create workspace"
        subtitle="Choose an existing folder or scaffold a new workspace to get started."
        openLabel="Open existing folder"
        createLabel="Create new folder"
      />
    </>
  );
}
