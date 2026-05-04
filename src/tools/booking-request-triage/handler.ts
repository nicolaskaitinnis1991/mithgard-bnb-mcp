import type { BookingTriageInputT, BookingTriageOutputT } from './schema.js';
import { computeTriage } from '../../mocks/booking-request-triage.fixture.js';

export const bookingTriageHandler = (input: BookingTriageInputT): Promise<BookingTriageOutputT> =>
  Promise.resolve(computeTriage(input));
