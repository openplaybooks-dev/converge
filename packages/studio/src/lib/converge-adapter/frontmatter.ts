/**
 * NOTE: gray-matter's YAML serializer reformats keys; comments and exact quoting
 * are NOT preserved on round-trip. This is a known limitation — do not rely on
 * preserving original frontmatter formatting.
 */
import matter from 'gray-matter';

export function parseFrontmatter(text: string): { data: Record<string, unknown>; content: string } {
  const parsed = matter(text);
  return { data: parsed.data as Record<string, unknown>, content: parsed.content };
}

export function serializeFrontmatter(data: Record<string, unknown>, content: string): string {
  return matter.stringify(content, data);
}
