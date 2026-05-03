# Per-playbook migration plan

## cli-redesign
| Parent | Children |
|--------|----------|
| 01-foundations | 01-select-parser, 02-manifest-rw, 03-task-hashes |
| 01-select-parser | 01-red, 02-green |
| 02-manifest-rw | 01-red, 02-green |
| 03-task-hashes | 01-red, 02-green |
| 02-compile-and-list | 01-fixture, 02-compile, 03-list, 04-compile-seed |
| 01-fixture | 01-red, 02-green |
| 02-compile | 01-red, 02-green |
| 03-list | 01-red, 02-green |
| 04-compile-seed | 01-red, 02-green |
| 03-execution-verbs | from_seed: [per-verb] |
| 00-remove-auto-revalidate | 01-red, 02-green |
| build | 01-red, 02-green |
| clean | 01-red, 02-green |
| retry | 01-red, 02-green |
| run | 01-red, 02-green |
| test | 01-red, 02-green |
| 04-staleness | 01-modified-ladder, 02-run-results-hashes, 03-drift, 04-debug-revalidate |
| 01-modified-ladder | 01-red, 02-green |
| 02-run-results-hashes | 01-red, 02-green |
| 03-drift | 01-red, 02-green |
| 04-debug-revalidate | 01-red, 02-green |
| 05-incremental-and-freshness | 01-incremental, 02-full-refresh, 03-source-freshness |
| 01-incremental | 01-red, 02-green |
| 02-full-refresh | 01-red, 02-green |
| 03-source-freshness | 01-red, 02-green |
| 06-migration | 01-redirects, 02-deps-and-init-from-prompt, 03-docs-site |
| 01-redirects | 01-red, 02-green |
| 02-deps-and-init-from-prompt | 01-red, 02-green |
| 03-docs-site | 01-red, 02-green |

## dbt-paradigm
| Parent | Children |
|--------|----------|
| 01-survey-and-catalog | 00-contract-probe |
| 02-rename-wbs-to-seeds | from_seed: - type: nodejs |
| 03-reusable-checks-api | 03a-test-schema, 03b-check-union-and-ref-parser, 03c-test-expander, 03d-discovery-and-scripts, 03e-test-selectors, 03f-checks-migration |
| 04-clean-break | 04a-remove-redirects, 04b-remove-dead-code, 04c-remove-v1-checkpoint, 04d-clean-exports, 04e-update-help |
