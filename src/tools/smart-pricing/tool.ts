import type { Logger } from 'pino';
import { SmartPricingInput, SmartPricingOutput } from './schema.js';
import { smartPricingHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildSmartPricingTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'smart_pricing',
    description:
      '[LOCAL] Suggests bounded daily prices from caller-supplied prices and factors with mode=provided, excluding unavailable nights. Maximum 30 dates. Synthetic demo is available with mode=demo or omitted mode; performs no price writes or live market forecast.',
    schema: SmartPricingInput,
    output: SmartPricingOutput,
    handler: withTelemetry(log, 'smart_pricing', smartPricingHandler, { debug }),
  });
