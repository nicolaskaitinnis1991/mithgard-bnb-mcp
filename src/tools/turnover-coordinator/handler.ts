import type { TurnoverInputT, TurnoverOutputT } from './schema.js';
import { computeTurnover } from '../../mocks/turnover-coordinator.fixture.js';

export const turnoverHandler = (input: TurnoverInputT): Promise<TurnoverOutputT> =>
  Promise.resolve(computeTurnover(input));
