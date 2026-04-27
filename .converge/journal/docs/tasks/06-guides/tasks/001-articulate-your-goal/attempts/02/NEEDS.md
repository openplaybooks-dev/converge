# Needs: 06-guides/001-articulate-your-goal

## Inputs

- `docs/_examples.json`
- `examples/hello-world/.converge/playbooks/default/playbook.yml`

## Expected Outputs

- `docs/guides/articulate-your-goal.md`

## Checks

- **page-exists**: page exists
- **page-frontmatter**: title + sources frontmatter
- **covers-three-questions**: covers the three articulation questions (outputs, done, verify)
- **links-to-examples-or-from-problem**: links to examples or to the from-problem-to-playbook getting-started page
- **word-count-ok**: 600-1500 words
