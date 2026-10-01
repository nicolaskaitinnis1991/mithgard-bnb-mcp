import type { Logger } from 'pino';
import { CalendarOptimizerInput, CalendarOptimizerOutput } from './schema.js';
import { calendarOptimizerHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildCalendarOptimizerTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'calendar_optimizer',
    description:
      '[LOCAL] Detects available gaps and minimum-stay conflicts in caller-supplied calendar nights with mode=provided, over 30/60/90 days. Synthetic demo is available with mode=demo or omitted mode; performs no calendar writes or synchronization.',
    schema: CalendarOptimizerInput,
    output: CalendarOptimizerOutput,
    handler: withTelemetry(log, 'calendar_optimizer', calendarOptimizerHandler, { debug }),
  });
