# Task: 02-docs/008-changelog

Create CHANGELOG.md following Keep a Changelog format.

**Format**: https://keepachangelog.com/en/1.1.0/

**Content**:
1. Header explaining the changelog format and versioning
2. `[Unreleased]` section with current changes:
   - **Changed**: Renamed from "harness" to "Converge"
   - **Added**: Standardization playbook
   - **Added**: Comprehensive documentation
   - List other notable recent changes from git log
3. `[0.1.0]` section for initial public release (placeholder)

**Process**:
1. Run `git log --oneline -50` to review recent history
2. Group changes by type: Added, Changed, Deprecated, Removed, Fixed, Security
3. Write in user-facing language, not commit messages

**Note**: This is the root CHANGELOG. Individual packages may have their own.