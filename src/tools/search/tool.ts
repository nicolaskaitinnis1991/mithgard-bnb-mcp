import { SearchInput, type SearchInputT } from './schema.js';
import { searchHandler, type SearchDeps } from './handler.js';
import { wrapHandler, type ToolDefinition } from '../registry.js';
import { isOk } from '../../lib/result.js';
import { formatError } from '../../lib/errors.js';

export const buildSearchTool = (deps: SearchDeps): ToolDefinition => ({
  name: 'airbnb_search',
  description:
    'Search Airbnb listings on public data. Returns listing IDs, titles, prices, locations.',
  inputSchema: {
    type: 'object',
    properties: { location: { type: 'string' } },
    required: ['location'],
  },
  schema: SearchInput,
  handler: wrapHandler(SearchInput, async (input) => {
    const r = await searchHandler(deps)(input as SearchInputT);
    if (isOk(r)) return r.value;
    return { error: formatError(r.error), kind: r.error.kind };
  }),
});
