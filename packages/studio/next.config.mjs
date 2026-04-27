import path from 'node:path';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl({
  transpilePackages: ['@converge/core', '@converge/project-root'],
  outputFileTracingRoot: path.join(__dirname, '../..'),
  serverExternalPackages: ['chokidar'],
  images: { unoptimized: true },
});