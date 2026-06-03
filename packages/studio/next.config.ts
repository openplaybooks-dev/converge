import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  transpilePackages: ["@openplaybooks/converge-core"],
  serverExternalPackages: ["yaml"],
  // Emit a self-contained server under .next/standalone so the package can be
  // run via `npx @openplaybooks/converge-studio` without an install step.
  output: "standalone",
  // In a monorepo, root file-tracing at the workspace root so the traced
  // node_modules (including the workspace converge-core) land predictably at
  // .next/standalone/packages/studio/server.js.
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
};

export default nextConfig;
