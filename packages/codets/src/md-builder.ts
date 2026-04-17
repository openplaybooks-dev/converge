/**
 * MdBuilder — markdown-aware text emitter built on CoreBuilder.
 *
 * Extends CoreBuilder with heading, list, table, and code-block helpers
 * for emitting structured markdown documents.
 */

import { CoreBuilder } from './core-builder.ts';

export class MdBuilder extends CoreBuilder {
  /** Heading level 1 followed by a blank line. */
  h1(text: string): this { return this.line(`# ${text}`).blank(); }

  /** Heading level 2 followed by a blank line. */
  h2(text: string): this { return this.line(`## ${text}`).blank(); }

  /** Heading level 3 followed by a blank line. */
  h3(text: string): this { return this.line(`### ${text}`).blank(); }

  /** Key-value bullet: `- **key:** value` */
  kv(key: string, value: string | number): this {
    return this.line(`- **${key}:** ${value}`);
  }

  /** Plain bullet: `- text` */
  bullet(text: string): this { return this.line(`- ${text}`); }

  /** Code bullet: `` - `code` — description `` */
  codeBullet(code: string, desc?: string): this {
    return this.line(`- \`${code}\`${desc ? ` — ${desc}` : ''}`);
  }

  /** Bold bullet: `- **name** (detail)` */
  boldBullet(name: string, detail?: string): this {
    return this.line(`- **${name}**${detail ? ` (${detail})` : ''}`);
  }

  /** Markdown table with header row and data rows. */
  table(headers: string[], rows: string[][]): this {
    this.line(`| ${headers.join(' | ')} |`);
    this.line(`|${headers.map(() => '---|').join('')}`);
    for (const row of rows) {
      this.line(`| ${row.join(' | ')} |`);
    }
    return this;
  }

  /** Fenced code block. */
  codeBlock(lang: string, code: string): this {
    this.line('```' + lang);
    this.rawBlock(code);
    return this.line('```');
  }
}
