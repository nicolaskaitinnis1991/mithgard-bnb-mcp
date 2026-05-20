import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';

// Spawn via tsx so this test does not require a prior `npm run build`.
// The behaviour we're verifying (--version / --help) is identical whether
// the entry is `dist/index.js` or `src/index.ts` because the flag parser
// runs before any side-effectful module wires up.
const runCli = (...args: string[]) =>
  spawnSync('node', ['--import', 'tsx', 'src/index.ts', ...args], {
    encoding: 'utf8',
  });

describe('CLI flags', () => {
  it('--version prints version and exits 0', () => {
    const r = runCli('--version');
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/);
  });

  it('-v shorthand also prints version', () => {
    const r = runCli('-v');
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/);
  });

  it('--help prints usage and exits 0', () => {
    const r = runCli('--help');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('USAGE');
    expect(r.stdout).toContain('--version');
    expect(r.stdout).toContain('--debug');
  });
});
