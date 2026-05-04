import { ReviewResponderInput, type ReviewResponderInputT } from './schema.js';
import { reviewResponderHandler } from './handler.js';
import { wrapHandler, type ToolDefinition } from '../registry.js';

export const buildReviewResponderTool = (): ToolDefinition => ({
  name: 'review_responder',
  description:
    '[DEMO — requires Airbnb Partner API] Drafts a host-voiced response to a guest review, classifies sentiment, and flags escalation cases.',
  inputSchema: {
    type: 'object',
    properties: {
      review_id: { type: 'string' },
      review_text: { type: 'string' },
      rating: { type: 'number', enum: [1, 2, 3, 4, 5] },
      host_voice: { type: 'string', enum: ['warm', 'professional'] },
    },
    required: ['review_id', 'review_text', 'rating'],
  },
  schema: ReviewResponderInput,
  handler: wrapHandler(ReviewResponderInput, (input) =>
    reviewResponderHandler(input as ReviewResponderInputT),
  ),
});
