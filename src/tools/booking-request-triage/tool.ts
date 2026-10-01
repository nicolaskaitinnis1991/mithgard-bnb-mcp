import type { Logger } from 'pino';
import { BookingTriageInput, BookingTriageOutput } from './schema.js';
import { bookingTriageHandler } from './handler.js';
import { createTool, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildBookingRequestTriageTool = (log: Logger, debug = false): ToolDefinition =>
  createTool({
    name: 'booking_request_triage',
    description:
      '[DEMO — requires Airbnb Partner API] Risk-scores a booking request 0-100 with auditable reasoning. Returns a recommendation requiring host approval; performs no acceptance or rejection.',
    schema: BookingTriageInput,
    output: BookingTriageOutput,
    handler: withTelemetry(log, 'booking_request_triage', bookingTriageHandler, { debug }),
  });
