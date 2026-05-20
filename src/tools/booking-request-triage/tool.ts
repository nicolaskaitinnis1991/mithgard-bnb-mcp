import type { Logger } from 'pino';
import { BookingTriageInput } from './schema.js';
import { bookingTriageHandler } from './handler.js';
import { wrapHandler, type ToolDefinition } from '../registry.js';
import { withTelemetry } from '../../lib/telemetry.js';

export const buildBookingRequestTriageTool = (log: Logger, debug = false): ToolDefinition => ({
  name: 'booking_request_triage',
  description:
    '[DEMO — requires Airbnb Partner API] Risk-scores a booking request 0-100 with auditable reasoning. Recommends auto_accept / review / auto_decline.',
  inputSchema: {
    type: 'object',
    properties: {
      thread_id: { type: 'string' },
      guest_profile: {
        type: 'object',
        properties: {
          joined: { type: 'string' },
          reviews: { type: 'number' },
          rating: { type: 'number' },
          verified: { type: 'boolean' },
        },
        required: ['joined', 'reviews', 'verified'],
      },
      trip: {
        type: 'object',
        properties: {
          adults: { type: 'number' },
          children: { type: 'number' },
          pets: { type: 'boolean' },
          nights: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['adults', 'children', 'pets', 'nights'],
      },
    },
    required: ['thread_id', 'guest_profile', 'trip'],
  },
  schema: BookingTriageInput,
  handler: wrapHandler(
    BookingTriageInput,
    withTelemetry(log, 'booking_request_triage', (input) => bookingTriageHandler(input), {
      debug,
    }),
  ),
});
