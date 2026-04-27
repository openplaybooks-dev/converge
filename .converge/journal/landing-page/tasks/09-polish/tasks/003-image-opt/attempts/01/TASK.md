# Task: 09-polish/003-image-opt

# Image wrapper

Wrap Astro's built-in `<Image>` so every image in the site gets optimal
defaults: modern format (AVIF / WebP), lazy loading, explicit dimensions
(prevents CLS).

## File

```astro
---
// apps/landing/src/components/ui/Image.astro
import { Image as AstroImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

interface Props {
  src:   ImageMetadata | string;
  alt:   string;             /* required — empty string allowed for decorative */
  width: number;
  height: number;
  /** 'avif' (smaller, slower decode) or 'webp' (broader support) */
  format?: 'avif' | 'webp';
  /** 'eager' for above-the-fold images (hero), default 'lazy' */
  loading?: 'eager' | 'lazy';
  class?: string;
}

const { src, alt, width, height, format = 'avif', loading = 'lazy', class: className } = Astro.props;
---

<AstroImage
  src={src}
  alt={alt}
  width={width}
  height={height}
  format={format}
  loading={loading}
  decoding="async"
  class={className}
/>
```

## Banned

- Plain `<img>` tags anywhere except `Header.astro` (small SVG icon doesn't need optimization). Always use `<Image>`.
- Omitting `width` / `height`. Without explicit dimensions, the image causes layout shift when it loads.
- `loading="eager"` for anything below the fold. Below-the-fold images should be lazy by default.