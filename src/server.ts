import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'node:fs';
import type { ToolDefinition } from './tools/registry.js';
import type { Logger } from 'pino';

// Read version + name from package.json at runtime. JSON import attributes
// (`with { type: 'json' }`) are not supported on Node16's `module` resolution,
// and `resolveJsonModule` would force dist/ to copy package.json. This reads
// the file relative to the compiled module URL, which works under both
// `tsx` (dev) and `node dist/index.js` (build) — package.json sits two
// levels up from `dist/server.js` and one level up from `src/server.ts`.
const pkgUrl = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8')) as { name: string; version: string };

export const buildServer = (tools: ToolDefinition[], log: Logger) => {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- low-level Server API is required for setRequestHandler-based registration; McpServer wraps this differently.
  const server = new Server(
    { name: pkg.name, version: pkg.version },
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
