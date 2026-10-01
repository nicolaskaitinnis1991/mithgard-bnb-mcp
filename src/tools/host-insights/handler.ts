import type { HostInsightsInputT, HostInsightsOutputT } from './schema.js';
import { pickIndex } from '../../mocks/hash.js';
import { PROFILE_ORDER, fixtureFor } from '../../mocks/host-insights.fixture.js';

export const hostInsightsHandler = (input: HostInsightsInputT): Promise<HostInsightsOutputT> => {
  const idx = pickIndex(`${input.listing_id}:${input.period}`, PROFILE_ORDER.length);
  const profile = PROFILE_ORDER[idx];
  if (profile === undefined) throw new Error('host_insights: profile index out of bounds');
  return Promise.resolve(fixtureFor(profile, input.reference_date));
};
