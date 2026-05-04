import { TurnoverInput } from './schema.js';
import { turnoverHandler } from './handler.js';
import { wrapHandler, type ToolDefinition } from '../registry.js';

export const buildTurnoverCoordinatorTool = (): ToolDefinition => ({
  name: 'turnover_coordinator',
  description:
    '[DEMO — requires Airbnb Partner API] Generates cleaning brief, 8-item checklist, crew message draft, and estimated duration for a turnover.',
  inputSchema: {
    type: 'object',
    properties: {
      listing_id: { type: 'string' },
      checkout_at: { type: 'string' },
      checkin_at: { type: 'string' },
      cleaner_id: { type: 'string' },
    },
    required: ['listing_id', 'checkout_at', 'checkin_at'],
  },
  schema: TurnoverInput,
  handler: wrapHandler(TurnoverInput, (input) => turnoverHandler(input)),
});
