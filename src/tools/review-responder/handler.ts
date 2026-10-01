import type { ReviewResponderInputT, ReviewResponderOutputT } from './schema.js';
import { computeReviewResponse } from '../../mocks/review-responder.fixture.js';
import { providedData, demoResult } from '../../host-data/contracts.js';
import { reviewFromData } from '../../host-data/engines.js';

export const reviewResponderHandler = (
  input: ReviewResponderInputT,
): Promise<ReviewResponderOutputT> => {
  const data = providedData(input);
  return Promise.resolve(
    data
      ? reviewFromData(input.review_text, input.rating, input.host_voice, data)
      : demoResult(computeReviewResponse(input)),
  );
};
