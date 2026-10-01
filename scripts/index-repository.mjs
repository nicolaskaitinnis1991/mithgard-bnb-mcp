import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import ts from 'typescript';
import { repositoryFiles } from './repository-files.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generated = new Set(['docs/INDEX.md', 'docs/FUNCTIONS.md']);
// Git's ignore rules exclude dependencies, reports, build output and local secrets.
const files = [...new Set([...repositoryFiles(root), ...generated])].sort();
const historical = (path) =>
  path.startsWith('docs/pitch/') ||
  path.startsWith('docs/specs/') ||
  path.startsWith('docs/prompts/') ||
  ['docs/PRODUCTION-GAP-PLAN.md', 'docs/AUDIT-2026-05-21.md'].includes(path);
const markdown = files.filter((path) => extname(path) === '.md' && !generated.has(path));
const source = files.filter(
  (path) => ['.ts', '.mjs', '.js', '.sh'].includes(extname(path)) || path.startsWith('.husky/'),
);
const link = (path) => `[${path}](../${encodeURI(path)})`;
const hash = (path) =>
  createHash('sha256')
    .update(readFileSync(resolve(root, path)))
    .digest('hex');
const row = (path) => `| ${link(path)} | \`${hash(path)}\` |`;
const plan = JSON.parse(readFileSync(resolve(root, 'docs/acceptance/plan.json'), 'utf8'));
const functions = [];
for (const path of source.filter((path) => /\.(?:ts|mjs|js)$/.test(path))) {
  const text = readFileSync(resolve(root, path), 'utf8');
  const ast = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  );
  const visit = (node) => {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)
    ) {
      const line = ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1;
      const owner = node.parent;
      const name = ts.isConstructorDeclaration(node)
        ? 'constructor'
        : (node.name?.getText(ast) ??
          (owner && (ts.isVariableDeclaration(owner) || ts.isPropertyAssignment(owner))
            ? owner.name.getText(ast)
            : `callback@${line}`));
      const areas =
        plan.areas
          .filter(
            (area) =>
              area.source.some((entry) => path === entry || path.startsWith(`${entry}/`)) ||
              area.tests.includes(path),
          )
          .map((area) => area.id)
          .join(', ') || 'shared / auxiliary';
      functions.push({ path, name: name.replaceAll('|', '\\|').replaceAll('`', ''), line, areas });
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
}
const content = `# Repository index\n\nGenerated with npm run docs:index from Git-tracked/non-ignored files, or the verified ignore-rule fallback in a source archive. SHA-256 covers file contents, including Markdown, fixtures, configuration and lockfile. Generated INDEX/FUNCTIONS are checked by regeneration and excluded from the hash tables to prevent cycles. Ignored dependencies, build/coverage output, reports and local secrets are excluded. An inventory establishes traceability, not correctness of every line.\n\n[Function and method inventory](FUNCTIONS.md) · [Acceptance plan](acceptance-plan.md)\n\n## Markdown documents (${markdown.length})\n\n| File | SHA-256 |\n| --- | --- |\n${markdown.map((path) => `${row(path)}${historical(path) ? ' <!-- historical reference -->' : ''}`).join('\n')}\n\n## Source and test inventory (${source.length})\n\n| File | SHA-256 |\n| --- | --- |\n${source.map(row).join('\n')}\n\n## Other maintained files\n\n| File | SHA-256 |\n| --- | --- |\n${files
  .filter((path) => !source.includes(path) && !markdown.includes(path) && !generated.has(path))
  .map(row)
  .join('\n')}\n`;
const functionContent = `# Function and method inventory\n\nGenerated with TypeScript's syntax tree: declarations, expressions, arrow callbacks, methods, constructors and accessors in maintained JS/TS code, including tests. Line numbers locate declarations; acceptance-area labels are source/test ownership mappings, not proof of individual function coverage. Coverage and executed test names are recorded separately in the acceptance report.\n\n${functions.length} syntax-tree entries in ${new Set(functions.map((entry) => entry.path)).size} files.\n\n| File / line | Function or method | Acceptance area |\n| --- | --- | --- |\n${functions.map((entry) => `| [${entry.path}:${entry.line}](../${encodeURI(entry.path)}#L${entry.line}) | \`${entry.name}\` | ${entry.areas} |`).join('\n')}\n`;
const expected = new Map([
  ['docs/INDEX.md', content],
  ['docs/FUNCTIONS.md', functionContent],
]);
if (process.argv.includes('--check')) {
  for (const [path, value] of expected) {
    if (!existsSync(resolve(root, path)) || readFileSync(resolve(root, path), 'utf8') !== value)
      throw new Error(`${path} is stale; run npm run docs:index`);
  }
  const broken = [];
  for (const path of [...markdown, ...generated].filter((path) => !historical(path))) {
    const text = readFileSync(resolve(root, path), 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const href = match[1].replace(/^<|>$/g, '');
      if (/^(?:[a-z]+:|#|\/)/i.test(href)) continue;
      const target = decodeURI(href.split('#')[0]);
      if (!existsSync(resolve(root, dirname(path), target))) broken.push(`${path}: ${href}`);
    }
  }
  if (broken.length) throw new Error(`Broken local Markdown file links:\n${broken.join('\n')}`);
  process.stdout.write(
    `Index current: ${files.length} files, ${markdown.length} Markdown hashes, ${functions.length} functions/methods; local file targets valid (anchors are not verified).\n`,
  );
} else {
  for (const [path, value] of expected) writeFileSync(resolve(root, path), value);
  process.stdout.write(
    `Indexed ${files.length} files, ${markdown.length} Markdown hashes and ${functions.length} functions/methods.\n`,
  );
}
