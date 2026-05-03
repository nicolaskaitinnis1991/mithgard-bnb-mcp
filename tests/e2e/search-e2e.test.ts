import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';

describe.skip('search e2e (live, run with E2E_LIVE=1)', () => {
  it('returns results for Berlin', async () => {
    if (process.env.E2E_LIVE !== '1') return;
    const proc = spawn('node', ['dist/index.js']);
    const req =
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'airbnb_search', arguments: { location: 'Berlin' } },
      }) + '\n';
    proc.stdin.write(req);
    const data = await new Promise<string>((resolve) => {
      proc.stdout.once('data', (b: Buffer) => {
        resolve(b.toString());
      });
    });
    proc.kill();
    const parsed = JSON.parse(data) as {
      result: { content: { text: string }[] };
    };
    expect(parsed.result.content[0]?.text).toContain('"results"');
  }, 30_000);
});
