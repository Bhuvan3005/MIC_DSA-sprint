import { writeFile } from 'node:fs/promises';

const apiUrl = URL.parse(process.env.CODESPRINT_API_ORIGIN ?? '');
if (!apiUrl || apiUrl.protocol !== 'https:' || apiUrl.username || apiUrl.password ||
    apiUrl.pathname !== '/' || apiUrl.search || apiUrl.hash) {
  throw new Error('Set CODESPRINT_API_ORIGIN to the HTTPS origin of the Express API.');
}

await writeFile(new URL('./dist/_redirects', import.meta.url), [
  `/api/* ${apiUrl.origin}/api/:splat 200`,
  '/* /index.html 200',
  '',
].join('\n'));
