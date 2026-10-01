import type { BookingTriageInputT, BookingTriageOutputT } from './schema.js';
import { computeTriage } from '../../mocks/booking-request-triage.fixture.js';
import { providedData, demoResult } from '../../host-data/contracts.js';
import { triageFromData } from '../../host-data/engines.js';

export const bookingTriageHandler = (input: BookingTriageInputT): Promise<BookingTriageOutputT> => {
  const data = providedData(input);
  return Promise.resolve(data ? triageFromData(input, data) : demoResult(computeTriage(input)));
};
