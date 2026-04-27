# Needs: 04-getting-started/003-your-first-playbook

## Inputs

- `README.md`
- `examples`
- `packages/cli/src/commands.ts`

## Expected Outputs

- `docs/getting-started/your-first-playbook.md`

## Checks

- **page-exists**: page exists
- **shows-init**: walks through converge init
- **shows-run**: walks through converge run
- **shows-task-md**: shows the TASK.md file
- **shows-checks**: introduces the checks concept
- **word-count-tight**: <=1200 words (target 5 min read)
