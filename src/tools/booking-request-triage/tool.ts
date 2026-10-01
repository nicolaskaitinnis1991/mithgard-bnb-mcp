import type { Logger } from 'pino';
import { BookingTriageInput, BookingTriageOutput } from './schema.js';
import { bookingTriageHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildBookingRequestTriageTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'booking_request_triage',
    description:
      '[LOCAL] Checks a booking request against caller-supplied capacity and house policies with mode=provided. Returns reasoning and a recommendation requiring host approval. Synthetic demo is available with mode=demo or omitted mode; performs no booking decision.',
    schema: BookingTriageInput,
    output: BookingTriageOutput,
    handler: withTelemetry(log, 'booking_request_triage', bookingTriageHandler, { debug }),
  });
