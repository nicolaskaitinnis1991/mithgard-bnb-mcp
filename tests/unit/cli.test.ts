import { describe, it, expect } from 'vitest';
import { parseArgs, USAGE } from '../../src/lib/cli.js';

describe('parseArgs', () => {
  it('detects --version', () => {
    expect(parseArgs(['--version'])).toEqual({ kind: 'version' });
  });
  it('detects -v shorthand', () => {
    expect(parseArgs(['-v'])).toEqual({ kind: 'version' });
  });
  it('detects --help', () => {
    expect(parseArgs(['--help'])).toEqual({ kind: 'help' });
  });
  it('detects -h shorthand', () => {
    expect(parseArgs(['-h'])).toEqual({ kind: 'help' });
  });
  it('returns run with debug=false by default', () => {
    expect(parseArgs([])).toEqual({ kind: 'run', debug: false });
  });
  it('returns run with debug=true when --debug present', () => {
    expect(parseArgs(['--debug'])).toEqual({ kind: 'run', debug: true });
  });
  it('--version wins over --debug (exit-early)', () => {
    expect(parseArgs(['--debug', '--version'])).toEqual({ kind: 'version' });
  });
});

describe('USAGE', () => {
  it('contains key sections required by --help', () => {
    expect(USAGE).toContain('USAGE');
    expect(USAGE).toContain('--version');
    expect(USAGE).toContain('--help');
    expect(USAGE).toContain('--debug');
  });
});
