import type { TurnoverInputT, TurnoverOutputT } from './schema.js';
import { computeTurnover } from '../../mocks/turnover-coordinator.fixture.js';
import { providedData, demoResult } from '../../host-data/contracts.js';
import { turnoverFromData } from '../../host-data/engines.js';

export const turnoverHandler = (input: TurnoverInputT): Promise<TurnoverOutputT> => {
  const data = providedData(input);
  return Promise.resolve(
    data
      ? turnoverFromData(input.checkout_at, input.checkin_at, input.cleaner_id, data)
      : demoResult(computeTurnover(input)),
  );
};
