import { HostInsightsInput, type HostInsightsInputT } from './schema.js';
import { hostInsightsHandler } from './handler.js';
import { wrapHandler, type ToolDefinition } from '../registry.js';

export const buildHostInsightsTool = (): ToolDefinition => ({
  name: 'host_insights',
  description:
    '[DEMO — requires Airbnb Partner API] Returns occupancy, revenue, competitor delta, and pricing recommendations per listing.',
  inputSchema: {
    type: 'object',
    properties: {
      listing_id: { type: 'string' },
      period: {
        type: 'string',
        enum: ['last_30d', 'last_90d', 'last_year'],
      },
    },
    required: ['listing_id'],
  },
  schema: HostInsightsInput,
  handler: wrapHandler(HostInsightsInput, (input) =>
    hostInsightsHandler(input as HostInsightsInputT),
  ),
});
