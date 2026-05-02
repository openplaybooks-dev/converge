/**
 * Seed command — discover and run .seed.md files to spawn child tasks.
 *
 * Usage: converge seed [--select <filter>]
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { glob } from "glob";
import { parse as parseYaml } from "yaml";

export interface SeedCommandOptions {
  dir: string;
  select?: string;
  dry?: boolean;
}

interface SeedDef {
  name: string;
  description?: string;
  kind: "nodejs" | "shell";
  args?: Record<string, { type: string; default?: unknown }>;
  body: string;
}

function parseSeedFile(filePath: string): SeedDef | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return null;

    const frontmatter = parseYaml(match[1]);
    if (!frontmatter || typeof frontmatter !== "object") return null;
    const fm = frontmatter as Record<string, unknown>;
    if (!fm.name) return null;

    return {
      name: fm.name as string,
      description: fm.description as string | undefined,
      kind: (fm.kind as "nodejs" | "shell") || "nodejs",
      args: fm.args as Record<string, { type: string; default?: unknown }> | undefined,
      body: (match[2] || "").trim(),
    };
  } catch {
    return null;
  }
}

export async function seedCommand(options: SeedCommandOptions): Promise<void> {
  const projectDir = options.dir;

  const patterns = [
    ".converge/playbooks/*/seeds/**/*.seed.md",
    ".converge/playbooks/*/tasks/**/seeds/**/*.seed.md",
  ];

  const seedFiles: string[] = [];
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: projectDir,
      absolute: true,
      ignore: ["**/node_modules/**"],
    });
    seedFiles.push(...files);
  }

  if (seedFiles.length === 0) {
    console.log("No .seed.md files found.");
    return;
  }

  for (const filePath of seedFiles) {
    const def = parseSeedFile(filePath);
    if (!def) {
      console.log(`⚠️  Skipping unparseable seed: ${filePath}`);
      continue;
    }

    if (options.select && def.name !== options.select) continue;

    console.log(`🌱 Running seed: ${def.name} (${def.kind})`);

    if (options.dry) {
      console.log(`   [dry] Would run ${def.kind} seed: ${def.name}`);
      continue;
    }

    if (def.kind === "shell") {
      try {
        const result = execSync(def.body, {
          cwd: dirname(filePath),
          encoding: "utf-8",
          timeout: 30_000,
        });
        console.log(result.trimEnd());
      } catch (err: any) {
        console.error(`❌ Seed "${def.name}" failed: ${err.message}`);
      }
    } else if (def.kind === "nodejs") {
      try {
        // Execute the seed body as a Node.js script with inline evaluation
        const seedFn = new Function("ctx", def.body);
        const ctx = {
          projectDir,
          args: {},
          log: {
            info: (msg: string) => console.log(`   ${msg}`),
            warn: (msg: string) => console.warn(`   ⚠️  ${msg}`),
            error: (msg: string) => console.error(`   ❌ ${msg}`),
          },
          spawn: (...targets: any[]) => {
            for (const target of targets) {
              console.log(`   ↳ spawn: ${target.id || target}`);
            }
          },
        };
        await seedFn(ctx);
      } catch (err: any) {
        console.error(`❌ Seed "${def.name}" failed: ${err.message}`);
      }
    }
  }
}
