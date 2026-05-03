import { ListingDetailsInput } from './schema.js';
import { listingHandler, type ListingDeps } from './handler.js';
import { wrapHandler, type ToolDefinition } from '../registry.js';
import { isOk } from '../../lib/result.js';
import { formatError } from '../../lib/errors.js';

export const buildListingDetailsTool = (deps: ListingDeps): ToolDefinition => ({
  name: 'airbnb_listing_details',
  description:
    'Fetch full details for a single Airbnb listing on public data. Returns listing, reviews summary, and host summary.',
  inputSchema: {
    type: 'object',
    properties: {
      listing_id: { type: ['string', 'number'] },
      checkin: { type: 'string' },
      checkout: { type: 'string' },
    },
    required: ['listing_id'],
  },
  schema: ListingDetailsInput,
  handler: wrapHandler(ListingDetailsInput, async (input) => {
    const r = await listingHandler(deps)(input);
    if (isOk(r)) return r.value;
    return { error: formatError(r.error), kind: r.error.kind };
  }),
});
