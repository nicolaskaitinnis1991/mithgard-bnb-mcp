import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { Logger } from 'pino';
import { buildServer } from '../../src/server.js';
import { allTools, mockTools, type AppDeps } from '../../src/tools/index.js';
import { createTool, type ToolDefinition } from '../../src/tools/registry.js';
import { err } from '../../src/lib/result.js';
import { upstreamHTTP } from '../../src/lib/errors.js';

const log = (): Logger => ({ info: vi.fn(), error: vi.fn(), debug: vi.fn() }) as unknown as Logger;

const dependencies = (): AppDeps => ({
  search: {
    http: {
      get: () => Promise.resolve(err(upstreamHTTP(503, 'https://private.example/?token=secret'))),
    },
    cache: { get: () => undefined, set: () => undefined },
    parse: () => {
      throw new Error('Parser must not run after HTTP failure');
    },
  },
  listing: {
    http: {
      get: () => Promise.resolve(err(upstreamHTTP(503, 'https://private.example/?token=secret'))),
    },
    cache: { get: () => undefined, set: () => undefined },
    parse: () => {
      throw new Error('Parser must not run after HTTP failure');
    },
  },
  log: log(),
});

describe('MCP client/server contract', () => {
  const clients: Client[] = [];
  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close()));
  });

  const connect = async (tools: ToolDefinition[]) => {
    const server = buildServer(tools, log());
    const client = new Client({ name: 'critical-virtual-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    clients.push(client);
    return client;
  };

  it('initializes through the official client and advertises complete schemas and annotations', async () => {
    const client = await connect(allTools(dependencies()));
    const listed = await client.listTools();
    expect(listed.tools).toHaveLength(9);
    const search = listed.tools.find((tool) => tool.name === 'airbnb_search');
    expect(search?.inputSchema.properties).toHaveProperty('checkin');
    expect(search?.inputSchema.properties).toHaveProperty('checkout');
    expect(search?.inputSchema.properties).toHaveProperty('min_price');
    expect(search?.inputSchema.properties).toHaveProperty('currency');
    expect(search?.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: true });
    for (const tool of listed.tools) {
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.outputSchema?.type).toBe('object');
      expect(tool.annotations?.destructiveHint).toBe(false);
    }
  });

  it('returns SDK-validated structuredContent for every demo tool and preserves demo markers', async () => {
    const client = await connect(mockTools(log()));
    await client.listTools(); // SDK caches output validators from tools/list.
    const inputs: Record<string, Record<string, unknown>> = {
      host_insights: { listing_id: 'L-1' },
      guest_message_assistant: { thread_id: 'T-1', last_message: 'What is the Wi-Fi password?' },
      booking_request_triage: {
        thread_id: 'T-1',
        guest_profile: { joined: '2020-01-01', reviews: 4, verified: true },
        trip: { adults: 2, children: 0, pets: false, nights: 2 },
      },
      smart_pricing: { listing_id: 'L-1', from: '2026-06-01', to: '2026-06-03' },
      calendar_optimizer: { listing_id: 'L-1', reference_date: '2026-06-01' },
      review_responder: { review_id: 'R-1', review_text: 'Beautiful apartment', rating: 5 },
      turnover_coordinator: {
        listing_id: 'L-1',
        checkout_at: '2026-06-01T10:00:00Z',
        checkin_at: '2026-06-01T15:00:00Z',
      },
    };
    for (const [name, input] of Object.entries(inputs)) {
      const result = CallToolResultSchema.parse(await client.callTool({ name, arguments: input }));
      expect(result.isError, name).toBe(false);
      expect(result.structuredContent?._mock, name).toBe(true);
      const first = result.content[0];
      if (first?.type !== 'text') throw new Error('Expected text content');
      expect(JSON.parse(first.text), name).toEqual(result.structuredContent);
    }
  });

  it('returns tool failures as isError and leaves outputSchema validation to successful outputs', async () => {
    const client = await connect(allTools(dependencies()));
    await client.listTools();
    const invalid = await client.callTool({ name: 'airbnb_search', arguments: {} });
    expect(invalid.isError).toBe(true);
    expect(invalid.structuredContent).toBeUndefined();
    const unavailable = await client.callTool({
      name: 'airbnb_search',
      arguments: { location: 'Berlin' },
    });
    expect(unavailable.isError).toBe(true);
    expect(JSON.stringify(unavailable)).not.toContain('token=secret');
    expect(JSON.stringify(unavailable)).toContain('UpstreamHTTP');
  });

  it('rejects unknown tool names with InvalidParams rather than an internal protocol error', async () => {
    const client = await connect(mockTools(log()));
    await expect(client.callTool({ name: 'does_not_exist', arguments: {} })).rejects.toMatchObject({
      code: ErrorCode.InvalidParams,
    });
  });

  it('turns output contract violations into tool errors usable by SDK clients', async () => {
    const broken = createTool({
      name: 'broken',
      description: 'Broken fixture',
      schema: z.object({}),
      output: z.object({ amount: z.number() }),
      handler: () => Promise.resolve({ amount: 'private-invalid-data' }),
    });
    const client = await connect([broken]);
    await client.listTools();
    const result = await client.callTool({ name: 'broken', arguments: {} });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain('OutputValidationFailed');
    expect(JSON.stringify(result)).not.toContain('private-invalid-data');
  });

  it('rejects duplicate registrations before accepting protocol requests', () => {
    const tools = mockTools(log());
    const first = tools[0];
    if (!first) throw new Error('Expected at least one tool');
    expect(() => buildServer([first, first], log())).toThrow('Duplicate MCP tool names');
  });
});
