import type { Logger } from 'pino';
import { SearchInput, SearchOutput } from './schema.js';
import { searchHandler, type SearchDeps } from './handler.js';
import { createTool, toolError, type ToolDefinition } from '../registry.js';
import { isOk } from '../../lib/result.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildSearchTool = (deps: SearchDeps, log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'airbnb_search',
    description:
      'Search Airbnb listings on public data. Returns listing IDs, titles, prices, locations.',
    schema: SearchInput,
    output: SearchOutput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: (input, context) =>
      withTelemetry(
        log,
        'airbnb_search',
        async (validated: typeof input) => {
          const r = await searchHandler(deps)(validated, context?.signal);
          if (isOk(r)) return r.value;
          return toolError(r.error);
        },
        { debug },
      )(input),
  });
