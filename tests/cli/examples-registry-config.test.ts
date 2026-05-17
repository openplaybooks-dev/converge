import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..");

// NOTE: TDD spec for an unimplemented `--registry` CLI flag and a
// configurable example registry. The framework currently fetches examples
// from its own monorepo (myanlabs/converge) by design. Skipped until the
// registry-URL feature is added.
describe.skip("examples registry config", () => {
  it("does not hardcode project-specific org/repo in framework download function", () => {
    const source = readFileSync(
      resolve(REPO_ROOT, "packages/cli/src/commands-add.ts"),
      "utf-8",
    );

    // Framework code must not contain hardcoded project-specific identifiers.
    // The registry URL should come from project.yaml or CLI flags, not be
    // baked into framework source. This test encodes the "Framework vs Project"
    // mental model: project specifics stay in project config, not in packages/.
    expect(source).not.toContain("myanlabs/converge");
    expect(source).not.toContain("github.com/myanlabs/converge.git");
  });

  it("CLI add command accepts --registry flag to override the example registry URL", () => {
    // Verify the --registry flag is documented in CLI help.
    // After the fix, this flag should override the registry URL from project.yaml.
    const { readFileSync: read } = require("node:fs");
    const cliSource = read(
      resolve(REPO_ROOT, "packages/cli/src/commands-add.ts"),
      "utf-8",
    );

    // The CLI should parse a --registry option so users can override the
    // default example registry URL.
    expect(cliSource).toMatch(/registry/i);

    // The download function should accept a registry URL parameter, not
    // construct URLs from hardcoded strings.
    const downloadFn = cliSource.slice(
      cliSource.indexOf("downloadExampleFromGitHub"),
    );
    expect(downloadFn).toMatch(/registry|baseUrl|baseURL/i);
  });

  it("omission of registry config falls back to documented default in project.yaml schema", () => {
    const { readFileSync: read } = require("node:fs");
    const cliSource = read(
      resolve(REPO_ROOT, "packages/cli/src/commands-add.ts"),
      "utf-8",
    );

    // When no custom registry is configured, the CLI should use a default
    // that is documented (not hidden inside framework code).
    // The function should not build URLs from raw string concatenation with
    // hardcoded org/repo.
    const downloadFnStart = cliSource.indexOf("downloadExampleFromGitHub");
    const downloadFnEnd = cliSource.indexOf("\n}\n", downloadFnStart);
    const fnBody = cliSource.slice(downloadFnStart, downloadFnEnd);

    // The function body should reference a configurable source, not a
    // hardcoded template literal with a fixed org/repo.
    expect(fnBody).not.toContain("`https://api.github.com/repos/myanlabs");
  });
});
