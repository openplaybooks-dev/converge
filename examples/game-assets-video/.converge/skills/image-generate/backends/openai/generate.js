/**
 * OpenAI gpt-image-1 backend — calls Python script with the OpenAI API.
 * Reads OPENAI_API_KEY from environment (set in project.yml or .env).
 */

import { execSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export async function generate({ prompt, references = [], aspect_ratio = "1:1", seed = "auto", quality = "final" }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set in environment');
  }

  const tempOut = join(tmpdir(), `openai_${Date.now()}.png`);

  const pythonCode = `
import sys
sys.path.insert(0, '${join(process.cwd(), 'scripts')}')
from lib.image_api_openai import generate_image
from pathlib import Path

refs = ${JSON.stringify(references)}
ref_paths = [Path(r) for r in refs] if refs else None

img_bytes, used_seed = generate_image(
    prompt=${JSON.stringify(prompt)},
    reference_paths=ref_paths,
    seed=${seed === 'auto' ? 'None' : seed},
    aspect_ratio=${JSON.stringify(aspect_ratio)},
    quality=${JSON.stringify(quality)}
)

with open(${JSON.stringify(tempOut)}, 'wb') as f:
    f.write(img_bytes)

print(used_seed)
`;

  try {
    const result = execSync(`python3 -c ${JSON.stringify(pythonCode)}`, {
      env: { ...process.env },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const usedSeed = parseInt(result.trim());
    const imageBytes = readFileSync(tempOut);
    unlinkSync(tempOut);

    return {
      image_bytes: imageBytes,
      seed: usedSeed,
      model: "gpt-image-1"
    };
  } catch (error) {
    throw new Error(`OpenAI image generation failed: ${error.message}`);
  }
}
