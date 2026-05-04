import type { ReviewResponderInputT, ReviewResponderOutputT } from './schema.js';
import { computeReviewResponse } from '../../mocks/review-responder.fixture.js';

export const reviewResponderHandler = (
  input: ReviewResponderInputT,
): Promise<ReviewResponderOutputT> => Promise.resolve(computeReviewResponse(input));
