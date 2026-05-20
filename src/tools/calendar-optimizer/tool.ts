import type { Logger } from 'pino';
import { CalendarOptimizerInput, type CalendarOptimizerInputT } from './schema.js';
import { calendarOptimizerHandler } from './handler.js';
import { wrapHandler, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildCalendarOptimizerTool = (log: Logger, debug = false): ToolDefinition => ({
  name: 'calendar_optimizer',
  description:
    '[DEMO — requires Airbnb Partner API] Detects calendar gaps in a 30/60/90-day horizon and recommends discount / min-stay-relax / block actions.',
  inputSchema: {
    type: 'object',
    properties: {
      listing_id: { type: 'string' },
      horizon_days: { type: 'number', enum: [30, 60, 90] },
    },
    required: ['listing_id'],
  },
  schema: CalendarOptimizerInput,
  handler: wrapHandler(
    CalendarOptimizerInput,
    withTelemetry(
      log,
      'calendar_optimizer',
      (input) => calendarOptimizerHandler(input as CalendarOptimizerInputT),
      { debug },
    ),
  ),
});
