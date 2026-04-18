# Task: 06-quality/002-build-verify

Verify all packages in the monorepo build cleanly.

**Process**:

1. **Identify build commands** — read root package.json and each
   package's package.json for build scripts

2. **Build each package**:
   - Run the build command for each package
   - Capture stdout/stderr
   - Record success/failure and any warnings

3. **Verify build outputs**:
   - Check that expected output files exist (dist/, lib/, build/)
   - Verify TypeScript declaration files (.d.ts) are generated
   - Check that no source files leak into build output

4. **Write report** to `.converge/standardize-state/quality/build-report.json`:
```json
{
  "success": true,
  "packages": [
    {
      "name": "@converge/core",
      "path": "packages/core",
      "buildCommand": "npm run build",
      "success": true,
      "warnings": [],
      "outputFiles": 42
    }
  ],
  "failedPackages": [],
  "totalWarnings": 0
}
```

If any package fails to build, diagnose and fix the issue before
writing the final report.