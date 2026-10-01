import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

describe('simulated critical users over a real MCP process', () => {
  it('handles 2000 mixed concurrent calls with bounded batches and valid contracts', async () => {
    const image = process.env.MITHGARD_STRESS_DOCKER_IMAGE;
    const transport = new StdioClientTransport(
      image
        ? {
            command: 'docker',
            args: [
              'run',
              '--rm',
              '-i',
              '--read-only',
              '--cap-drop=ALL',
              '--security-opt=no-new-privileges',
              '--memory=256m',
              image,
            ],
            stderr: 'pipe',
          }
        : {
            command: process.execPath,
            args: ['dist/index.js'],
            stderr: 'pipe',
          },
    );
    const client = new Client({ name: 'virtual-critical-users', version: '1.0.0' });
    transport.stderr?.on('data', () => undefined);
    try {
      await client.connect(transport);
      const start = performance.now();
      let success = 0;
      let rejected = 0;
      for (let batch = 0; batch < 100; batch++) {
        const results = await Promise.all(
          Array.from({ length: 20 }, (_, user) => {
            const invalid = user % 4 === 0;
            return client.callTool(
              invalid
                ? { name: 'airbnb_search', arguments: { location: '', checkin: '2026-02-30' } }
                : {
                    name: 'host_insights',
                    arguments: { listing_id: String(batch * 20 + user + 1) },
                  },
            );
          }),
        );
        for (const result of results) {
          if (result.isError) {
            rejected += 1;
            expect(result.structuredContent).toBeUndefined();
          } else {
            success += 1;
            expect((result.structuredContent as Record<string, unknown> | undefined)?._mock).toBe(
              true,
            );
          }
        }
      }
      expect(success).toBe(1500);
      expect(rejected).toBe(500);
      const status = await client.callTool({ name: 'operations_status', arguments: {} });
      const state = status.structuredContent as Record<string, unknown> | undefined;
      expect(state?.active_calls).toBe(0);
      expect(state?.recovery_count).toBe(0);
      expect(state?.status).toBe('unverified');
      console.info(
        JSON.stringify({
          scenario: 'virtual-users',
          calls: 2000,
          concurrency: 20,
          success,
          rejected,
          duration_ms: Math.round(performance.now() - start),
        }),
      );
    } finally {
      await client.close();
    }
  });
});
