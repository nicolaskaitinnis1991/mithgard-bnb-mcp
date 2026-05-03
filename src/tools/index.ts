import type { ToolDefinition } from './registry.js';
import { buildSearchTool } from './search/tool.js';
import type { SearchDeps } from './search/handler.js';
import { buildListingDetailsTool } from './listing-details/tool.js';
import type { ListingDeps } from './listing-details/handler.js';

export interface AppDeps {
  search: SearchDeps;
  listing: ListingDeps;
}

export const allTools = (deps: AppDeps): ToolDefinition[] => [
  buildSearchTool(deps.search),
  buildListingDetailsTool(deps.listing),
];
