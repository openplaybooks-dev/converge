Generate a 1024x1024 RGBA landscape preview for a 2D side-scrolling level. The base image provided is a preliminary skeleton draft; maintain its established composition, the general scale of elements, and the broad palette hues. However, fully replace its flat-vector rendering with a richly painted, polished finish, adhering strictly to the visual style demonstrated in the project's style master image and the Root Art Bible.

The visual style is characterized by a vibrant yet gentle, storybook-like fantasy aesthetic, bathed in soft, warm light. The overall mood is peaceful, inviting, and slightly fantastical, reminiscent of either early morning sunrise or late afternoon sunset.

**Brushwork, Texture, and Finish:**
The rendering style is that of a highly polished digital painting. Large areas, such as the sky and distant mountains, feature exceptionally smooth, almost airbrushed gradients, creating soft and ethereal transitions. Foreground elements—like grass, bushes, and rocks—exhibit subtle, hand-painted textural variations that suggest organic surfaces without being overtly "brushy," gritty, or displaying harsh visible strokes. Details are implied through precise color blending and soft light/shadow interactions rather than individual lines or pronounced textures. The finish is clean, smooth, and refined, consistent with production-ready illustration, not a concept sketch or photorealistic output.

**Palette in Practice:**
The color palette employs warm earth tones and cool atmospheric tones, saturated but never garish, ensuring clear separation between distinct visual layers.
*   **Sky:** The horizon transitions smoothly from a warm Sunset Yellow (#F3D9A1) into a serene Light Sky Blue (#AAD1F1) for the upper sky.
*   **Distant Mountains:** Rendered in desaturated, hazy Distant Mountain Blue (#92A6B2), sometimes leaning into a cool blue-violet, effectively conveying great distance through atmospheric perspective.
*   **Foliage:** Foreground grass utilizes Bright Grass Green (#76B44F), while denser bushes and shaded canopy areas transition to Deep Forest Green (#44772D). Mid-distance foliage adopts slightly desaturated versions of these greens. Canopies are distinctly clumpy and rounded.
*   **Ground and Path:** The walkable path and foreground earth are dominated by Dirt Path Brown (#A58052), with subtle variations in lightness to suggest packed soil and areas illuminated by the key light.
*   **Rocks and Boulders:** These feature a smooth, rounded grey-brown base, enriched with Leather Brown (#876041) for subtle rim warmth and polished highlights where light strikes.
*   **Accents:** When present as environmental pickups, magical elements or points of interest may utilize accent colors such as Vibrant Red (#E03E3E) for glowing liquids, Potion Glow Yellow (#FDFFA6) for sparkles and magical highlights, and Magic Purple Glow (#C372F7) for ethereal magical effects. These are used sparingly to draw attention and are subtly integrated into the painted style.

**Line & Shading:**
All linework is clean and understated. Outlines are soft, generally 1-2 pixels in weight, subtly thickening only at prominent silhouette breaks to enhance definition without appearing heavy or strict. Internal lines are lighter and integrate seamlessly into the shaded forms. The shading model is a refined cel shading, incorporating soft, subtle gradients for larger areas (sky, mountains, tree canopies) to avoid harsh banding. Smaller forms receive simple, clean shadows. The primary light source emanates from an above-front-right direction, casting soft shadows toward the left and rear. Highlights include small, clean specular spots on subtly reflective surfaces, and focused glows for any magical elements. Subtle rim lighting delineates edges facing the main light source.

**Environment & Forms:**
The dominant shape language is organic and rounded, particularly for all natural elements like trees, rocks, and hills. Sharp, jagged, or strictly geometric forms are absent for natural features.
*   **Trees / Foliage:** Trees feature lush, clumpy, and distinctly rounded canopies that suggest visible leaf clusters. Trunks are sturdy with natural, subtle texture. Bushes are rendered as soft, undulating mounds.
*   **Stone / Structure:** Boulders are smooth and rounded, conveying natural erosion, with subtle texture variation and highlights catching the key light.
*   **Ground / Terrain:** The ground plane extends as a real landscape volume from the contour line down to the canvas bottom, not merely a thin top slice. Grass tufts and scattered small foliage are integrated along the contour lines as accents, rather than forming a continuous strip.

**Atmospheric Depth:**
A pronounced atmospheric perspective is crucial. Distant elements are consistently rendered as more desaturated, lighter in value, and cooler in hue, creating a clear sense of haze fading. Conversely, closer, foreground elements are crisper, more saturated, and exhibit warmer tones, enhancing depth and visual priority. There must be a clear visual separation and atmospheric transition between foreground, mid-distance, and far background layers.

**Scene Landmarks (for a `demo-grassland` biome):**
Render the following environment landmarks while preserving their relative positions, scale, and broad colors from the base image, within a +/-3 percent tolerance:
*   **`mountain-distant`**: Located on the `bg-far` layer, typically spanning `(0,8)` and beyond. These are distant mountain silhouettes in hazy Distant Mountain Blue (#92A6B2) to blue-violet tones, with very low saturation. They are rendered as layered silhouettes with pronounced atmospheric perspective, featuring multiple peaks of varying height. Closer peaks should be subtly more saturated than the farther ones, but all remain highly desaturated. No surface detail is visible.
*   **`tree-cluster-mid`**: Situated on the `bg-mid` layer, approximately at `(4,10)` with a `3x4` footprint. This cluster consists of two or three broadleaf trees with lush, rounded canopies. They are slightly desaturated compared to foreground trees, with atmospheric haze pulling their palette towards the mid-distance tones. Trunks are short and stocky; canopies overlap softly.
*   **`ground-3w`**: A short run of grassy ground on the `play` layer, approximately `(0,11)` with a `3x1` footprint. This foreground earth section features Bright Grass Green (#76B44F) blades on top and a packed Dirt Path Brown (#A58052) body below.
*   **`ground`**: A solid section of foreground earth on the `play` layer, approximately `(3,11)` with a `5x1` footprint. It presents a continuous top edge of Bright Grass Green (#76B44F) grass blades and a uniform packed Dirt Path Brown (#A58052) body below. Subtle color variation in the grass tufts (lighter and darker) is encouraged.
*   **`rock`**: A single smooth grey boulder on the `play` layer, around `(8,11)` with a `1x1` footprint. This rounded form sits on the ground as a decoration. It features a soft highlight on its upper-right and a small, subtle ground shadow on its lower-left, using the Leather Brown (#876041) for rim warmth.
*   **`ground-10w`**: A long run of grassy ground on the `play` layer, approximately `(9,11)` with a `10x1` footprint. This is a main walkable stretch, with a continuous, subtly wavy grass top edge of Bright Grass Green (#76B44F) and a uniform packed-dirt body of Dirt Path Brown (#A58052).

**Hard Negatives:**
*   Absolutely no pixel art or 8-bit aesthetic; ensure smooth edges and full anti-aliasing.
*   Avoid jagged, sharp, or strictly geometric forms for any natural elements.
*   Do not produce photorealism, gritty textures, or dark/grungy moods.
*   No heavy outlines or thick strokes; linework must remain clean and subtle.
*   No chromatic aberration, lens flares, or post-processing filters.
*   Do not use complex lighting or shading schemes; shadows and highlights must remain clear and readable.
*   The final output must not contain any UI elements, HUD, text, characters, or screen overlays. Focus solely on the environment.
*   No neon or saturated rim lighting from external sources (the internal magical glow on accents, if present, is the only exception).
*   No 16-bit retro tile look or flat-vector/SVG appearance; every surface must read as fully painted.
