import type { DemoOutput } from '../host-data/contracts.js';
import type {
  ReviewResponderInputT,
  ReviewResponderOutputT,
} from '../tools/review-responder/schema.js';

export const REVIEW_RESPONDER_PITCH =
  'Auto-drafts review responses, flags escalation cases for human review';

const ESCALATION_KEYWORDS = [
  'exposed electrical',
  'exposed wire',
  'electrical wires',
  'dangerous',
  'freiliegende',
  'stromschlag',
  'refund',
  'broken',
  'dirty',
  'noise',
  'mold',
  'unsafe',
  'rude',
  'fire',
  'injur',
  'gas leak',
  'schimmel',
  'unsicher',
  'verletzt',
  'schmutzig',
];

export const computeReviewResponse = (
  input: ReviewResponderInputT,
): DemoOutput<ReviewResponderOutputT> => {
  const lower = input.review_text.toLowerCase();
  const hit = ESCALATION_KEYWORDS.find((k) => lower.includes(k));

  let sentiment: ReviewResponderOutputT['sentiment'];
  if (input.rating >= 4) sentiment = 'positive';
  else if (input.rating === 3) sentiment = 'neutral';
  else sentiment = 'negative';

  if (sentiment === 'negative' && hit !== undefined) sentiment = 'negative';
  if (input.rating >= 3 && hit !== undefined) sentiment = 'mixed';

  const needs_escalation = input.rating <= 2 || hit !== undefined;

  let draft: string;
  if (input.host_voice === 'warm') {
    if (sentiment === 'positive') {
      draft = `Thank you so much for the kind words! It made our day to read your review — we hope to welcome you back soon.`;
    } else if (sentiment === 'mixed') {
      draft = `Thank you for sharing your concerns. We will review the points you raised before responding further.`;
    } else if (sentiment === 'neutral') {
      draft = `Thank you for taking the time to share your feedback. We appreciate the honest review and will use it to improve.`;
    } else {
      draft = `We're truly sorry your stay didn't meet expectations. Your feedback is taken seriously and we will review the issues you mentioned.`;
    }
  } else {
    if (sentiment === 'positive') {
      draft = `Thank you for your review. We are pleased to hear your stay was enjoyable and look forward to hosting you again.`;
    } else if (sentiment === 'mixed') {
      draft = `Thank you for the balanced review. We will review the points raised and address them with our team.`;
    } else if (sentiment === 'neutral') {
      draft = `Thank you for your feedback. We will take your comments into consideration for ongoing improvements.`;
    } else {
      draft = `We sincerely apologize that the stay did not meet expectations. We will review the issues raised before responding further.`;
    }
  }

  const out: DemoOutput<ReviewResponderOutputT> = {
    draft,
    approval_required: true,
    sentiment,
    needs_escalation,
    _mock: true,
    _pitch: REVIEW_RESPONDER_PITCH,
  };

  if (needs_escalation) {
    return {
      ...out,
      escalation_reason:
        hit !== undefined
          ? `Review mentions "${hit}" — manual review recommended.`
          : 'Low rating — manual review recommended.',
    };
  }
  return out;
};
