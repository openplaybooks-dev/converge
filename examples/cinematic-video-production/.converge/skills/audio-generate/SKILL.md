---
name: audio-generate
description: Generate dialogue TTS, SFX, or score via a configurable backend. Adapter — backends live under backends/.
---

# audio-generate

Adapter for three distinct audio generation modes. Backends live under `backends/` and are selected via a mode-specific ACTIVE file.

## Contracts

### TTS

```ts
// input
{
  mode: "tts",
  text: string,
  voice_spec: {
    id: string,
    gender: "male" | "female" | "nonbinary",
    age_band: "child" | "teen" | "young-adult" | "adult" | "elderly",
    pitch: "low" | "medium" | "high",
    accent: string,
    timbre: string,
    delivery: string,
    reference_actor?: string
  },
  style_notes?: string,       // dialogue delivery hint pulled from audio-style.md
  output_path: string
}

// output
{
  audio_path: string,         // wav, 48kHz, mono
  duration_s: number,
  model: string,
  cost_usd: number | null
}
```

### SFX

```ts
// input
{
  mode: "sfx",
  description: string,        // e.g. "wind gust", "lamp ignition"
  duration_s: number,
  style_notes?: string,
  output_path: string
}

// output
{
  audio_path: string,         // wav, 48kHz, stereo
  duration_s: number,
  model: string,
  cost_usd: number | null
}
```

### Score

```ts
// input
{
  mode: "score",
  mood: string,
  duration_s: number,
  bpm_range?: string,         // e.g. "50-70"
  instrumentation?: string,
  reference_style?: string,
  output_path: string
}

// output
{
  audio_path: string,         // wav, 48kHz, stereo
  duration_s: number,
  model: string,
  cost_usd: number | null
}
```

## Procedure

1. Read `backends/ACTIVE-<mode>` (e.g. `ACTIVE-tts`) for the active backend name.
2. Load `backends/<backend>/<mode>.js` and call its `export async function <mode>(input)`.
3. Forward output as-is.
4. Log to `.converge/logs/audio-generate.log` (one JSON line per call).

## Stub behavior

The stub backend writes a 1KB silent WAV (RIFF header + 48kHz/mono silence) for every mode. Passes file-existence and size checks; produces no real audio.

## Suggested real backends (not shipped)

| Mode       | Suggested provider                                     |
| ---------- | ------------------------------------------------------ |
| tts        | ElevenLabs, Google TTS, OpenAI TTS, Cartesia           |
| sfx        | ElevenLabs SFX, Stable Audio Open, MMAudio             |
| score      | Suno, Udio, Stable Audio, AIVA                         |

## Environment

Each backend reads its own env vars (e.g. `ELEVENLABS_API_KEY`). See each backend's README.

## Consistency contract

- TTS backends MUST preserve voice identity across calls with the same `voice_spec.id`. If the backend exposes voice cloning, provision a cloned voice per spec and cache the voice-id keyed by `voice_spec.id`.
- Score backends MUST respect the `duration_s` exactly (±0.5s) — shots depend on timeline math.
