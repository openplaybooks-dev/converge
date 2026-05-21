# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking

- **RFC 0034**: Ban `depends_on` from TASK.md frontmatter. Tasks at the same directory level are now auto-chained alphabetically by ID. Migration: `converge migrate --rfc=0034`.

### Changed

- Renamed project from "harness" to "Converge"

### Added

- Standardization playbook for project branding and documentation
- Comprehensive documentation including contributing guide, security policy, and ADRs
- Project banner and branding assets
- Root and core package README files

## [0.1.0] - Initial Release

### Added

- Monorepo structure with core, agentfn, codets, and kimifn packages
- Agent function runtime and skill system
- Goal evaluation and convergence engine
- Checkpoint and cursor-based execution model
- Task definition and WBS path resolution
- Plugin system with built-in git plugin
- CLI with run and inspect commands
- Journal-based session and progress tracking
- Filesystem-backed storage layer
