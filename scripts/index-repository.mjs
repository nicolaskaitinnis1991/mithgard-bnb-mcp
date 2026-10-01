import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignored = new Set(['.git', 'node_modules', 'dist', 'coverage']);
const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile()) files.push(relative(root, path));
  }
};
walk(root);
files.sort();
const historical = (path) =>
  path.startsWith('docs/pitch/') ||
  path.startsWith('docs/specs/') ||
  path.startsWith('docs/prompts/') ||
  ['docs/PRODUCTION-GAP-PLAN.md', 'docs/AUDIT-2026-05-21.md'].includes(path);
const markdown = files.filter((path) => extname(path) === '.md' && path !== 'docs/INDEX.md');
const source = files.filter((path) => ['.ts', '.mjs', '.js', '.sh'].includes(extname(path)));
const link = (path) => `[${path}](../${encodeURI(path)})`;
const rows = source.map((path) => {
  const content = readFileSync(resolve(root, path), 'utf8');
  const lines = content.length === 0 ? 0 : content.trimEnd().split('\n').length;
  const hash = createHash('sha256').update(content).digest('hex');
  return `| ${link(path)} | ${lines} | \`${hash}\` |`;
});
const content = `# Repository index\n\nGenerated with npm run docs:index. This inventory detects changes; it does not establish that every line is correct.\n\n## Markdown documents (${markdown.length})\n\n${markdown.map((path) => `- ${link(path)}${historical(path) ? ' — historical reference' : ''}`).join('\n')}\n\n## Source and test inventory (${source.length})\n\n| File | Lines | SHA-256 |\n| --- | ---: | --- |\n${rows.join('\n')}\n`;
if (process.argv.includes('--check')) {
  const index = resolve(root, 'docs/INDEX.md');
  if (!existsSync(index) || readFileSync(index, 'utf8') !== content) {
    throw new Error('Repository index is stale; run npm run docs:index');
  }
  const broken = [];
  for (const path of [...markdown, 'docs/INDEX.md'].filter((path) => !historical(path))) {
    const text = readFileSync(resolve(root, path), 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const href = match[1].replace(/^<|>$/g, '');
      if (/^(?:[a-z]+:|#|\/)/i.test(href)) continue;
      const target = decodeURI(href.split('#')[0]);
      if (!existsSync(resolve(root, dirname(path), target))) broken.push(`${path}: ${href}`);
    }
  }
  if (broken.length) throw new Error(`Broken local Markdown links:\n${broken.join('\n')}`);
  process.stdout.write(
    `Index current: ${markdown.length} documents, ${source.length} source/test files; local links valid.\n`,
  );
} else {
  writeFileSync(resolve(root, 'docs/INDEX.md'), content);
  process.stdout.write(
    `Indexed ${markdown.length} documents and ${source.length} source/test files.\n`,
  );
}
