# meshy-rig backends

Auto-rigging adapter. See `../SKILL.md` for the contract.

```bash
echo meshy > ACTIVE   # real Meshy rigging API
echo stub  > ACTIVE   # copies input GLB through, fakes rig_task_id
```

The stub does NOT actually rig — downstream meshy-animate stub will produce a placeholder animation regardless. Sufficient for offline pipeline validation.
