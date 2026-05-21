# Glossary

The canonical glossary lives at [`docs/GLOSSARY.md`](../../../../docs/GLOSSARY.md) (source of truth).

This file is a pointer. Update `docs/GLOSSARY.md`, then re-sync the three skill trees:

```bash
cp -r skills/. .claude/skills/
cp -r skills/. packages/cli/skills/
```

The glossary covers: canonical APIs/types, context APIs (`ctx.*`), CLI verbs, environment variables, on-disk directory schema, TASK.md / playbook.yml frontmatter, core concepts, RFC status matrix, and a legacy → canonical drift table with ready-to-run `grep` commands.
