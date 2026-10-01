import type { Logger } from 'pino';
import { ReviewResponderInput, ReviewResponderOutput } from './schema.js';
import { reviewResponderHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildReviewResponderTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'review_responder',
    description:
      '[DEMO — requires Airbnb Partner API] Drafts a host-voiced response to a guest review, classifies sentiment, and flags escalation cases. Requires host approval and performs no posting.',
    schema: ReviewResponderInput,
    output: ReviewResponderOutput,
    handler: withTelemetry(log, 'review_responder', reviewResponderHandler, { debug }),
  });
