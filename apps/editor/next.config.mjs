import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ["@converge/core", "@converge/project-root"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  serverExternalPackages: ["chokidar"],
  reactStrictMode: true,
};

export default config;
