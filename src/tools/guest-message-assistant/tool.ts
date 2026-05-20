import type { Logger } from 'pino';
import { GuestMessageInput, type GuestMessageInputT } from './schema.js';
import { guestMessageHandler } from './handler.js';
import { wrapHandler, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildGuestMessageAssistantTool = (log: Logger): ToolDefinition => ({
  name: 'guest_message_assistant',
  description:
    '[DEMO — requires Airbnb Partner API] Drafts 3 host-voiced reply suggestions for an incoming guest message. Always returns approval_required=true.',
  inputSchema: {
    type: 'object',
    properties: {
      thread_id: { type: 'string' },
      last_message: { type: 'string' },
      host_voice: { type: 'string', enum: ['casual', 'professional', 'warm'] },
    },
    required: ['thread_id', 'last_message'],
  },
  schema: GuestMessageInput,
  handler: wrapHandler(
    GuestMessageInput,
    withTelemetry(log, 'guest_message_assistant', (input) =>
      guestMessageHandler(input as GuestMessageInputT),
    ),
  ),
});
