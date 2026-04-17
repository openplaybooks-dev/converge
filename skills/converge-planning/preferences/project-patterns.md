# Project Patterns Reference

Starter templates for common project types. Adapt to your specific needs — these are starting points, not rigid templates.

---

## Pattern 1: Full-Stack Web App (React + API)

### Epic Structure
```
01-requirements/
  001-gather-needs          # User interview → requirements.md
  002-define-data-model     # Data entities → data-models.md

02-foundation/
  001-scaffold-project      # Create project structure
  002-setup-design-system   # Design tokens, theme
  003-setup-database        # Schema, migrations

03-api/
  001-auth-endpoints        # Login, register, session
  002-crud-endpoints        # Core entity CRUD (WBS if many)
  003-business-endpoints    # Custom business logic

04-ui-screens/
  001-layout-shell          # Nav, sidebar, footer
  002-generate-pages        # Per-page generation (WBS)
  003-shared-components     # Reusable UI components

05-integration/
  001-connect-api           # Wire UI to API calls
  002-state-management      # Stores, context, data flow
  003-form-handling         # Validation, submission

06-polish/
  001-error-handling        # Error boundaries, fallbacks
  002-testing               # Unit + integration tests
  003-deploy-config         # CI/CD, environment config
```

### Key Facts Template
```markdown
- FACT: React + TypeScript + Vite frontend
- FACT: Express/Hono/Next API backend
- FACT: PostgreSQL/SQLite database
- FACT: JWT/session-based authentication
- FACT: Tailwind CSS for styling
```

### WBS Candidates
- `04.002-generate-pages` — One task per page from screen list
- `03.002-crud-endpoints` — One task per entity if many entities

---

## Pattern 2: API / Backend Service

### Epic Structure
```
01-requirements/
  001-api-specification     # Endpoint definitions → api-spec.md
  002-data-modeling         # Entity relationships → data-models.md

02-foundation/
  001-project-setup         # Scaffold, dependencies
  002-database-schema       # Tables, migrations, seeds
  003-auth-middleware        # Authentication layer

03-core-api/
  001-entity-endpoints      # CRUD for each entity (WBS)
  002-query-endpoints       # Search, filter, aggregate
  003-file-handling         # Upload, download, storage

04-business-logic/
  001-workflows             # Multi-step business processes
  002-integrations          # External API connectors
  003-background-jobs       # Async processing, queues

05-quality/
  001-input-validation      # Request validation, sanitization
  002-error-handling        # Consistent error responses
  003-integration-tests     # API test suite
  004-api-documentation     # OpenAPI/Swagger docs

06-deployment/
  001-docker-config         # Containerization
  002-ci-pipeline           # Test + deploy pipeline
  003-monitoring            # Health checks, logging, alerts
```

### Key Facts Template
```markdown
- FACT: REST API with JSON responses
- FACT: PostgreSQL with Prisma/Drizzle ORM
- FACT: JWT bearer token authentication
- FACT: Rate limiting: 100 req/min per user
- FACT: API versioning via URL prefix (/v1/)
```

---

## Pattern 3: Static Site / Content Site

### Epic Structure
```
01-requirements/
  001-content-inventory     # Pages, sections → sitemap.md
  002-design-brief          # Visual style → design-brief.md

02-foundation/
  001-project-setup         # SSG framework setup
  002-design-system         # Typography, colors, spacing
  003-layout-components     # Header, footer, navigation

03-content-pages/
  001-generate-pages        # Per-page generation (WBS)
  002-blog-system           # Blog listing, post template
  003-dynamic-sections      # Contact forms, newsletter

04-polish/
  001-seo-optimization      # Meta tags, sitemap, robots
  002-performance           # Image optimization, lazy loading
  003-accessibility         # WCAG compliance check
  004-deploy                # Hosting config, domain setup
```

---

## Pattern 4: Mobile App (React Native / PWA)

