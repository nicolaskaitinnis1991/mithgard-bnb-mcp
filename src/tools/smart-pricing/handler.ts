import type { SmartPricingInputT, SmartPricingOutputT } from './schema.js';
import { computePricing } from '../../mocks/smart-pricing.fixture.js';

export const smartPricingHandler = (input: SmartPricingInputT): Promise<SmartPricingOutputT> =>
  Promise.resolve(computePricing(input));
