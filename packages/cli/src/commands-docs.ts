/**
 * `converge docs` — generate a self-contained HTML site for a playbook.
 *
 * For every task definition under `.converge/playbooks/<pb>/`, produces
 * a single HTML file with:
 *   - the playbook header (name, description, goals)
 *   - a task index (id, title, dependencies, outputs)
 *   - per-task detail panels (full TASK.md body rendered as code, plus
 *     parsed frontmatter)
 *   - a simple dependency graph (text-based — no external JS deps)
 *
 * This is the closest analog to `dbt docs generate` — gives the team
 * a single artifact to share when discussing what the playbook does.
 *
 * Why one HTML file, not a SPA: zero external dependencies, easy to
 * email or attach to a PR. The whole point is "drop this on someone
 * and they can read it without npm install."
 *
 * Output: `.converge/docs/<playbook>.html` by default, or `--out PATH`.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { parseTaskMdString, type TaskMdShape } from "@converge/core/config/task-md-definition.ts";

export interface DocsCommandOptions {
  positional: string[];
  options: Record<string, unknown>;
}

function asString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v);
}
function asBool(v: unknown): boolean {
  return v === true || v === "true" || v === "1";
}
function fail(msg: string, code = 2): never {
  console.error(`converge docs: ${msg}`);
  process.exit(code);
}

interface TaskDoc {
  id: string;
  title: string;
  description?: string;
  taskMdPath: string;
  shape: TaskMdShape;
  body: string;
}

interface TemplateDoc {
  /** Logical name of the template, derived from its directory. */
  name: string;
  /** Path to the .tpl file, project-relative for display. */
  templatePath: string;
  /** Rendered output with `<placeholder>` markers for each `{{var}}`. */
  rendered: string;
  /** List of placeholder names the template references. */
  placeholders: string[];
}

/** Walk a directory recursively, returning every file matching `name`. */
function findFilesByName(dir: string, name: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    let entries: import("node:fs").Dirent[];
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const p = join(cur, ent.name);
      if (ent.isFile() && ent.name === name) out.push(p);
      else if (ent.isDirectory() && !ent.name.startsWith(".")) stack.push(p);
    }
  }
  return out.sort();
}

function findTaskMdFiles(dir: string): string[] {
  return findFilesByName(dir, "TASK.md");
}

function findTaskMdTemplateFiles(dir: string): string[] {
  return findFilesByName(dir, "TASK.md.tpl");
}

/**
 * Render a TASK.md.tpl with synthetic angle-bracket placeholders so
 * the docs site shows what the template materialises to. Returns the
 * rendered string and the list of placeholder names so we can flag
 * what variables the template expects.
 */
