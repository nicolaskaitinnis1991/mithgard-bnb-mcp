import type { Logger } from 'pino';
import { GuestMessageInput, GuestMessageOutput } from './schema.js';
import { guestMessageHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildGuestMessageAssistantTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'guest_message_assistant',
    description:
      '[DEMO — requires Airbnb Partner API] Drafts 3 host-voiced reply suggestions for an incoming guest message. Always returns approval_required=true.',
    schema: GuestMessageInput,
    output: GuestMessageOutput,
    handler: withTelemetry(log, 'guest_message_assistant', guestMessageHandler, { debug }),
  });
