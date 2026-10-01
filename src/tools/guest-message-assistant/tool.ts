import type { Logger } from 'pino';
import { GuestMessageInput, GuestMessageOutput } from './schema.js';
import { guestMessageHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildGuestMessageAssistantTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'guest_message_assistant',
    description:
      '[LOCAL] Drafts three rule-based EN/DE guest replies using caller-supplied property facts with mode=provided, and identifies missing context. Synthetic demo is available with mode=demo or omitted mode. Requires host approval; sends no messages.',
    schema: GuestMessageInput,
    output: GuestMessageOutput,
    handler: withTelemetry(log, 'guest_message_assistant', guestMessageHandler, { debug }),
  });