function renderTemplatePreview(rawTpl: string): {
  rendered: string;
  placeholders: string[];
} {
  const seen = new Set<string>();
  const rendered = rawTpl.replace(/\{\{([A-Za-z0-9_-]+)\}\}/g, (_m, name) => {
    seen.add(name);
    return `<${name}>`;
  });
  return { rendered, placeholders: [...seen].sort() };
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderTaskDoc(doc: TaskDoc, idToAnchor: Map<string, string>): string {
  const anchor = idToAnchor.get(doc.id)!;
  const shape = doc.shape;
  const dependsHtml =
    shape.depends_on && shape.depends_on.length > 0
      ? shape.depends_on
          .map((d) => {
            const a = idToAnchor.get(d);
            return a
              ? `<a href="#${a}"><code>${htmlEscape(d)}</code></a>`
              : `<code>${htmlEscape(d)}</code>`;
          })
          .join(", ")
      : "<em>(none)</em>";
  const outputsHtml =
    shape.outputs && shape.outputs.length > 0
      ? shape.outputs
          .map((o) => `<li><code>${htmlEscape(o)}</code></li>`)
          .join("")
      : "";
  const inputsHtml =
    shape.inputs && shape.inputs.length > 0
      ? shape.inputs
          .map((i) => `<li><code>${htmlEscape(i)}</code></li>`)
          .join("")
      : "";
  const checksHtml =
    shape.tests && shape.tests.length > 0
      ? shape.tests
          .map((c: any) => {
            const idPart = c.id ? `<code>${htmlEscape(c.id)}</code>` : "";
            const cmdPart = c.cmd ? `<code>${htmlEscape(c.cmd)}</code>` : "";
            const namePart = c.name ? `<code>${htmlEscape(c.name)}</code>` : "";
            return `<li>${idPart}${namePart}: ${cmdPart}${c.description ? ` — ${htmlEscape(c.description)}` : ""}</li>`;
          })
          .join("")
      : "";

  return `
    <article class="task" id="${anchor}">
      <h2><code>${htmlEscape(doc.id)}</code></h2>
      ${doc.title && doc.title !== doc.id ? `<p class="title">${htmlEscape(doc.title)}</p>` : ""}
      ${doc.description ? `<p class="desc">${htmlEscape(doc.description)}</p>` : ""}
      <dl class="meta">
        <dt>Depends on</dt><dd>${dependsHtml}</dd>
        ${inputsHtml ? `<dt>Inputs</dt><dd><ul>${inputsHtml}</ul></dd>` : ""}
        ${outputsHtml ? `<dt>Outputs</dt><dd><ul>${outputsHtml}</ul></dd>` : ""}
        ${checksHtml ? `<dt>Checks</dt><dd><ul>${checksHtml}</ul></dd>` : ""}
        ${shape.agent ? `<dt>Agent</dt><dd><code>${htmlEscape(shape.agent)}</code></dd>` : ""}
        ${shape.skills && shape.skills.length > 0 ? `<dt>Skills</dt><dd>${shape.skills.map((s) => `<code>${htmlEscape(s)}</code>`).join(", ")}</dd>` : ""}
        <dt>Source</dt><dd><code>${htmlEscape(doc.taskMdPath)}</code></dd>
      </dl>
      <details>
        <summary>TASK.md body</summary>
        <pre><code>${htmlEscape(doc.body)}</code></pre>
      </details>
    </article>`;
}

function renderTemplateDoc(t: TemplateDoc): string {
  const anchor = `tpl-${t.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const phHtml =
    t.placeholders.length > 0
      ? t.placeholders.map((p) => `<code>${htmlEscape(p)}</code>`).join(", ")
      : "<em>(none)</em>";
  return `
    <article class="template" id="${anchor}">
      <h2>📋 template: <code>${htmlEscape(t.name)}</code></h2>
      <p class="desc">Rendered preview — <code>{{var}}</code> placeholders
        substituted with <code>&lt;var&gt;</code> markers for visualisation.</p>
      <dl class="meta">
        <dt>Source</dt><dd><code>${htmlEscape(t.templatePath)}</code></dd>
        <dt>Placeholders</dt><dd>${phHtml}</dd>
      </dl>
      <details open>
        <summary>Preview (synthetic vars)</summary>
        <pre><code>${htmlEscape(t.rendered)}</code></pre>
      </details>
    </article>`;
}

function renderHtml(
  playbookName: string,
  playbookYmlContent: string | null,
  docs: TaskDoc[],
  templates: TemplateDoc[],
  generatedAt: string,
): string {
  const idToAnchor = new Map<string, string>();
  for (const d of docs) {
    idToAnchor.set(d.id, `task-${d.id.replace(/[^a-zA-Z0-9_-]/g, "_")}`);
  }
  const tocHtml = docs
    .map((d) => {
      const anchor = idToAnchor.get(d.id)!;
      const summary = d.description
        ? htmlEscape(d.description.slice(0, 100))
        : d.title && d.title !== d.id
          ? htmlEscape(d.title)
          : "";
      return `<li><a href="#${anchor}"><code>${htmlEscape(d.id)}</code></a>${summary ? ` — ${summary}` : ""}</li>`;
    })
    .join("");
  const templateTocHtml = templates
    .map((t) => {
      const anchor = `tpl-${t.name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
      return `<li><a href="#${anchor}"><code>${htmlEscape(t.name)}</code></a> — ${t.placeholders.length} placeholder(s)</li>`;
    })
    .join("");
  const taskBodies = docs.map((d) => renderTaskDoc(d, idToAnchor)).join("\n");
  const templateBodies = templates.map((t) => renderTemplateDoc(t)).join("\n");
  const playbookHtml = playbookYmlContent
    ? `<details><summary>playbook.yml</summary><pre><code>${htmlEscape(playbookYmlContent)}</code></pre></details>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${htmlEscape(playbookName)} — Converge docs</title>
<style>
  /* Self-contained styles — no external CSS or JS so the file is
     droppable into a chat or PR review without setup. */
  :root { color-scheme: light dark; }
  body { font: 14px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
         max-width: 980px; margin: 2rem auto; padding: 0 1.2rem; }
  h1 { margin-bottom: 0.2em; }
  h2 { margin-top: 2.2em; border-top: 1px solid #ccc; padding-top: 1em; }
  code { background: rgba(127,127,127,0.12); padding: 0.08em 0.32em;
         border-radius: 3px; font-size: 0.92em; }
  pre { background: rgba(127,127,127,0.08); padding: 0.8em;
        border-radius: 4px; overflow-x: auto; line-height: 1.4; }
  pre code { background: none; padding: 0; }
  dl.meta { display: grid; grid-template-columns: max-content 1fr;
            gap: 0.3em 1em; margin: 0.6em 0 1.2em; }
  dl.meta dt { font-weight: 600; color: #666; }
  dl.meta dd { margin: 0; }
  dl.meta ul { margin: 0; padding-left: 1.4em; }
  details > summary { cursor: pointer; padding: 0.3em 0; color: #555; }
  article.task { padding-bottom: 1em; }
  .title { font-style: italic; margin: -0.5em 0 0.5em; color: #555; }
  .desc { margin: 0.4em 0 1em; }
  .footer { color: #888; font-size: 0.85em; margin-top: 3em;
            border-top: 1px solid #ccc; padding-top: 1em; }
  nav.toc { background: rgba(127,127,127,0.06); padding: 0.8em 1.4em;
            border-radius: 4px; margin: 1em 0 2em; }
  nav.toc ul { margin: 0.3em 0 0; padding-left: 1.4em; }
</style>
</head>
<body>
<h1>${htmlEscape(playbookName)}</h1>
<p>${docs.length} task${docs.length === 1 ? "" : "s"}${templates.length > 0 ? ` &middot; ${templates.length} template${templates.length === 1 ? "" : "s"}` : ""} — generated ${htmlEscape(generatedAt)}</p>

${playbookHtml}

<nav class="toc">
  <strong>Tasks</strong>
  <ul>${tocHtml || "<li><em>(none)</em></li>"}</ul>
  ${
    templates.length > 0
      ? `<strong>Templates</strong>
  <ul>${templateTocHtml}</ul>`
      : ""
  }
</nav>

${taskBodies}

${templateBodies}

<p class="footer">Generated by <code>converge docs</code>.
   Re-run after editing any TASK.md to refresh.</p>
</body>
</html>
`;
}

