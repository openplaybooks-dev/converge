import "server-only";
import { join, relative, sep } from "node:path";
import { readFile } from "node:fs/promises";
import chokidar from "chokidar";
import { resolveProjectRoot } from "@/lib/core";

export const dynamic = "force-dynamic";
// SSE responses must be served from a Node runtime (chokidar uses fs).
export const runtime = "nodejs";

const ENCODER = new TextEncoder();
const HEARTBEAT_MS = 15_000;

/**
 * SSE event format helpers.
 */
function sseEvent(name: string, data: unknown): Uint8Array {
  return ENCODER.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseComment(comment: string): Uint8Array {
  return ENCODER.encode(`: ${comment}\n\n`);
}

/**
 * Map a watched file path back to its taskId. The watched root is
 * `<root>/.converge/journal/<playbook>/tasks`, and a status path looks like
 * `<watched>/<id>/status.json`. We accept exactly this depth.
 */
function taskIdFromPath(watchedRoot: string, filePath: string): string | null {
  const rel = relative(watchedRoot, filePath);
  if (rel.startsWith("..")) return null;
  const parts = rel.split(sep);
  if (parts.length !== 2) return null;
  if (parts[1] !== "status.json") return null;
  return parts[0];
}

interface StatusPayload {
  taskId: string;
  state: string;
  attempt?: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

const VALID_STATES = new Set([
  "pending",
  "running",
  "complete",
  "failed",
  "skipped",
]);

async function readStatus(filePath: string, taskId: string): Promise<StatusPayload | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const state =
      typeof parsed.status === "string" && VALID_STATES.has(parsed.status)
        ? parsed.status
        : "pending";
    return {
      taskId,
      state,
      attempt: typeof parsed.attempt === "number" ? parsed.attempt : undefined,
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : undefined,
      completedAt:
        typeof parsed.completedAt === "string" ? parsed.completedAt : undefined,
      durationMs:
        typeof parsed.durationMs === "number" ? parsed.durationMs : undefined,
      error: typeof parsed.error === "string" ? parsed.error : undefined,
    };
  } catch {
    return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const root = resolveProjectRoot();
  const watchedRoot = join(root, ".converge", "journal", name, "tasks");

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        void watcher.close();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const send = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          close();
        }
      };

      // Tell the client we're alive and what we're watching.
      send(
        sseEvent("hello", {
          playbook: name,
          watching: watchedRoot,
          ts: new Date().toISOString(),
        }),
      );

      const heartbeat = setInterval(() => {
        send(sseComment(`hb ${Date.now()}`));
      }, HEARTBEAT_MS);

      // chokidar happily watches a non-existent directory and starts emitting
      // when it appears later — exactly what we want for a fresh playbook.
      const watcher = chokidar.watch(watchedRoot, {
        ignoreInitial: true,
        depth: 2,
        awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 25 },
      });

      const handle = async (filePath: string) => {
        const taskId = taskIdFromPath(watchedRoot, filePath);
        if (!taskId) return;
        const payload = await readStatus(filePath, taskId);
        if (!payload) return;
        send(sseEvent("status", payload));
      };

      watcher.on("add", handle);
      watcher.on("change", handle);
      watcher.on("unlink", (filePath) => {
        const taskId = taskIdFromPath(watchedRoot, filePath);
        if (!taskId) return;
        send(sseEvent("status-cleared", { taskId }));
      });

      req.signal.addEventListener("abort", close, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
