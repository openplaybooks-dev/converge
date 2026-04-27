export const prerender = true;
import { OGImageRoute } from 'astro-og-canvas';
import { getCollection } from 'astro:content';

const posts = await getCollection('blog');

const pages = Object.fromEntries(
  posts
    .filter((p) => !p.data.draft)
    .map((p) => [
      p.id.replace(/\.mdx?$/, ''),
      { title: p.data.title, description: p.data.description },
    ]),
);

const og = await OGImageRoute({
  pages,
  param: 'slug',
  getImageOptions: (slug, page) => ({
    title: page.title,
    description: page.description,
    bgGradient: [[15, 17, 23], [30, 41, 59]],
    border: { color: [99, 102, 241], width: 4, side: 'inline-start' },
    padding: 60,
    font: {
      title: { size: 64, color: [248, 250, 252], weight: 'Bold' },
      description: { size: 28, color: [148, 163, 184], lineHeight: 1.4 },
    },
    logo: { path: './public/favicon.svg', size: [60, 60] },
  }),
});

export const getStaticPaths = og.getStaticPaths;
export const GET = og.GET;
