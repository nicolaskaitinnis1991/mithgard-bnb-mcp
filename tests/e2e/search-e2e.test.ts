import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe.skipIf(process.env.E2E_LIVE !== '1')('search e2e (explicit live opt-in)', () => {
  it('reads a current public Berlin search through initialized MCP', async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['dist/index.js'],
      stderr: 'pipe',
    });
    transport.stderr?.on('data', () => undefined);
    const client = new Client({ name: 'live-search-check', version: '1.0.0' });
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: 'airbnb_search',
        arguments: { location: 'Berlin', adults: 2 },
      });
      expect(result.isError, JSON.stringify(result.content)).toBe(false);
      const data = result.structuredContent as Record<string, unknown> | undefined;
      expect(data?._source).toBe('public');
      expect(Array.isArray(data?.results)).toBe(true);
      expect((data?.results as unknown[]).length).toBeGreaterThan(0);
    } finally {
      await client.close();
    }
  }, 25_000);
});
