/**
 * Fan out one background-layer task per entry in `bg_layers`.
 *
 * `bg_layers` is a JSON array passed as a string so it survives the
 * var-substitution pass. Two shapes are accepted:
 *   1. legacy: ["far", "mid", "near"]
 *   2. structured: [
 *        { "id": "far",  "transparent": false, "transition_below": null  },
 *        { "id": "mid",  "transparent": true,  "transition_below": "far" },
 *        { "id": "near", "transparent": true,  "transition_below": "mid" }
 *      ]
 *
 * In the structured form each layer that has `transition_below` declares
 * an `inputs:` gate on the previous layer's PNG, so the runner serializes
 * generation (far → mid → near) instead of fanning out in parallel. The
 * generator script also reads the previous layer's bottom strip as a
 * secondary reference to produce smooth inter-layer transitions.
 *
 * Spawn id is `scene-{id}-bg-{layer.id}-NN` so the journal sorts the
 * layers in the order they appear in scenes.json.
 */

const LAYER_TASK = '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/02-background/wbs/templates/layer/TASK.md';

export async function run(ctx) {
  const { vars } = ctx;
  const sceneId = vars.scene_id;
  let raw = [];
  try {
    raw = JSON.parse(vars.bg_layers || '[]');
  } catch (err) {
    console.log(`  ⚠️  could not parse bg_layers (${err.message}) — skipping`);
    return;
  }
  if (!raw.length) {
    console.log('  bg_layers empty — no background layers to generate');
    return;
  }

  // Normalize both legacy strings and structured objects to one shape.
  const layers = raw.map((entry) => {
    if (typeof entry === 'string') {
      return { id: entry, transparent: false, transition_below: null, use_extraction: true };
    }
    return {
      id: entry.id,
      transparent: !!entry.transparent,
      transition_below: entry.transition_below ?? null,
      use_extraction: entry.use_extraction !== false, // default true
    };
  });

  console.log(`  Spawning ${layers.length} background layer task(s) for scene ${sceneId}`);
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const ordinal = String(i + 1).padStart(2, '0');
    const taskId = `scene-${sceneId}-bg-${ordinal}-${layer.id}`;
    // The leaf template declares two `inputs:` lines: concept.png and
    // a `transition_input_path` that the runner blocks on. For layers
    // with `transition_below`, that path is the previous layer's PNG;
    // for the FAR layer (no chaining), we point it at concept.png too so
    // it always exists and adds no extra gate.
    const transitionInputPath = layer.transition_below
      ? `assets/scenes/${sceneId}/bg-${layer.transition_below}.png`
      : `assets/scenes/${sceneId}/concept.png`;
    // The 01b-extract stage writes assets/scenes/<id>/extracted/bg-<layer>.png
    // for every layer with use_extraction=true. The script gracefully falls
    // back to image-gen when the file is absent, so we always pass the path —
    // it just may or may not exist on disk at run time.
    const extractedLayerPath = layer.use_extraction
      ? `assets/scenes/${sceneId}/extracted/bg-${layer.id}.png`
      : '';
    await ctx.spawn(
      {
        _type: 'template-ref',
        path: LAYER_TASK,
        vars: {
          scene_id: sceneId,
          layer: layer.id,
          transparent: layer.transparent ? 'true' : 'false',
          transition_below: layer.transition_below ?? '',
          transition_input_path: transitionInputPath,
          extracted_layer_path: extractedLayerPath,
        },
      },
      { id: taskId }
    );
    console.log(`    ✓ ${taskId}` +
      `${layer.transparent ? ' (transparent)' : ''}` +
      `${layer.transition_below ? ` (after bg-${layer.transition_below})` : ''}` +
      `${extractedLayerPath ? ' (with extracted seed)' : ''}`);
  }
}
