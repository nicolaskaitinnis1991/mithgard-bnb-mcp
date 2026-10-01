import type { TurnoverInputT, TurnoverOutputT } from '../tools/turnover-coordinator/schema.js';
import { fnv1a } from './hash.js';

export const TURNOVER_PITCH =
  'Coordinates turnover end-to-end with crew briefing and handover checklist';

const DURATIONS = [90, 120, 150];

const CHECKLIST: string[] = [
  'Strip and replace all bed linens (master + guest bedrooms)',
  'Clean and sanitize bathrooms (toilet, shower, sink, mirrors)',
  'Wipe kitchen surfaces, run dishwasher, restock essentials',
  'Vacuum and mop all floors',
  'Empty all trash bins; replace liners',
  'Restock toiletries, towels, coffee, tea, water',
  'Inspect for damages or missing items; photograph any issues',
  'Final walk-through and lock-up; confirm key/lockbox status',
];

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm} UTC`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
};

export const computeTurnover = (input: TurnoverInputT): TurnoverOutputT => {
  const seedSrc =
    input.cleaner_id !== undefined ? `${input.listing_id}:${input.cleaner_id}` : input.listing_id;
  const seed = fnv1a(seedSrc);
  const duration = DURATIONS[seed % DURATIONS.length] ?? 120;

  const checkoutDate = formatDate(input.checkout_at);
  const checkoutTime = formatTime(input.checkout_at);
  const checkinDate = formatDate(input.checkin_at);
  const checkinTime = formatTime(input.checkin_at);

  const brief = [
    `Turnover for listing ${input.listing_id}`,
    `Checkout: ${checkoutDate} ${checkoutTime} → Check-in: ${checkinDate} ${checkinTime}`,
    `Estimated duration: ${String(duration)} min`,
    input.cleaner_id !== undefined
      ? `Proposed cleaner: ${input.cleaner_id}`
      : 'Cleaner: TBD — assign before crew message goes out',
  ].join('\n');

  const crew_message_draft = [
    `Hi! Quick turnover at listing ${input.listing_id}:`,
    `- Checkout ${checkoutDate} at ${checkoutTime}`,
    `- Next check-in ${checkinDate} at ${checkinTime}`,
    `- Estimated ${String(duration)} min`,
    `Draft only: confirm assignment, checklist, supplies and time window before sending. Reply when started/done. Thanks!`,
  ].join('\n');

  return {
    brief,
    approval_required: true,
    window_minutes: (Date.parse(input.checkin_at) - Date.parse(input.checkout_at)) / 60000,
    feasible: (Date.parse(input.checkin_at) - Date.parse(input.checkout_at)) / 60000 >= duration,
    warnings: [
      ...((Date.parse(input.checkin_at) - Date.parse(input.checkout_at)) / 60000 < duration
        ? ['Cleaning estimate exceeds the available turnover window; resolve before assigning.']
        : []),
      ...(input.cleaner_id === undefined
        ? ['No cleaner assigned; assignment and availability must be confirmed.']
        : []),
      'Demo checklist and duration are illustrative, not listing-specific or a confirmed crew booking.',
    ],
    checklist: CHECKLIST,
    crew_message_draft,
    estimated_duration_min: duration,
    _mock: true,
    _pitch: TURNOVER_PITCH,
  };
};