export async function docsCommand({
  positional: _positional,
  options,
}: DocsCommandOptions): Promise<void> {
  const workspace = process.env.CONVERGE_WORKSPACE ?? process.cwd();
  const playbook = asString(options.playbook) ?? process.env.CONVERGE_PLAYBOOK;
  if (!playbook) {
    fail("--playbook is required (or set CONVERGE_PLAYBOOK env)");
  }
  const jsonOut = asBool(options.json);

  const playbookDir = join(workspace, ".converge", "playbooks", playbook!);
  if (!existsSync(playbookDir)) {
    fail(`playbook not found: ${playbookDir}`);
  }

  // Read playbook.yml (best effort — show in the rendered output).
  const playbookYmlPath = join(playbookDir, "playbook.yml");
  let playbookYml: string | null = null;
  if (existsSync(playbookYmlPath)) {
    try {
      playbookYml = readFileSync(playbookYmlPath, "utf-8");
    } catch {
      /* docs render even if playbook.yml is unreadable */
    }
  }

  // Discover every TASK.md under playbookDir.
  const taskMdFiles = findTaskMdFiles(playbookDir);
  const docs: TaskDoc[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  for (const taskMdPath of taskMdFiles) {
    try {
      const raw = readFileSync(taskMdPath, "utf-8");
      const shape = parseTaskMdString(raw);
      // The shape includes the body. Some templates have unresolved
      // {{var}} placeholders — we render them as-is for transparency.
      docs.push({
        id: shape.id || relative(playbookDir, taskMdPath),
        title: shape.title || shape.id || relative(playbookDir, taskMdPath),
        description: shape.description,
        taskMdPath: relative(workspace, taskMdPath),
        shape,
        body: shape.body ?? shape.prompt ?? "",
      });
    } catch (err) {
      errors.push({
        path: relative(workspace, taskMdPath),
        error: (err as Error)?.message ?? String(err),
      });
    }
  }

  docs.sort((a, b) => a.id.localeCompare(b.id));

  // Discover every TASK.md.tpl under playbookDir. These never get
  // executed directly — they're rendered at runtime with real vars
  // (see `converge render`). For docs purposes we show a synthetic
  // preview with `<var>` markers so operators can see what the
  // template produces and what variables it consumes.
  const templateFiles = findTaskMdTemplateFiles(playbookDir);
  const templateDocs: TemplateDoc[] = [];
  for (const tplPath of templateFiles) {
    try {
      const raw = readFileSync(tplPath, "utf-8");
      const { rendered, placeholders } = renderTemplatePreview(raw);
      // Derive a logical name from the parent directory (e.g.
      // `templates/work-item/TASK.md.tpl` → `work-item`).
      const rel = relative(playbookDir, tplPath);
      const segments = rel.split("/");
      const name =
        segments.length >= 2 ? segments[segments.length - 2] : rel;
      templateDocs.push({
        name,
        templatePath: relative(workspace, tplPath),
        rendered,
        placeholders,
      });
    } catch (err) {
      errors.push({
        path: relative(workspace, tplPath),
        error: (err as Error)?.message ?? String(err),
      });
    }
  }
  templateDocs.sort((a, b) => a.name.localeCompare(b.name));

  if (jsonOut) {
    console.log(
      JSON.stringify(
        {
          playbook,
          generatedAt: new Date().toISOString(),
          taskCount: docs.length,
          templateCount: templateDocs.length,
          errorCount: errors.length,
          tasks: docs.map((d) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            taskMdPath: d.taskMdPath,
            depends_on: d.shape.depends_on,
            inputs: d.shape.inputs,
            outputs: d.shape.outputs,
          })),
          templates: templateDocs.map((t) => ({
            name: t.name,
            templatePath: t.templatePath,
            placeholders: t.placeholders,
          })),
          errors,
        },
        null,
        2,
      ),
    );
    return;
  }

  const generatedAt = new Date().toISOString();
  const html = renderHtml(
    playbook!,
    playbookYml,
    docs,
    templateDocs,
    generatedAt,
  );

  // Output path: --out flag, or default to .converge/docs/<playbook>.html
  const outFlag = asString(options.out);
  const outPath = outFlag
    ? isAbsolute(outFlag)
      ? outFlag
      : resolve(workspace, outFlag)
    : join(workspace, ".converge", "docs", `${playbook}.html`);

  mkdirSync(outPath.replace(/[/\\][^/\\]+$/, ""), { recursive: true });
  writeFileSync(outPath, html, "utf-8");

  console.log(
    `converge docs: ${docs.length} task(s)${
      templateDocs.length > 0 ? `, ${templateDocs.length} template(s)` : ""
    } → ${outPath}`,
  );
  if (errors.length > 0) {
    console.warn(
      `  ${errors.length} TASK.md file(s) had parse errors and were skipped:`,
    );
    for (const e of errors) {
      console.warn(`    ${e.path}: ${e.error.split("\n")[0]}`);
    }
  }
  // statSync sanity for human-friendly size hint
  try {
    const size = statSync(outPath).size;
    console.log(`  size: ${(size / 1024).toFixed(1)} KB`);
  } catch {
    /* size hint is best-effort */
  }
}
