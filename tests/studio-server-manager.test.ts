import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { createAddStudioServer } from "../packages/studio/src/add-ui.ts";

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
  writeFileSync(
    join(workspace, ".converge", "project.yaml"),
    "name: test-project\n",
    "utf8",
  );
}

describe("studio html server manager", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-server-manager-"));
    mkdirSync(join(workspace, ".converge"), { recursive: true });
    writeProjectMetadata(workspace);
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("replaces stale runtime state before starting", async () => {
    const probe = createServer();
    const deadPort = await listenOnLoopback(probe);
    await new Promise<void>((resolveClose) => probe.close(() => resolveClose()));

    mkdirSync(join(workspace, ".converge", "ui"), { recursive: true });
    writeFileSync(
      join(workspace, ".converge", "ui", "studio-server.json"),
      JSON.stringify(
        {
          id: randomUUID(),
          pid: 999999,
          projectDir: workspace,
          host: "127.0.0.1",
          port: deadPort,
          token: "stale-token",
          startedAt: new Date(Date.now() - 60_000).toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    );

    const server = await createAddStudioServer({
      projectDir: workspace,
      port: 0,
    });

    expect(existsSync(join(workspace, ".converge", "ui", "studio-server.json"))).toBe(true);
    expect(await fetch(server.withAuth("/")).then((r) => r.status)).toBe(200);
    await server.close();
    expect(existsSync(join(workspace, ".converge", "ui", "studio-server.json"))).toBe(false);
  });

  it("rejects a port that is already in use", async () => {
    const blocker = createServer();
    const port = await listenOnLoopback(blocker);

    await expect(
      createAddStudioServer({
        projectDir: workspace,
        port,
      }),
    ).rejects.toThrow(/address already in use|EADDRINUSE/i);

    await new Promise<void>((resolveClose) => blocker.close(() => resolveClose()));
  });
});
