// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwind from '@tailwindcss/vite';
import icon from 'astro-icon';

const sidebar = [
  {
    label: 'Getting Started',
    autogenerate: { directory: 'getting-started' },
  },
  {
    label: 'Examples',
    autogenerate: { directory: 'examples' },
  },
  {
    label: 'Guides',
    autogenerate: { directory: 'guides' },
  },
  {
    label: 'Concepts',
    autogenerate: { directory: 'concepts' },
  },
  {
    label: 'Reference',
    autogenerate: { directory: 'reference' },
  },
  {
    label: 'Troubleshooting',
    autogenerate: { directory: 'troubleshooting' },
  },
  {
    label: 'Advanced',
    autogenerate: { directory: 'advanced' },
  },
];

export default defineConfig({
  site: 'https://converge.dev',
  output: 'static',
  adapter: process.env.CLOUDFLARE_ADAPTER ? cloudflare() : undefined,
  integrations: [
    sitemap(),
    icon(),
    starlight({
      title: 'Converge',
      sidebar,
      social: [{ label: 'GitHub', icon: 'github', href: 'https://github.com/myanlabs/converge' }],
      pagefind: true,
      expressiveCode: false,
    }),
  ],
  vite: {
    plugins: [tailwind()],
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
});
