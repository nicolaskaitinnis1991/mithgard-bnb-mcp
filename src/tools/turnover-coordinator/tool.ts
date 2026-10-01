import type { Logger } from 'pino';
import { TurnoverInput, TurnoverOutput } from './schema.js';
import { turnoverHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildTurnoverCoordinatorTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'turnover_coordinator',
    description:
      '[DEMO — requires Airbnb Partner API] Generates cleaning brief, checklist, crew message draft, and estimated duration for a turnover. Requires host approval and sends no notifications.',
    schema: TurnoverInput,
    output: TurnoverOutput,
    handler: withTelemetry(log, 'turnover_coordinator', turnoverHandler, { debug }),
  });
