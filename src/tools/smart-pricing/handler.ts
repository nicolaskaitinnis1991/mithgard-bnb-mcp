import type { SmartPricingInputT, SmartPricingOutputT } from './schema.js';
import { computePricing } from '../../mocks/smart-pricing.fixture.js';
import { providedData, demoResult } from '../../host-data/contracts.js';
import { pricingFromData } from '../../host-data/engines.js';

export const smartPricingHandler = (input: SmartPricingInputT): Promise<SmartPricingOutputT> => {
  const data = providedData(input);
  return Promise.resolve(
    data ? pricingFromData(input.from, input.to, data) : demoResult(computePricing(input)),
  );
};
