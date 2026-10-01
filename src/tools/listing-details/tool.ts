import type { Logger } from 'pino';
import { ListingDetailsInput, ListingDetailsOutput } from './schema.js';
import { listingHandler, type ListingDeps } from './handler.js';
import { createTool, toolError, type ToolDefinition } from '../registry.js';
import { isOk } from '../../lib/result.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildListingDetailsTool = (
  deps: ListingDeps,
  log: Logger,
  debug = false,
): ToolDefinition =>
  createTool({
    name: 'airbnb_listing_details',
    description:
      'Fetch full details for a single Airbnb listing on public data. Returns listing, reviews summary, and host summary.',
    schema: ListingDetailsInput,
    output: ListingDetailsOutput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler: (input, context) =>
      withTelemetry(
        log,
        'airbnb_listing_details',
        async (validated: typeof input) => {
          const r = await listingHandler(deps)(validated, context?.signal);
          if (isOk(r)) return r.value;
          return toolError(r.error);
        },
        { debug },
      )(input),
  });
