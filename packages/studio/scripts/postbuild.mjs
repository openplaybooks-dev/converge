#!/usr/bin/env node
/**
 * Post-build step for the Next.js standalone output.
 *
 * `next build` with `output: 'standalone'` emits a minimal server but does NOT
 * copy `.next/static` or `public/` into the standalone tree. The standalone
 * server expects them beside it, so copy them here.
 *
 * Uses Node's fs.cpSync for cross-platform behaviour (no `cp -r`).
 */
import { cpSync, existsSync } from "node:fs";
import path from "node:path";

const pkgRoot = path.join(import.meta.dirname, "..");
// outputFileTracingRoot is the workspace root, so the emitted server lives at
// .next/standalone/packages/studio/.
const standaloneDir = path.join(
  pkgRoot,
  ".next",
  "standalone",
  "packages",
  "studio",
);

if (!existsSync(standaloneDir)) {
  console.error(
    `[studio:postbuild] standalone dir not found at ${standaloneDir}.\n` +
      `  Did "next build" run with output: 'standalone'? Check next.config.ts.`,
  );
  process.exit(1);
}

const copies = [
  [
    path.join(pkgRoot, ".next", "static"),
    path.join(standaloneDir, ".next", "static"),
  ],
  [path.join(pkgRoot, "public"), path.join(standaloneDir, "public")],
];

for (const [src, dst] of copies) {
  if (!existsSync(src)) {
    console.warn(`[studio:postbuild] skip (missing): ${src}`);
    continue;
  }
  cpSync(src, dst, { recursive: true });
  console.log(
    `[studio:postbuild] copied ${path.relative(pkgRoot, src)} -> ${path.relative(pkgRoot, dst)}`,
  );
}
