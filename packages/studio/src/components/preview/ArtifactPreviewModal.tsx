"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { FilePreview } from "./FilePreview";
import { workspaceHeaders } from "../../providers/converge-api";

interface FileContent {
  content?: string;
  base64?: string;
  contentType?: string;
  size?: number;
}

function formatSize(bytes: number | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

interface Props {
  playbookName: string;
  path: string;
  onClose: () => void;
}

export function ArtifactPreviewModal({ playbookName, path, onClose }: Props) {
  const [content, setContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setContent(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/playbooks/${encodeURIComponent(playbookName)}/artifacts?path=${encodeURIComponent(path)}`,
          { headers: workspaceHeaders() },
        );
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) setContent(data);
      } catch {
        /* leave content null → "Failed to load file" */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [playbookName, path]);

  const close = useCallback(() => {
    setFullscreen(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return (
    <div className="folder-picker__backdrop" onClick={close}>
      <div
        className={`artifact-modal${fullscreen ? " artifact-modal--fullscreen" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="artifact-modal__head">
          <span className="artifact-modal__name">{path.split("/").pop()}</span>
          <span className="artifact-modal__path">{path}</span>
          {content?.size != null && (
            <span className="artifact-modal__size">
              {formatSize(content.size)}
            </span>
          )}
          <button
            type="button"
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
            title={fullscreen ? "Exit full screen" : "Full screen"}
            onClick={() => setFullscreen((v) => !v)}
            className="artifact-modal__close"
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="artifact-modal__close"
          >
            <X size={14} />
          </button>
        </header>
        <div className="artifact-modal__body">
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--cv-text-muted)",
                fontFamily: "var(--cv-sans)",
                fontSize: 13,
              }}
            >
              Loading…
            </div>
          ) : content ? (
            <FilePreview
              content={content.content ?? ""}
              contentType={content.contentType ?? "text/plain"}
              base64={content.base64}
              fileName={path.split("/").pop() ?? path}
              filePath={path}
              playbookName={playbookName}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "var(--cv-text-muted)",
                fontFamily: "var(--cv-sans)",
                fontSize: 13,
              }}
            >
              Failed to load file
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
