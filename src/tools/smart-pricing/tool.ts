import { SmartPricingInput } from './schema.js';
import { smartPricingHandler } from './handler.js';
import { wrapHandler, type ToolDefinition } from '../registry.js';

export const buildSmartPricingTool = (): ToolDefinition => ({
  name: 'smart_pricing',
  description:
    '[DEMO — requires Airbnb Partner API] Returns daily price suggestions with explainable reasons (weekday/seasonal/event factors). Capped at 30-day horizon.',
  inputSchema: {
    type: 'object',
    properties: {
      listing_id: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
    },
    required: ['listing_id', 'from', 'to'],
  },
  schema: SmartPricingInput,
  handler: wrapHandler(SmartPricingInput, (input) => smartPricingHandler(input)),
});
