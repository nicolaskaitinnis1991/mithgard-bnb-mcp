import type { Logger } from 'pino';
import { HostInsightsInput, HostInsightsOutput } from './schema.js';
import { hostInsightsHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildHostInsightsTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'host_insights',
    description:
      '[LOCAL] Calculates occupancy, revenue, ADR and RevPAR from caller-supplied host_data with mode=provided. Comparisons require supplied benchmark evidence. Synthetic demo is available with mode=demo or omitted mode; no automatic host import.',
    schema: HostInsightsInput,
    output: HostInsightsOutput,
    handler: withTelemetry(log, 'host_insights', hostInsightsHandler, { debug }),
  });
