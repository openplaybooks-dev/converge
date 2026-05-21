## Background

Previously, tables, views, APIs, UI components, UseCases, and other implementations related to the daily report feature were developed. However, they are no longer used in production and nobody is using them anymore. Despite this, they still remain widely across the codebase, DB schema, and documentation, causing the following issues:

* They create noise during new development (naming conflicts, unnecessary search hits, and the risk of accidental references)
* The DB schema and views have become bloated, increasing the cost of migrations and type generation
* The domain term “daily report” overlaps between the old implementation and new specifications, making misunderstandings more likely

Going forward, a new daily-report-equivalent feature will be designed and implemented as Growth Log (`.kiro/specs/growth-log/`).
The intention is to build it completely from scratch without inheriting any legacy assets. Therefore, as a prerequisite step, all existing unused implementations will be removed.

## Purpose

* Completely remove unused daily report related code and schemas to clean up the repository
* Ensure the new Growth Log implementation can proceed with a fresh design, without being constrained by previous implementations

## Scope

* Remove all layers related to:
  `daily_reports`, `daily_report_replies`, and `daily_report_deadline_rules`
  (DB / Domain / UseCase / Infrastructure / API / UI / Tests / Mocks / Seeds / Documentation)
* Identifying all removal targets is the responsibility of the assignee

## Out of Scope (Must NOT Be Deleted)

* `daily_attendance_audits` related features (attendance audits): currently active in `discipline-dashboard`
  Although the name includes “daily,” it is a separate feature unrelated to daily reports.
* Anything under `.kiro/specs/growth-log/`: these are the new upcoming specifications

## Definition of Done

* Zero references to old daily report tables, types, or components remain in the repository
* Attendance audit (`discipline-dashboard`) and existing dashboard-related screens continue to function correctly
* Type checks, linting, and tests are all green

## Notes

* The safest deletion order is:
  upstream dependencies (UI / API) → downstream layers (UseCase / Repository / DB)
* For DB changes, create new drop migrations instead of modifying existing migration history
* The granularity of PR splitting can be decided by the assignee
