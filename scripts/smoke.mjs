import assert from 'node:assert/strict';
import process from 'node:process';
import { setTimeout, clearTimeout } from 'node:timers';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const args = process.argv.slice(2);
if (args.length && (args[0] !== '--docker' || args.length !== 2)) {
  throw new Error('Usage: node scripts/smoke.mjs [--docker IMAGE]');
}
const image = args[1];
const transport = new StdioClientTransport(
  image
    ? {
        command: 'docker',
        args: [
          'run',
          '--rm',
          '-i',
          '--read-only',
          '--network=none',
          '--cap-drop=ALL',
          '--security-opt=no-new-privileges',
          '--memory=256m',
          image,
        ],
        stderr: 'pipe',
      }
    : { command: process.execPath, args: ['dist/index.js'], stderr: 'pipe' },
);
const client = new Client({ name: 'mithgard-smoke', version: '1.0.0' });
transport.stderr?.on('data', () => undefined);
const deadline = setTimeout(() => {
  void client.close();
  process.exitCode = 1;
}, 20_000);
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 11);
  assert.equal(
    tools.filter((tool) =>
      [
        'host_insights',
        'guest_message_assistant',
        'booking_request_triage',
        'smart_pricing',
        'calendar_optimizer',
        'review_responder',
        'turnover_coordinator',
      ].includes(tool.name),
    ).length,
    7,
  );
  const status = await client.callTool({ name: 'operations_status', arguments: {} });
  assert.equal(status.isError, false);
  assert.equal(status.structuredContent?.status, 'unverified');
  const demo = await client.callTool({ name: 'host_insights', arguments: { listing_id: '12345' } });
  assert.equal(demo.structuredContent?._mock, true);
  const planned = await client.callTool({
    name: 'host_workflow',
    arguments: {
      steps: [{ id: 'insights', tool: 'host_insights', arguments: { listing_id: '12345' } }],
    },
  });
  assert.equal(planned.structuredContent?.execution_status, 'planned');
  const executed = await client.callTool({
    name: 'host_workflow',
    arguments: {
      mode: 'execute',
      steps: [{ id: 'insights', tool: 'host_insights', arguments: { listing_id: '12345' } }],
    },
  });
  assert.equal(executed.structuredContent?.execution_status, 'verified');
  const bad = await client.callTool({
    name: 'airbnb_search',
    arguments: { location: '', checkin: '2026-02-30' },
  });
  assert.equal(bad.isError, true);
  process.stdout.write(
    'MCP handshake, 11 contracts, demo provenance, operations, workflow plan/execute and invalid-input smoke passed\n',
  );
} finally {
  clearTimeout(deadline);
  await client.close();
}
