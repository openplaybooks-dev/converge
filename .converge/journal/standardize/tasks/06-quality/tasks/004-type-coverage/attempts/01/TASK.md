# Task: 06-quality/004-type-coverage

Verify TypeScript strict mode compliance across all packages.

**Process**:

1. **Check tsconfig settings** — for each package:
   - Is `strict: true` enabled?
   - Are additional strict flags enabled? (noUncheckedIndexedAccess, etc.)
   - What is the `target` and `module` setting?

2. **Run type checking**:
   - `npx tsc --noEmit` for each package
   - Capture any type errors

3. **Assess type coverage**:
   - Count `any` types: `grep -r ': any' --include='*.ts' packages/ | grep -v node_modules | grep -v '.d.ts'`
   - Count `@ts-ignore` / `@ts-expect-error` usage
   - Count type assertions (`as any`, `as unknown`)

4. **Write report** to `.converge/standardize-state/quality/type-report.json`:
```json
{
  "packages": [
    {
      "name": "@converge/core",
      "path": "packages/core",
      "strict": true,
      "typeErrors": 0,
      "anyCount": 5,
      "tsIgnoreCount": 2,
      "typeAssertions": 3
    }
  ],
  "totalTypeErrors": 0,
  "totalAnyUsage": 15,
  "totalTsIgnore": 4,
  "recommendations": [
    "Consider replacing 'any' in src/executor/spawn-runner.ts:42"
  ]
}
```

Do NOT fix type errors in this task — just report them.
Type fixes should be handled in separate tasks.