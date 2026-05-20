import type { Logger } from 'pino';
import type { ToolDefinition } from './registry.js';
import { buildSearchTool } from './search/tool.js';
import type { SearchDeps } from './search/handler.js';
import { buildListingDetailsTool } from './listing-details/tool.js';
import type { ListingDeps } from './listing-details/handler.js';
import { buildHostInsightsTool } from './host-insights/tool.js';
import { buildGuestMessageAssistantTool } from './guest-message-assistant/tool.js';
import { buildBookingRequestTriageTool } from './booking-request-triage/tool.js';
import { buildSmartPricingTool } from './smart-pricing/tool.js';
import { buildCalendarOptimizerTool } from './calendar-optimizer/tool.js';
import { buildReviewResponderTool } from './review-responder/tool.js';
import { buildTurnoverCoordinatorTool } from './turnover-coordinator/tool.js';

export interface AppDeps {
  search: SearchDeps;
  listing: ListingDeps;
  log: Logger;
  // When true (set by --debug flag), tool handlers emit `tool.envelope` log
  // lines with sanitised input/output for verbose stderr debugging.
  debug?: boolean;
}

export const liveTools = (deps: AppDeps): ToolDefinition[] => {
  const debug = deps.debug ?? false;
  return [
    buildSearchTool(deps.search, deps.log, debug),
    buildListingDetailsTool(deps.listing, deps.log, debug),
  ];
};

export const mockTools = (log: Logger, debug = false): ToolDefinition[] => [
  buildHostInsightsTool(log, debug),
  buildGuestMessageAssistantTool(log, debug),
  buildBookingRequestTriageTool(log, debug),
  buildSmartPricingTool(log, debug),
  buildCalendarOptimizerTool(log, debug),
  buildReviewResponderTool(log, debug),
  buildTurnoverCoordinatorTool(log, debug),
];

export const allTools = (deps: AppDeps): ToolDefinition[] => [
  ...liveTools(deps),
  ...mockTools(deps.log, deps.debug ?? false),
];
