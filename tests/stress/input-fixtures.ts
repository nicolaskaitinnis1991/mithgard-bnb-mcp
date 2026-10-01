// Synthetic, caller-supplied facts. This dataset exercises local engines only;
// it is neither an authenticated host import nor live market/booking evidence.
const metadata = {
  as_of: '2026-06-01T09:00:00Z',
  timezone: 'Europe/Berlin',
  currency: 'EUR',
  complete: true,
};

export const demoInputs: Record<string, Record<string, unknown>> = {
  host_insights: { listing_id: 'synthetic-listing', reference_date: '2026-06-01' },
  guest_message_assistant: {
    thread_id: 'synthetic-thread',
    last_message: 'Is Wi-Fi available, and may I bring a pet?',
  },
  booking_request_triage: {
    thread_id: 'synthetic-thread',
    reference_date: '2026-06-01',
    guest_profile: { joined: '2020-01-01', reviews: 4, verified: true },
    trip: { adults: 2, children: 0, pets: false, nights: 3 },
  },
  smart_pricing: { listing_id: 'synthetic-listing', from: '2026-06-01', to: '2026-06-03' },
  calendar_optimizer: {
    listing_id: 'synthetic-listing',
    reference_date: '2026-06-01',
    horizon_days: 30,
  },
  review_responder: {
    review_id: 'synthetic-review',
    review_text: 'Beautiful apartment, but the electrical wires are exposed.',
    rating: 5,
  },
  turnover_coordinator: {
    listing_id: 'synthetic-listing',
    checkout_at: '2026-06-01T10:00:00Z',
    checkin_at: '2026-06-01T13:00:00Z',
  },
};

const days = (count: number, state: (index: number) => string) =>
  Array.from({ length: count }, (_, index) => ({
    date: `2026-06-${String(index + 1).padStart(2, '0')}`,
    state: state(index),
    price: 100,
  }));

const hostData: Record<string, Record<string, unknown>> = {
  host_insights: {
    ...metadata,
    from: '2026-06-01',
    to: '2026-07-01',
    nights: days(30, (index) =>
      index < 5 ? 'owner_block' : index < 15 ? 'booked' : 'available',
    ).map((night) => ({ ...night, ...(night.state === 'booked' ? { revenue: 100 } : {}) })),
  },
  guest_message_assistant: {
    ...metadata,
    language: 'en',
    policy: { pets_allowed: false },
    wifi: { ssid: 'synthetic-network', password: 'synthetic-access-fact' },
    access_details_allowed: false,
  },
  booking_request_triage: {
    ...metadata,
    policy: { max_guests: 4, min_nights: 2, pets_allowed: false, events_allowed: false },
    events_requested: false,
  },
  smart_pricing: {
    ...metadata,
    nights: days(3, () => 'available'),
    base_price: 100,
    min_price: 80,
    max_price: 120,
    date_factors: [{ date: '2026-06-01', factor: 1.25 }],
  },
  calendar_optimizer: {
    ...metadata,
    min_nights: 3,
    nights: days(30, (index) => (index === 1 || index === 2 ? 'available' : 'booked')),
  },
  review_responder: {
    ...metadata,
    language: 'en',
    concerns: ['exposed electrical wires'],
    completed_actions: [],
  },
  turnover_coordinator: {
    ...metadata,
    tasks: [{ id: 'synthetic-clean', title: 'Clean apartment', duration_min: 120 }],
    buffer_min: 30,
    cleaners: [
      {
        id: 'synthetic-cleaner',
        available: [{ start: '2026-06-01T09:00:00Z', end: '2026-06-01T15:00:00Z' }],
        assignments: [],
      },
    ],
  },
};

export const providedInputs: Record<string, Record<string, unknown>> = Object.fromEntries(
  Object.entries(demoInputs).map(([name, input]) => [
    name,
    { ...input, mode: 'provided', host_data: hostData[name] },
  ]),
);

export const APPROVAL_TOOLS = new Set([
  'guest_message_assistant',
  'booking_request_triage',
  'review_responder',
  'turnover_coordinator',
]);
