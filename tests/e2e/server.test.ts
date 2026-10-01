import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('server e2e', () => {
  it('initializes, publishes eleven tools and closes the child transport', async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ['--import', 'tsx', 'src/index.ts'],
      stderr: 'pipe',
    });
    transport.stderr?.on('data', () => undefined);
    const client = new Client({ name: 'entrypoint-test', version: '1.0.0' });
    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      expect(tools).toHaveLength(11);
      expect(tools.find((tool) => tool.name === 'host_workflow')).toBeDefined();
      expect(tools.find((tool) => tool.name === 'operations_status')).toBeDefined();
    } finally {
      await client.close();
    }
    expect(transport.pid).toBeNull();
  }, 10_000);
});
