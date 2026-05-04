import { describe, it, expect } from 'vitest';
import { ReviewResponderInput } from '../../src/tools/review-responder/schema.js';

describe('ReviewResponderInput', () => {
  it('accepts valid input', () => {
    const r = ReviewResponderInput.parse({
      review_id: 'r1',
      review_text: 'Great place!',
      rating: 5,
    });
    expect(r.host_voice).toBe('warm');
  });

  it('rejects rating outside 1-5', () => {
    const r = ReviewResponderInput.safeParse({
      review_id: 'r1',
      review_text: 'x',
      rating: 6,
    });
    expect(r.success).toBe(false);
  });
});
