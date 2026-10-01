import type { Logger } from 'pino';
import { ReviewResponderInput, ReviewResponderOutput } from './schema.js';
import { reviewResponderHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildReviewResponderTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'review_responder',
    description:
      '[LOCAL] Drafts rule-based EN/DE review replies using caller-supplied concerns and confirmed actions with mode=provided, and flags escalation. Synthetic demo is available with mode=demo or omitted mode. Requires host approval; performs no posting.',
    schema: ReviewResponderInput,
    output: ReviewResponderOutput,
    handler: withTelemetry(log, 'review_responder', reviewResponderHandler, { debug }),
  });
