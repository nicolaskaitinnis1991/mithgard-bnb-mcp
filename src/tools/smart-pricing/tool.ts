import type { Logger } from 'pino';
import { SmartPricingInput, SmartPricingOutput } from './schema.js';
import { smartPricingHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildSmartPricingTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'smart_pricing',
    description:
      '[DEMO — requires Airbnb Partner API] Returns daily price suggestions with explainable reasons (weekday/seasonal/event factors). Capped at 30-day horizon; performs no price writes.',
    schema: SmartPricingInput,
    output: SmartPricingOutput,
    handler: withTelemetry(log, 'smart_pricing', smartPricingHandler, { debug }),
  });
