---
scene_id: demo-grassland
layer: play-dynamic
parallax_layer: play
kind: dynamic
grid_size: [120, 12]
---

# play-dynamic

Engine-driven props at point spawn coordinates. **No map grid** —
these tokens animate / move / trigger at runtime; their position is
the initial spawn coord only. The painter doesn't render them; the
engine spawns animated sprites at runtime.

# props

```yaml
- { kind: spawn, token: spawn, at: [1, 11] }
- { kind: pickup, token: pickup-key, at: [37, 7] }
- { kind: pickup, token: pickup-potion, at: [45, 8] }
- { kind: exit, token: exit, at: [118, 11] }
```
