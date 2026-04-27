import brand from './.content/brand.json' with { type: 'json' };

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,ts,jsx,tsx,md,mdx,svelte,vue}',
  ],
  theme: {
    extend: {
      colors: {
        bg:        brand.palette.bg,
        bgElev:    brand.palette.bgElev,
        indigo:    brand.palette.indigo,
        cyan:      brand.palette.cyan,
        violet:    brand.palette.violet,
        text:      brand.palette.text,
        textMuted: brand.palette.textMuted,
        textDim:   brand.palette.textDim,
        accent:    brand.palette.accent,
        border:    brand.palette.border,
      },
      fontFamily: {
        sans: [brand.typography.body, 'system-ui', 'sans-serif'],
        mono: [brand.typography.mono, 'monospace'],
        display: [brand.typography.display, 'system-ui', 'sans-serif'],
      },
    },
  },
};
