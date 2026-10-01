import type { Logger } from 'pino';
import { HostInsightsInput, HostInsightsOutput } from './schema.js';
import { hostInsightsHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildHostInsightsTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'host_insights',
    description:
      '[DEMO — requires Airbnb Partner API] Returns occupancy, revenue, competitor delta, and pricing recommendations per listing.',
    schema: HostInsightsInput,
    output: HostInsightsOutput,
    handler: withTelemetry(log, 'host_insights', hostInsightsHandler, { debug }),
  });
