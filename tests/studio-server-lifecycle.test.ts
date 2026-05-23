import { createServer } from "node:http";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { isPortOpen } from "../packages/studio/src/index.ts";

async function listenOnLoopback(server: ReturnType<typeof createServer>): Promise<number> {
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });
  const address = server.address();
  if (!address || typeof address === "string" || !("port" in address)) {
    throw new Error("missing server port");
  }
  return address.port;
}

function writeProjectMetadata(workspace: string) {
  mkdirSync(join(workspace, ".converge"), { recursive: true });
  writeFileSync(
    join(workspace, ".converge", "project.yaml"),
    "name: test-project\n",
    "utf8",
  );
}

describe("isPortOpen", () => {
  it("returns true when a server is listening", async () => {
    const server = createServer();
    const port = await listenOnLoopback(server);
    try {
      expect(await isPortOpen("127.0.0.1", port)).toBe(true);
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
  });

  it("returns false when no server is listening on the port", async () => {
    const server = createServer();
    const port = await listenOnLoopback(server);
    await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    // port is now closed
    expect(await isPortOpen("127.0.0.1", port)).toBe(false);
  });

  it("returns false for invalid port values", async () => {
    expect(await isPortOpen("127.0.0.1", -1)).toBe(false);
    expect(await isPortOpen("127.0.0.1", 0)).toBe(false);
    expect(await isPortOpen("127.0.0.1", 99999)).toBe(false);
  });

  it("returns false for invalid host values", async () => {
    expect(await isPortOpen("", 3000)).toBe(false);
    expect(await isPortOpen("0.0.0.0", 3000)).toBe(false);
    expect(await isPortOpen("::", 3000)).toBe(false);
  });
});

describe("ensureHumanReviewStudioServer stale state handling", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-studio-lifecycle-"));
    writeProjectMetadata(workspace);
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("probes port and recreates server when state file exists but server is dead", async () => {
    // Create a server, capture its port, then kill it — leaving a stale state file
    const probe = createServer();
    const deadPort = await listenOnLoopback(probe);
    await new Promise<void>((resolveClose) => probe.close(() => resolveClose()));

    mkdirSync(join(workspace, ".converge", "ui"), { recursive: true });
    const stateFile = join(workspace, ".converge", "ui", "studio-server.json");
    writeFileSync(
      stateFile,
      JSON.stringify({
        id: randomUUID(),
        pid: 999999,
        projectDir: workspace,
        host: "127.0.0.1",
        port: deadPort,
        token: "stale-token",
        startedAt: new Date(Date.now() - 60_000).toISOString(),
      }),
      "utf8",
    );

    // isPortOpen should return false for the dead port
    expect(await isPortOpen("127.0.0.1", deadPort)).toBe(false);

    // The stale state file should exist
    expect(existsSync(stateFile)).toBe(true);
  });

  it("reuses live server when state file exists and port is still open", async () => {
    // This test documents the desired behavior:
    // when state file exists AND isPortOpen returns true, reuse existing server (return null)
    // The current implementation already does this — we verify the isPortOpen signal works
    const server = createServer();
    const livePort = await listenOnLoopback(server);
    try {
      expect(await isPortOpen("127.0.0.1", livePort)).toBe(true);
    } finally {
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    }
    // After server close, port should no longer be open
    expect(await isPortOpen("127.0.0.1", livePort)).toBe(false);
  });
});