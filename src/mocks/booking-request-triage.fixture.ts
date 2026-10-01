import type { DemoOutput } from '../host-data/contracts.js';
import type {
  BookingTriageInputT,
  BookingTriageOutputT,
} from '../tools/booking-request-triage/schema.js';

import { currentUtcDate } from '../lib/validation.js';

export const BOOKING_TRIAGE_PITCH =
  'Risk-scores guests with auditable reasoning, never auto-acts without approval';

const yearsSince = (iso: string, referenceDate: string): number => {
  const joined = new Date(iso);
  const now = new Date(`${referenceDate}T00:00:00Z`);
  const ms = now.getTime() - joined.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365.25);
};

export const computeTriage = (input: BookingTriageInputT): DemoOutput<BookingTriageOutputT> => {
  const reasoning: string[] = [];
  const red: string[] = [];
  const green: string[] = [];

  // Start at 50 (neutral). Lower = safer.
  let score = 50;

  const referenceDate = input.reference_date ?? currentUtcDate();
  const years = yearsSince(input.guest_profile.joined, referenceDate);
  if (years >= 3) {
    score -= 15;
    green.push(`Account age ${years.toFixed(1)} years (>3 yr).`);
  } else if (years < 0.5) {
    score += 20;
    red.push(`Account younger than 6 months (${years.toFixed(2)} yr).`);
  } else {
    reasoning.push(`Account age ${years.toFixed(1)} years.`);
  }

  if (input.guest_profile.reviews >= 5) {
    score -= 15;
    green.push(`${String(input.guest_profile.reviews)} prior reviews.`);
  } else if (input.guest_profile.reviews === 0) {
    score += 15;
    red.push('No prior reviews on Airbnb.');
  } else {
    reasoning.push(`${String(input.guest_profile.reviews)} prior reviews.`);
  }

  if (input.guest_profile.verified) {
    score -= 10;
    green.push('ID verified by Airbnb.');
  } else {
    score += 10;
    red.push('Identity not verified.');
  }

  if (input.guest_profile.rating !== undefined) {
    if (input.guest_profile.rating >= 4.8) {
      score -= 5;
      green.push(`Avg host rating ${input.guest_profile.rating.toFixed(2)}.`);
    } else if (input.guest_profile.rating < 4.0) {
      score += 15;
      red.push(`Below-average rating ${input.guest_profile.rating.toFixed(2)}.`);
    }
  }

  if (input.trip.adults + input.trip.children >= 6) {
    score += 5;
    reasoning.push('Large party (6+ guests) — confirm purpose.');
  }

  if (input.trip.nights === 1) {
    score += 10;
    red.push('Single-night stay (party-risk pattern).');
  }

  if (input.trip.pets) {
    reasoning.push('Trip includes pets — verify listing allows.');
  }

  if (input.trip.reason !== undefined && input.trip.reason.length > 10) {
    reasoning.push('Trip reason is unverified context; its length does not establish trust.');
  }

  // Clamp 0..100
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let recommendation: BookingTriageOutputT['recommendation'];
  if (score <= 25) recommendation = 'accept_after_review';
  else if (score >= 75) recommendation = 'decline_after_review';
  else recommendation = 'review';

  return {
    risk_score: Math.round(score),
    approval_required: true,
    reference_date: referenceDate,
    recommendation,
    reasoning,
    red_flags: red,
    green_flags: green,
    _mock: true,
    _pitch: BOOKING_TRIAGE_PITCH,
  };
};
