import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

// Archive fallback mirrors this repository's ignore rules. Acceptance checks
// equivalence with Git's inventory before packaging, rather than assuming it.
export const archiveFiles = (root) => {
  const ignoredDirectories = new Set([
    '.git',
    'node_modules',
    'dist',
    'build',
    'coverage',
    'reports',
    '.vscode',
    '.idea',
    '.nyc_output',
    '.cache',
  ]);
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name);
      const path = relative(root, absolute);
      if (
        ignoredDirectories.has(entry.name) ||
        path === '.husky/_' ||
        path === '.claude/launch.json'
      )
        continue;
      if (entry.isDirectory()) walk(absolute);
      else if (
        entry.isFile() &&
        !/^(?:\.env|\.env\.local|\.env\..*\.local|\.DS_Store|audit\.md|audit-.*\.md)$/.test(
          entry.name,
        ) &&
        !/\.(?:log|tsbuildinfo)$/.test(entry.name)
      )
        files.push(path);
    }
  };
  walk(root);
  return files.sort();
};
export const repositoryFiles = (root) => {
  if (!existsSync(resolve(root, '.git'))) return archiveFiles(root);
  return [
    ...new Set(
      execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
        cwd: root,
        encoding: 'utf8',
      })
        .split('\0')
        .filter(Boolean),
    ),
  ]
    .filter((file) => existsSync(resolve(root, file)))
    .sort();
};
