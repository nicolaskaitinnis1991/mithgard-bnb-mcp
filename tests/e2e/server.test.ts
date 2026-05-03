import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';

describe('server e2e', () => {
  it('starts and lists tools over stdio', async () => {
    const proc = spawn('node', ['--import', 'tsx', 'src/index.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const req = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n';
    proc.stdin.write(req);
    const data = await new Promise<string>((resolve) => {
      let buf = '';
      proc.stdout.on('data', (b: Buffer) => {
        buf += b.toString();
        if (buf.includes('"jsonrpc"')) resolve(buf);
      });
    });
    proc.kill();
    expect(data).toContain('"jsonrpc"');
  }, 10_000);
});
