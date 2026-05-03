import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ToolDefinition } from './tools/registry.js';
import type { Logger } from 'pino';

export const buildServer = (tools: ToolDefinition[], log: Logger) => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- low-level Server API is required for setRequestHandler-based registration; McpServer wraps this differently.
  const server = new Server(
    { name: 'mithgard-bnb-mcp', version: '0.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools.find((t) => t.name === req.params.name);
    if (!tool) throw new Error(`Unknown tool: ${req.params.name}`);
    log.info({ tool: tool.name }, 'tool.call');
    return tool.handler(req.params.arguments ?? {});
  });

  return server;
};
