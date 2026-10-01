import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe.skipIf(process.env.E2E_LIVE !== '1')('listing e2e (explicit live opt-in)', () => {
  it('reads a public listing through initialized MCP', async () => {
    const id = process.env.AIRBNB_LISTING_ID ?? '1867179';
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['dist/index.js'],
      stderr: 'pipe',
    });
    transport.stderr?.on('data', () => undefined);
    const client = new Client({ name: 'live-listing-check', version: '1.0.0' });
    try {
      await client.connect(transport);
      const result = await client.callTool({
        name: 'airbnb_listing_details',
        arguments: { listing_id: id },
      });
      expect(result.isError, JSON.stringify(result.content)).toBe(false);
      const data = result.structuredContent as Record<string, unknown> | undefined;
      expect(data?._source).toBe('public');
      const listing = data?.listing as Record<string, unknown> | undefined;
      expect(listing?.id).toBe(id);
      expect(typeof listing?.title).toBe('string');
    } finally {
      await client.close();
    }
  }, 25_000);
});
