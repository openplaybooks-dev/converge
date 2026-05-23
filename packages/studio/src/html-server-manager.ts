import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join, resolve } from "node:path";
import { isIP, Socket } from "node:net";

export interface HtmlServerState {
  id: string;
  pid: number;
  projectDir: string;
  host: string;
  port: number;
  token: string;
  startedAt: string;
}

export interface HtmlServerManagerOptions {
  projectDir: string;
  port?: number;
  host?: string;
  stateFileName?: string;
  authCookieName?: string;
  authHeaderName?: string;
  onRequest: (args: {
    req: IncomingMessage;
    res: ServerResponse;
  }) => Promise<void> | void;
  onUnauthorized?: (args: {
    req: IncomingMessage;
    res: ServerResponse;
  }) => Promise<void> | void;
}

export interface HtmlServerManager {
  url: string;
  authUrl: string;
  token: string;
  host: string;
  port: number;
  withAuth(path?: string): string;
  close(): Promise<void>;
}

const DEFAULT_STATE_FILE = join(".converge", "ui", "studio-server.json");
const DEFAULT_COOKIE = "converge_ui_token";
const DEFAULT_HEADER = "x-converge-ui-token";

export async function createHtmlServerManager(
  options: HtmlServerManagerOptions,
): Promise<HtmlServerManager> {
  const projectDir = resolve(options.projectDir);
  const host = options.host ?? "127.0.0.1";
  const statePath = join(projectDir, options.stateFileName ?? DEFAULT_STATE_FILE);
  const cookieName = options.authCookieName ?? DEFAULT_COOKIE;
  const headerName = (options.authHeaderName ?? DEFAULT_HEADER).toLowerCase();
  const token = randomUUID().replace(/-/g, "");
  const serverId = randomUUID();

  await ensureNoLiveState(statePath);

  const server = createServer((req, res) => {
    void handleManagedRequest({
      req,
      res,
      token,
      cookieName,
      headerName,
      onRequest: options.onRequest,
      onUnauthorized: options.onUnauthorized,
    }).catch((err: any) => {
      const message = err?.stack || err?.message || String(err);
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.end(`Server error\n\n${message}`);
    });
  });

  const port = options.port ?? 0;
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, () => resolveListen());
  });

  const address = server.address();
  const actualPort =
    typeof address === "object" && address && "port" in address
      ? address.port
      : port;
  const baseUrl = `http://${host}:${actualPort}`;
  const state: HtmlServerState = {
    id: serverId,
    pid: process.pid,
    projectDir,
    host,
    port: actualPort,
    token,
    startedAt: new Date().toISOString(),
  };

  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");

  return {
    url: baseUrl,
    authUrl: buildAuthUrl(baseUrl, token, "/"),
    token,
    host,
    port: actualPort,
    withAuth(path = "/") {
      return buildAuthUrl(baseUrl, token, path);
    },
    async close() {
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((err) => {
          if (err) rejectClose(err);
          else resolveClose();
        });
      });
      await removeLiveState(statePath, serverId);
    },
  };
}

export async function readHtmlServerState(
  projectDir: string,
  stateFileName?: string,
): Promise<HtmlServerState | null> {
  const statePath = join(resolve(projectDir), stateFileName ?? DEFAULT_STATE_FILE);
  return await readState(statePath);
}

async function handleManagedRequest(args: {
  req: IncomingMessage;
  res: ServerResponse;
  token: string;
  cookieName: string;
  headerName: string;
  onRequest: HtmlServerManagerOptions["onRequest"];
  onUnauthorized?: HtmlServerManagerOptions["onUnauthorized"];
}): Promise<void> {
  const { req, res, token, cookieName, headerName, onRequest, onUnauthorized } = args;
  const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
  const requestToken =
    requestUrl.searchParams.get("token") ||
    readCookie(req.headers.cookie, cookieName) ||
    readHeader(req.headers[headerName], headerName);

  if (requestToken !== token) {
    if (onUnauthorized) {
      await onUnauthorized({ req, res });
      return;
    }
    res.statusCode = 401;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Unauthorized");
    return;
  }

  if (requestUrl.searchParams.get("token")) {
    res.setHeader(
      "set-cookie",
      `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax`,
    );
  }

  await onRequest({ req, res });
}

async function ensureNoLiveState(statePath: string): Promise<void> {
  if (!existsSync(statePath)) return;
  const current = await readState(statePath);
  if (!current) {
    await rm(statePath, { force: true });
    return;
  }
  const live = await isPortOpen(current.host, current.port);
  if (live) {
    throw new Error(
      `Studio server already appears to be running at http://${current.host}:${current.port} ` +
        `(pid ${current.pid}, started ${current.startedAt}). Stop it first or close the existing server.`,
    );
  }
  await rm(statePath, { force: true });
}

async function removeLiveState(statePath: string, serverId: string): Promise<void> {
  if (!existsSync(statePath)) return;
  const current = await readState(statePath);
  if (!current || current.id !== serverId) return;
  await rm(statePath, { force: true });
}

async function readState(statePath: string): Promise<HtmlServerState | null> {
  try {
    const raw = JSON.parse(await readFile(statePath, "utf8")) as Partial<HtmlServerState>;
    if (
      typeof raw !== "object" ||
      raw === null ||
      typeof raw.id !== "string" ||
      typeof raw.pid !== "number" ||
      typeof raw.projectDir !== "string" ||
      typeof raw.host !== "string" ||
      typeof raw.port !== "number" ||
      typeof raw.token !== "string" ||
      typeof raw.startedAt !== "string"
    ) {
      return null;
    }
    return raw as HtmlServerState;
  } catch {
    return null;
  }
}

export async function isPortOpen(host: string, port: number): Promise<boolean> {
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return false;
  if (!host || host === "0.0.0.0" || host === "::") return false;
  return await new Promise<boolean>((resolveProbe) => {
    const socket = new Socket();
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolveProbe(value);
    };
    socket.setTimeout(250);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, isIP(host) === 6 ? host : host);
  });
}

function buildAuthUrl(baseUrl: string, token: string, path = "/"): string {
  const url = new URL(path, baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function readCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey || rawKey !== name) continue;
    const value = rawValue.join("=");
    return value || null;
  }
  return null;
}

function readHeader(value: string | string[] | undefined, headerName: string): string | null {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  return headerName === DEFAULT_HEADER ? raw.trim() : raw.trim();
}
