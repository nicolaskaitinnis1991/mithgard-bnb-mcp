import type { Logger } from 'pino';
import { CalendarOptimizerInput, CalendarOptimizerOutput } from './schema.js';
import { calendarOptimizerHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildCalendarOptimizerTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'calendar_optimizer',
    description:
      '[DEMO — requires Airbnb Partner API] Detects calendar gaps in a 30/60/90-day horizon and recommends discount / min-stay-relax / block actions; performs no calendar writes.',
    schema: CalendarOptimizerInput,
    output: CalendarOptimizerOutput,
    handler: withTelemetry(log, 'calendar_optimizer', calendarOptimizerHandler, { debug }),
  });
