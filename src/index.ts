import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './config/logger.js';
import { buildServer } from './server.js';
import { allTools } from './tools/index.js';

const main = async () => {
  const env = loadEnv();
  const log = createLogger(env);
  const tools = allTools();
  const server = buildServer(tools, log);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info({ tool_count: tools.length }, 'server.started');
};

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
