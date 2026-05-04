import type { ToolDefinition } from './registry.js';
import { buildSearchTool } from './search/tool.js';
import type { SearchDeps } from './search/handler.js';
import { buildListingDetailsTool } from './listing-details/tool.js';
import type { ListingDeps } from './listing-details/handler.js';
import { buildHostInsightsTool } from './host-insights/tool.js';
import { buildGuestMessageAssistantTool } from './guest-message-assistant/tool.js';

export interface AppDeps {
  search: SearchDeps;
  listing: ListingDeps;
}

export const liveTools = (deps: AppDeps): ToolDefinition[] => [
  buildSearchTool(deps.search),
  buildListingDetailsTool(deps.listing),
];

export const mockTools = (): ToolDefinition[] => [
  buildHostInsightsTool(),
  buildGuestMessageAssistantTool(),
];

export const allTools = (deps: AppDeps): ToolDefinition[] => [...liveTools(deps), ...mockTools()];
