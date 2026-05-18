/**
 * Docker container management via the `docker` CLI.
 * Zero extra dependencies — shells out to the docker binary.
 *
 * Copied from @openplaybooks/converge-swebench to keep packages independent.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

const execFileAsync = promisify(execFile);

/** Options for creating a DockerContainer */
export interface ContainerOptions {
  /** Docker image to use */
  image: string;
  /** Container name (auto-generated if omitted) */
  name?: string;
  /** Working directory inside the container */
  workDir?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout for operations in ms (default: 300_000 = 5 min) */
  timeoutMs?: number;
}

/** Result of executing a command in the container */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Manages a single Docker container lifecycle via CLI commands.
 * One container per terminal-bench task for clean isolation.
 */
export class DockerContainer {
  readonly image: string;
  readonly name: string;
  private readonly workDir: string;
  private readonly env: Record<string, string>;
  private readonly timeoutMs: number;
  private containerId: string | null = null;

  constructor(opts: ContainerOptions) {
    this.image = opts.image;
    this.name =
      opts.name ?? `converge-tbench-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.workDir = opts.workDir ?? "/workspace";
    this.env = opts.env ?? {};
    this.timeoutMs = opts.timeoutMs ?? 300_000;
  }

  /** Build a Docker image from a directory containing a Dockerfile */
  async buildFromDir(contextDir: string, tag: string): Promise<void> {
    await execFileAsync("docker", ["build", "-t", tag, contextDir], {
      timeout: this.timeoutMs,
    });
  }

  /** Build a Docker image from a Dockerfile string */
  async build(dockerfile: string, tag: string): Promise<void> {
    const tmpDir = join("/tmp", `converge-docker-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    await writeFile(join(tmpDir, "Dockerfile"), dockerfile, "utf-8");

    await execFileAsync("docker", ["build", "-t", tag, tmpDir], {
      timeout: this.timeoutMs,
    });
  }

  /** Start the container in detached mode */
  async start(): Promise<void> {
    const args = [
      "run",
      "-d",
      "--name",
      this.name,
      "-w",
      this.workDir,
    ];

    for (const [key, val] of Object.entries(this.env)) {
      args.push("-e", `${key}=${val}`);
    }

    // Keep container alive with a long sleep
    args.push(this.image, "sleep", "infinity");

    const { stdout } = await execFileAsync("docker", args, {
      timeout: this.timeoutMs,
    });
    this.containerId = stdout.trim();
  }

  /** Execute a command inside the running container */
  async exec(
    cmd: string | string[],
    opts?: { workDir?: string; timeoutMs?: number },
  ): Promise<ExecResult> {
    const args = ["exec"];
    if (opts?.workDir) {
      args.push("-w", opts.workDir);
    }
    args.push(this.name);

    if (typeof cmd === "string") {
      args.push("bash", "-c", cmd);
    } else {
      args.push(...cmd);
    }

    try {
      const { stdout, stderr } = await execFileAsync("docker", args, {
        timeout: opts?.timeoutMs ?? this.timeoutMs,
        maxBuffer: 10 * 1024 * 1024, // 10 MB
      });
      return { stdout, stderr, exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? "",
        exitCode: err.code ?? 1,
      };
    }
  }

  /** Copy a file from host into the container */
  async copyIn(hostPath: string, containerPath: string): Promise<void> {
    // Ensure parent dir exists inside container
    const parentDir = dirname(containerPath);
    await this.exec(`mkdir -p ${parentDir}`);

    await execFileAsync(
      "docker",
      ["cp", hostPath, `${this.name}:${containerPath}`],
      { timeout: this.timeoutMs },
    );
  }

  /** Copy a file from the container to the host */
  async copyOut(containerPath: string, hostPath: string): Promise<void> {
    await mkdir(dirname(hostPath), { recursive: true });
    await execFileAsync(
      "docker",
      ["cp", `${this.name}:${containerPath}`, hostPath],
      { timeout: this.timeoutMs },
    );
  }

  /** Stop the container */
  async stop(): Promise<void> {
    try {
      await execFileAsync("docker", ["stop", "-t", "5", this.name], {
        timeout: 30_000,
      });
    } catch {
      // Container may already be stopped
    }
  }

  /** Remove the container */
  async remove(): Promise<void> {
    try {
      await execFileAsync("docker", ["rm", "-f", this.name], {
        timeout: 30_000,
      });
    } catch {
      // Container may already be removed
    }
  }

  /** Stop and remove the container */
  async cleanup(): Promise<void> {
    await this.stop();
    await this.remove();
  }

  /** Check if an image exists locally */
  static async imageExists(tag: string): Promise<boolean> {
    try {
      await execFileAsync("docker", ["image", "inspect", tag], {
        timeout: 10_000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
