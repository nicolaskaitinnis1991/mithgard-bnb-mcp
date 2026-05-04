import { describe, it, expect } from 'vitest';
import { reviewResponderHandler } from '../../src/tools/review-responder/handler.js';

describe('reviewResponderHandler', () => {
  it('positive sentiment for 5-star, no escalation', async () => {
    const out = await reviewResponderHandler({
      review_id: 'r1',
      review_text: 'Beautiful place, very clean!',
      rating: 5,
      host_voice: 'warm',
    });
    expect(out.sentiment).toBe('positive');
    expect(out.needs_escalation).toBe(false);
    expect(out._mock).toBe(true);
  });

  it('escalates on 1-star with refund keyword', async () => {
    const out = await reviewResponderHandler({
      review_id: 'r1',
      review_text: 'It was dirty and we want a refund.',
      rating: 1,
      host_voice: 'warm',
    });
    expect(out.sentiment).toBe('negative');
    expect(out.needs_escalation).toBe(true);
    expect(out.escalation_reason).toBeDefined();
  });
});