### Epic Structure
```
01-requirements/
  001-user-stories          # User flows → user-stories.md
  002-screen-inventory      # Screen list → screens.json

02-foundation/
  001-project-setup         # RN/PWA scaffold
  002-navigation            # Screen navigation setup
  003-design-system         # Mobile design tokens

03-screens/
  001-onboarding-flow       # Welcome, login, signup
  002-main-screens          # Core app screens (WBS)
  003-settings-screens      # Profile, preferences

04-data-layer/
  001-api-client            # API communication layer
  002-local-storage         # Offline data, caching
  003-state-management      # Global state stores

05-native-features/
  001-push-notifications    # Notification setup
  002-camera-media          # Camera, gallery access
  003-location-services     # GPS, maps integration

06-polish/
  001-offline-support       # Offline-first behavior
  002-testing               # Unit + E2E tests
  003-app-store-prep        # Icons, screenshots, metadata
```

---

## Pattern 5: Data Pipeline / ETL

### Epic Structure
```
01-requirements/
  001-source-inventory      # Data sources → sources.md
  002-transformation-spec   # Transform rules → transforms.md
  003-output-spec           # Target format → output-spec.md

02-ingestion/
  001-source-connectors     # Per-source connector (WBS)
  002-schema-detection      # Auto-detect schemas
  003-incremental-load      # Change detection

03-transformation/
  001-cleaning-rules        # Data cleaning pipeline
  002-enrichment            # Joins, lookups, calculations
  003-validation            # Data quality checks

04-output/
  001-target-writers        # Per-target writer (WBS)
  002-partitioning          # Time/key-based partitioning
  003-indexing              # Search indexes, aggregates

05-orchestration/
  001-scheduling            # Cron, trigger-based runs
  002-monitoring            # Pipeline health, alerts
  003-recovery              # Retry, dead-letter handling
```

---

## Pattern 6: CLI Tool / Library

### Epic Structure
```
01-requirements/
  001-command-spec          # Commands → cli-spec.md
  002-api-design            # Public API → api-design.md

02-foundation/
  001-project-setup         # Package scaffold
  002-cli-framework         # Arg parsing, help text
  003-config-system         # Config file loading

03-core-commands/
  001-primary-commands      # Main functionality (WBS if many)
  002-utility-commands      # Helper commands

04-quality/
  001-unit-tests            # Per-function tests
  002-integration-tests     # End-to-end CLI tests
  003-documentation         # README, man page, --help text

05-distribution/
  001-build-config          # Bundle, minify, tree-shake
  002-npm-publish           # Package.json, publish workflow
  003-ci-pipeline           # Test + publish pipeline
```

---

## Choosing a Pattern

| Project Type | Start With | WBS Likely? | Key Challenge |
|-------------|-----------|-------------|---------------|
| Full-stack web app | Pattern 1 | Yes (pages, endpoints) | Integration between layers |
| API service | Pattern 2 | Yes (endpoints, entities) | Data modeling, auth |
| Static/content site | Pattern 3 | Yes (pages) | Design consistency |
| Mobile app | Pattern 4 | Yes (screens) | Navigation, offline |
| Data pipeline | Pattern 5 | Yes (sources, targets) | Error handling, scale |
| CLI tool / library | Pattern 6 | Maybe (commands) | API design, testing |

---

## Adapting Patterns

### Adding Epics
If the project needs something not in the template:
```
# Add authentication epic between foundation and core
02-foundation/
03-authentication/     ← NEW
04-core-api/
```

### Removing Epics
If the project doesn't need something:
```
# No deployment needed yet? Remove it
06-deployment/         ← REMOVE (or defer)
```

### Merging Epics
If two epics are too small:
```
# Combine if <3 tasks each
05-quality/            ← Merge testing + docs
  001-unit-tests
  002-integration-tests
  003-documentation
```

### Splitting Epics
If an epic has >7 tasks:
```
# Split large epic
03-api-auth/           ← Auth endpoints
04-api-crud/           ← CRUD endpoints
05-api-business/       ← Business logic
```
