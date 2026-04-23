/**
 * Gemini image generation backend — calls Python script with Gemini API.
 * Reads GEMINI_API_KEY from environment (set in project.yml).
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export async function generate({ prompt, references = [], aspect_ratio = "1:1", seed = "auto", quality = "final" }) {
  // Check for GEMINI_API_KEY
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set in environment');
  }

  // Create temp output file
  const tempOut = join(tmpdir(), `gemini_${Date.now()}.png`);
  
  // Build Python command
  const scriptPath = join(process.cwd(), 'scripts/lib/image_api.py');
  const pythonCode = `
import sys
sys.path.insert(0, '${join(process.cwd(), 'scripts')}')
from lib.image_api import generate_image
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
    // Execute Python script
    const result = execSync(`python3 -c ${JSON.stringify(pythonCode)}`, {
      env: { ...process.env },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const usedSeed = parseInt(result.trim());
    const imageBytes = readFileSync(tempOut);
    
    // Cleanup
    unlinkSync(tempOut);

    return {
      image_bytes: imageBytes,
      seed: usedSeed,
      model: "gemini-2.5-flash-image"
    };
  } catch (error) {
    throw new Error(`Gemini image generation failed: ${error.message}`);
  }
}
