import type { Logger } from 'pino';
import { TurnoverInput, TurnoverOutput } from './schema.js';
import { turnoverHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildTurnoverCoordinatorTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'turnover_coordinator',
    description:
      '[LOCAL] Checks a proposed turnover plan against caller-supplied tasks, cleaner availability and buffer with mode=provided. Synthetic demo is available with mode=demo or omitted mode. Requires host approval; confirms no assignment and sends no notifications.',
    schema: TurnoverInput,
    output: TurnoverOutput,
    handler: withTelemetry(log, 'turnover_coordinator', turnoverHandler, { debug }),
  });
