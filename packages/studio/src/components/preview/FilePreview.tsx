"use client";

import { marked } from "marked";

interface FilePreviewProps {
  content: string;
  contentType: string;
  base64?: string;
  fileName: string;
  filePath?: string;
  playbookName?: string;
}

function ext(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

function isMarkdown(contentType: string, name: string): boolean {
  return (
    contentType === "text/markdown" || ["md", "markdown"].includes(ext(name))
  );
}

function isJson(contentType: string, name: string): boolean {
  return contentType === "application/json" || ext(name) === "json";
}

function isHtml(contentType: string, name: string): boolean {
  return contentType === "text/html" || ["html", "htm"].includes(ext(name));
}

function JsonTree({
  data,
  depth = 0,
}: {
  data: any;
  depth?: number;
}): React.ReactNode {
  if (data === null)
    return <span style={{ color: "var(--cv-text-muted)" }}>null</span>;
  if (typeof data === "boolean")
    return <span style={{ color: "#C678DD" }}>{String(data)}</span>;
  if (typeof data === "number")
    return <span style={{ color: "#98C379" }}>{String(data)}</span>;
  if (typeof data === "string")
    return <span style={{ color: "#98C379" }}>"{data}"</span>;
  if (Array.isArray(data)) {
    if (data.length === 0)
      return <span style={{ color: "var(--cv-text-muted)" }}>[]</span>;
    return (
      <div style={{ paddingLeft: depth ? 16 : 0 }}>
        <span style={{ color: "var(--cv-text-dim)" }}>[</span>
        {data.map((v, i) => (
          <div key={i} style={{ marginLeft: 16 }}>
            <JsonTree data={v} depth={depth + 1} />
            {i < data.length - 1 && (
              <span style={{ color: "var(--cv-text-dim)" }}>,</span>
            )}
          </div>
        ))}
        <span style={{ color: "var(--cv-text-dim)" }}>]</span>
      </div>
    );
  }
  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0)
      return <span style={{ color: "var(--cv-text-muted)" }}>{"{}"}</span>;
    return (
      <div style={{ paddingLeft: depth ? 16 : 0 }}>
        <span style={{ color: "var(--cv-text-dim)" }}>{"{"}</span>
        {entries.map(([k, v], i) => (
          <div key={k} style={{ marginLeft: 16 }}>
            <span style={{ color: "#E5C07B" }}>"{k}"</span>
            <span style={{ color: "var(--cv-text-dim)" }}>: </span>
            <JsonTree data={v} depth={depth + 1} />
            {i < entries.length - 1 && (
              <span style={{ color: "var(--cv-text-dim)" }}>,</span>
            )}
          </div>
        ))}
        <span style={{ color: "var(--cv-text-dim)" }}>{"}"}</span>
      </div>
    );
  }
  return null;
}

export function FilePreview({
  content,
  contentType,
  base64,
  fileName,
  filePath,
  playbookName,
}: FilePreviewProps) {
  if (isImage(contentType) && base64) {
    return (
      <div style={{ padding: 16, display: "flex", justifyContent: "center" }}>
        <img
          src={`data:${contentType};base64,${base64}`}
          alt={fileName}
          style={{
            maxWidth: "100%",
            maxHeight: "70vh",
            borderRadius: 4,
            border: "1px solid var(--cv-border)",
          }}
        />
      </div>
    );
  }

  if (isMarkdown(contentType, fileName)) {
    return (
      <div
        className="cv-md"
        style={{
          padding: "20px 32px",
          fontFamily: "var(--cv-sans)",
          fontSize: 13.5,
          lineHeight: 1.6,
          color: "var(--cv-text)",
        }}
        dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
      />
    );
  }

  if (isJson(contentType, fileName)) {
    let data: any;
    try {
      data = JSON.parse(content);
    } catch {
      data = null;
    }
    return (
      <div
        style={{
          padding: "20px 24px",
          fontFamily: "var(--cv-mono)",
          fontSize: 12,
        }}
      >
        {data ? (
          <JsonTree data={data} />
        ) : (
          <pre style={{ color: "var(--cv-status-fail)" }}>{content}</pre>
        )}
      </div>
    );
  }

  if (isHtml(contentType, fileName)) {
    // Serve HTML via a Blob URL so relative asset links work (images, CSS, etc.)
    // Rewrite href/src attributes to point to the artifacts API endpoint
    const basePath = filePath ?? fileName;
    const dir = basePath.includes("/")
      ? basePath.substring(0, basePath.lastIndexOf("/") + 1)
      : "";

    // Rewrite relative src/href to absolute artifact URLs
    const adjusted = content.replace(
      /(<(?:img|script|link|iframe)[^>]*(?:src|href|srcDoc)\s*=\s*["']?)(?!http|data:|blob:)([^"'\s>]+)/gi,
      (_, prefix, url) => {
        const cleanUrl = url.replace(/['"]/g, "").trim();
        if (!cleanUrl) return _;
        // Build absolute path relative to the HTML file's directory
        const abs = dir
          ? dir.endsWith("/")
            ? dir + cleanUrl
            : dir + "/" + cleanUrl
          : cleanUrl;
        return `${prefix}/api/playbooks/${encodeURIComponent(playbookName ?? "")}/artifacts?path=${encodeURIComponent(abs)}`;
      },
    );

    const htmlBlob = new Blob([adjusted], { type: "text/html" });
    const blobUrl = URL.createObjectURL(htmlBlob);

    return (
      <iframe
        src={blobUrl}
        title={fileName}
        sandbox="allow-scripts allow-same-origin"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          background: "#fff",
        }}
        onLoad={() => URL.revokeObjectURL(blobUrl)}
      />
    );
  }

  // Default: syntax-highlighted code
  return (
    <pre
      style={{
        padding: "20px 24px",
        margin: 0,
        fontFamily: "var(--cv-mono)",
        fontSize: 12,
        lineHeight: 1.6,
        color: "var(--cv-text)",
        background: "#FAFAF7",
        overflow: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {content}
    </pre>
  );
}
