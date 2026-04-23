# Path-Based CLI Execution

Converge supports path-based command execution, allowing you to run commands on any project or playbook without changing directories. The `--playbook` flag has been removed in favor of this more intuitive path-based approach.

## Syntax

```bash
converge <path> <command> [options]
```

## Supported Path Types

### 1. Project Configuration Path

Point directly to a `project.yml` file:

```bash
converge examples/game-assets/.converge/project.yml run
converge examples/game-assets/.converge/project.yml status
converge examples/game-assets/.converge/project.yml verify
```

### 2. Playbook Configuration Path

Point directly to a `playbook.yml` file to run a specific playbook:

```bash
converge examples/game-assets/.converge/playbooks/default/playbook.yml run
converge examples/game-assets/.converge/playbooks/custom/playbook.yml status
converge .converge/playbooks/my-playbook/playbook.yml run --dry
```

**Note**: This replaces the old `--playbook` flag syntax.

### 3. Directory Path

Point to a directory containing a `.converge/project.yml`:

```bash
converge examples/game-assets status
converge examples/game-assets run
converge ../other-project verify
```

## How It Works

When you provide a path as the first argument:

1. **Project Path Detection**: If the path points to `project.yml`, the CLI extracts the project directory and runs the command there
2. **Playbook Path Detection**: If the path points to `playbook.yml`, the CLI extracts both the project directory and playbook name
3. **Directory Detection**: If the path is a directory with `.converge/project.yml`, it uses that as the project root

The CLI automatically injects `--dir` internally based on the detected path.

## Examples

### Run a specific playbook

```bash
# Old way (no longer supported)
cd examples/game-assets
converge run --playbook=default

# New path-based way (from anywhere)
converge examples/game-assets/.converge/playbooks/default/playbook.yml run
```

### Check status of a project

```bash
# Traditional way
cd examples/game-assets
converge status

# Path-based way
converge examples/game-assets/.converge/project.yml status
# Or simply
converge examples/game-assets status
```

### List playbooks in a project

```bash
converge examples/game-assets playbook list
```

### Run with additional options

```bash
converge examples/game-assets/.converge/playbooks/default/playbook.yml run --dry --verbose
converge examples/game-assets/.converge/project.yml run --max-iterations=50
```

## Migration from --playbook Flag

The `--playbook` flag has been removed. Update your commands:

```bash
# Old syntax (no longer supported)
converge run --playbook=default
converge run --playbook=custom --dry

# New syntax (path-based)
converge .converge/playbooks/default/playbook.yml run
converge .converge/playbooks/custom/playbook.yml run --dry
```

## Benefits

- **No directory changes**: Run commands from anywhere without `cd`
- **Explicit targeting**: Clear which project/playbook you're operating on
- **Scripting friendly**: Easier to write scripts that operate on multiple projects
- **IDE integration**: Better support for running commands from IDE terminals
- **Simplified CLI**: No need to remember flag names, path clearly indicates intent
- **Consistent API**: All commands support the same path-based syntax

## Backward Compatibility

All existing commands continue to work when run from within a project directory:

```bash
cd examples/game-assets
converge run      # Auto-detects .converge/playbooks/default/ or the only playbook
converge status
converge verify
```

**Auto-detection behavior:**
- If `.converge/playbooks/default/` exists, it's used automatically
- If only one playbook exists, it's used automatically
- If multiple playbooks exist and no default, you must use path-based execution

The path-based syntax is additive and doesn't break existing workflows, except for the removed `--playbook` flag which must be replaced with path-based playbook selection.
