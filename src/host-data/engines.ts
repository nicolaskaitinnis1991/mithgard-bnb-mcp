import type { z } from 'zod';
import { addDays, asOfDate, dateRange, providedEvidence, roundMoney } from './contracts.js';
import type {
  InsightsData,
  MessageData,
  TriageData,
  PricingData,
  CalendarData,
  ReviewData,
  TurnoverData,
} from './contracts.js';
import type { BookingTriageInputT } from '../tools/booking-request-triage/schema.js';

export const insightsFromData = (data: z.infer<typeof InsightsData>) => {
  const dates = dateRange(data.from, data.to);
  const byDate = new Map(data.nights?.map((night) => [night.date, night]));
  const unknown = dates.filter(
    (date) => !byDate.has(date) || byDate.get(date)?.state === 'unknown',
  );
  const occupied = (data.nights ?? []).filter((night) => night.state === 'booked');
  const eligible = (data.nights ?? []).filter(
    (night) => night.state === 'booked' || night.state === 'available',
  );
  const missing = [
    ...(data.complete ? [] : ['source_completeness']),
    ...(unknown.length ? ['calendar_coverage'] : []),
    ...(occupied.some((night) => night.revenue === undefined) ? ['booked_night_revenue'] : []),
  ];
  const basis = data.complete && unknown.length === 0;
  const revenue =
    basis && !occupied.some((night) => night.revenue === undefined)
      ? roundMoney(occupied.reduce((sum, night) => sum + (night.revenue ?? 0), 0))
      : null;
  const comparison = data.benchmark?.revenue ?? null;
  return {
    ...providedEvidence(data, missing),
    reference_date: data.to,
    reporting_range: { from: data.from, to: data.to },
    occupancy_rate: basis && eligible.length > 0 ? occupied.length / eligible.length : null,
    revenue,
    revenue_eur: data.currency === 'EUR' ? revenue : null,
    adr: revenue !== null && occupied.length > 0 ? roundMoney(revenue / occupied.length) : null,
    revpar: revenue !== null && eligible.length > 0 ? roundMoney(revenue / eligible.length) : null,
    available_nights: basis ? eligible.length : null,
    occupied_nights: basis ? occupied.length : null,
    unknown_nights: unknown.length,
    cancelled_nights: (data.nights ?? []).filter((n) => n.state === 'cancelled').length,
    benchmark_revenue: comparison,
    benchmark_sample_size: data.benchmark?.sample_size ?? null,
    competitor_avg_revenue_eur: data.currency === 'EUR' ? comparison : null,
    delta_pct:
      revenue !== null && comparison !== null && comparison > 0
        ? roundMoney(((revenue - comparison) / comparison) * 100)
        : null,
    pricing_recommendations: [],
    insights: [
      'Computed from caller-provided nightly records; owner blocks and cancelled records are excluded from offered nights.',
      ...(comparison === null
        ? ['No benchmark supplied; no market comparison or causal pricing claim is made.']
        : [
            'Comparison uses the explicitly supplied matched-period benchmark, not a fetched market feed.',
          ]),
      ...(missing.length
        ? ['Incomplete reporting basis; unavailable aggregate metrics remain null.']
        : []),
    ],
  };
};

const MESSAGE_PATTERNS: [string, RegExp][] = [
  [
    'safety',
    /\b(unsafe|dangerous|gas leak|fire|injur\w*|exposed|electrical hazard|unsicher|gefährlich|brand|stromschlag)\b/i,
  ],
  ['wifi', /\b(?:wi[ -]?fi|wlan|internet)\b/i],
  ['checkin', /\b(?:check[ -]?in|einchecken|anreise)\b/i],
  ['late', /\b(?:late|delay\w*|spät\w*|verspät\w*)\b/i],
  ['cancel', /\b(?:cancel\w*|refund\w*|storn\w*|rückerstattung\w*)\b/i],
  ['pet', /\b(?:pets?|dogs?|cats?|hund\w*|katze\w*)\b/i],
];
export const messageFromData = (
  message: string,
  voice: 'casual' | 'warm' | 'professional',
  data: z.infer<typeof MessageData>,
) => {
  const topics = MESSAGE_PATTERNS.filter(([, pattern]) => pattern.test(message)).map(
    ([topic]) => topic,
  );
  const missing: string[] = [];
  const parts: string[] = [];
  const de = data.language === 'de';
  const addMissing = (field: string) => missing.push(field);
  for (const topic of topics) {
    if (topic === 'safety')
      parts.push(
        de
          ? 'Ihr Sicherheitshinweis benötigt dringende persönliche Aufmerksamkeit des Hosts.'
          : 'Your safety concern needs urgent personal attention from the host.',
      );
    if (topic === 'wifi') {
      if (data.access_details_allowed !== true) {
        addMissing('access_details_permission');
        parts.push(
          de
            ? 'Ich muss die Freigabe der WLAN-Zugangsdaten bestätigen.'
            : 'I need to confirm permission to share the wifi credentials.',
        );
      } else if (!data.wifi) {
        addMissing('wifi');
        parts.push(
          de
            ? 'Ich werde die korrekten WLAN-Daten prüfen.'
            : 'I will check the correct wifi details.',
        );
      } else
        parts.push(
          de
            ? `WLAN: ${data.wifi.ssid}; Passwort: ${data.wifi.password}.`
            : `Wifi: ${data.wifi.ssid}; password: ${data.wifi.password}.`,
        );
    }
    if (topic === 'checkin') {
      if (data.checkin_time)
        parts.push(
          de
            ? `Check-in ab ${data.checkin_time} (${data.timezone}).`
            : `Check-in from ${data.checkin_time} (${data.timezone}).`,
        );
      else {
        addMissing('checkin_time');
        parts.push(
          de ? 'Ich werde die Check-in-Zeit bestätigen.' : 'I will confirm the check-in time.',
        );
      }
      if (data.arrival_instructions && data.access_details_allowed === true)
        parts.push(data.arrival_instructions);
      else {
        addMissing(
          data.arrival_instructions ? 'access_details_permission' : 'arrival_instructions',
        );
        parts.push(
          de
            ? 'Die freigegebenen Anreiseinformationen müssen noch bestätigt werden.'
            : 'Approved arrival instructions still need to be confirmed.',
        );
      }
    }
    if (topic === 'late') {
      if (data.late_arrival_allowed === undefined) {
        addMissing('late_arrival_policy');
        parts.push(
          de
            ? 'Ich werde die Möglichkeit einer späten Anreise prüfen.'
            : 'I will check whether late arrival is possible.',
        );
      } else
        parts.push(
          data.late_arrival_allowed
            ? de
              ? 'Eine späte Anreise ist gemäß der übergebenen Regel erlaubt.'
              : 'Late arrival is allowed under the supplied rule.'
            : de
              ? 'Eine späte Anreise ist gemäß der übergebenen Regel nicht erlaubt.'
              : 'Late arrival is not allowed under the supplied rule.',
        );
    }
    if (topic === 'pet') {
      if (data.policy?.pets_allowed === undefined) {
        addMissing('pet_policy');
        parts.push(de ? 'Ich werde die Haustierregel prüfen.' : 'I will check the pet policy.');
      } else if (!data.policy.pets_allowed)
        parts.push(
          de
            ? 'Haustiere sind in dieser Unterkunft nicht erlaubt.'
            : 'Pets are not permitted at this accommodation.',
        );
      else {
        parts.push(
          de
            ? 'Haustiere sind gemäß der übergebenen Regel erlaubt.'
            : 'Pets are permitted under the supplied rule.',
        );
        if (data.pet_fee === undefined) {
          addMissing('pet_fee');
          parts.push(
            de
              ? 'Eine mögliche Gebühr muss noch bestätigt werden.'
              : 'Any applicable fee still needs confirmation.',
          );
        } else
          parts.push(
            de
              ? `Haustiergebühr: ${data.pet_fee.toFixed(2)} ${data.currency}.`
              : `Pet fee: ${data.pet_fee.toFixed(2)} ${data.currency}.`,
          );
      }
    }
    if (topic === 'cancel') {
      if (data.cancellation_policy) parts.push(data.cancellation_policy);
      else {
        addMissing('cancellation_policy');
        parts.push(
          de
            ? 'Ich werde die Stornierungsregel Ihrer Buchung prüfen.'
            : 'I will check the cancellation policy for your reservation.',
        );
      }
    }
  }
  const unsupported = message
    .split(/[?!.;\n]+|\b(?:and|und)\b/i)
    .some(
      (part) =>
        part.trim().length > 5 &&
        !/^(?:thanks?|thank you|please|danke|bitte)\s*$/i.test(part.trim()) &&
        !MESSAGE_PATTERNS.some(([, pattern]) => pattern.test(part)),
    );
  if (topics.length && unsupported) {
    addMissing('unsupported_topic');
    parts.push(
      de
        ? 'Weitere Anliegen benötigen eine persönliche Antwort des Hosts.'
        : 'Other parts of your message need a personal response from the host.',
    );
  }
  if (!topics.length) {
    addMissing('supported_topic');
    parts.push(
      de
        ? 'Danke für Ihre Nachricht. Dieses Anliegen benötigt eine persönliche Antwort des Hosts.'
        : 'Thank you for your message. This topic needs a personal response from the host.',
    );
  }
  const body = parts.join(' ');
  const limitations = [
    'Rule-based EN/DE drafts; topic detection is limited and does not interpret arbitrary language or conversation history.',
    'Facts and sharing permission are supplied by the caller, not authenticated against a booking account.',
  ];
  const unique = [...new Set(missing)];
  return {
    ...providedEvidence(data, unique),
    topics,
    needs_escalation: topics.includes('safety'),
    limitations,
    missing_context: unique,
    approval_required: true as const,
    recommended_index: voice === 'casual' ? 0 : voice === 'professional' ? 2 : 1,
    suggestions: [
      { tone: 'short' as const, text: body },
      { tone: 'friendly' as const, text: `${de ? 'Hallo!' : 'Hi!'} ${body}` },
      { tone: 'formal' as const, text: `${de ? 'Guten Tag.' : 'Dear guest,'} ${body}` },
    ],
  };
};

export const triageFromData = (input: BookingTriageInputT, data: z.infer<typeof TriageData>) => {
  const checks: { rule: string; status: 'pass' | 'fail' | 'unknown'; reason: string }[] = [];
  const check = (rule: string, valid: boolean | undefined, reason: string) =>
    checks.push({
      rule,
      status: valid === undefined ? 'unknown' : valid ? 'pass' : 'fail',
      reason,
    });
  const rules = data.policy;
  check(
    'capacity',
    rules?.max_guests === undefined
      ? undefined
      : input.trip.adults + input.trip.children <= rules.max_guests,
    'Party size compared with supplied capacity.',
  );
  check(
    'minimum_stay',
    rules?.min_nights === undefined ? undefined : input.trip.nights >= rules.min_nights,
    'Stay length compared with supplied minimum.',
  );
  check(
    'pets',
    rules?.pets_allowed === undefined ? undefined : !input.trip.pets || rules.pets_allowed,
    'Pet request compared with supplied policy.',
  );
  // Text is a concern signal only. A supplied trip reason is never proof of trust.
  const textEvent = /\b(party|parties|celebration|veranstaltung|feier)\b/i.test(
    input.trip.reason ?? '',
  );
  const negatedEvent =
    /\b(no|not|without|keine?|ohne)\s+(?:\w+\s+){0,2}(party|parties|celebration|veranstaltung|feier)\b/i.test(
      input.trip.reason ?? '',
    );
  // Negated or contradictory free text is ambiguous, never a policy pass.
  const event =
    data.events_requested === true
      ? true
      : textEvent
        ? negatedEvent
          ? undefined
          : true
        : data.events_requested;
  check(
    'events',
    rules?.events_allowed === undefined || event === undefined
      ? undefined
      : !event || rules.events_allowed,
    'Event request or text concern compared with supplied policy; ambiguous context requires review.',
  );
  const failed = checks.filter((c) => c.status === 'fail');
  const unknown = checks.filter((c) => c.status === 'unknown');
  return {
    ...providedEvidence(
      data,
      unknown.map((c) => `policy.${c.rule}`),
    ),
    risk_score: null,
    score_basis: 'explicit_policy_checks',
    reference_date: input.reference_date ?? asOfDate(data.as_of),
    approval_required: true as const,
    policy_checks: checks,
    recommendation: failed.length
      ? ('decline_after_review' as const)
      : unknown.length || !data.complete
        ? ('review' as const)
        : ('accept_after_review' as const),
    reasoning: [
      'Profile history is context, not permission to bypass listing rules. Trip-reason length creates no trust bonus.',
    ],
    red_flags: failed.map((c) => `Rule failed: ${c.rule}`),
    green_flags: checks.filter((c) => c.status === 'pass').map((c) => `Rule passed: ${c.rule}`),
  };
};

export const pricingFromData = (from: string, to: string, data: z.infer<typeof PricingData>) => {
  const nights = new Map(data.nights.map((night) => [night.date, night]));
  const factors = new Map(data.date_factors?.map((item) => [item.date, item.factor]));
  const daily: {
    date: string;
    suggested: number;
    current: number;
    delta_pct?: number;
    reasons: string[];
  }[] = [];
  const skipped: { date: string; reason: string }[] = [];
  for (const date of dateRange(from, addDays(to, 1))) {
    const night = nights.get(date);
    if (night?.state !== 'available') {
      skipped.push({ date, reason: night?.state ?? 'unknown' });
      continue;
    }
    const base = night.price ?? data.base_price;
    if (base === undefined) {
      skipped.push({ date, reason: 'missing_price' });
      continue;
    }
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const weekdayFactor = data.weekday_factors?.[weekday] ?? 1;
    const dateFactor = factors.get(date) ?? 1;
    const raw = roundMoney(base * weekdayFactor * dateFactor);
    const suggested = roundMoney(Math.max(data.min_price, Math.min(data.max_price, raw)));
    const reasons = [
      `Supplied base ${base.toFixed(2)} ${data.currency}`,
      `Supplied weekday factor ${weekdayFactor.toFixed(2)}`,
      `Supplied date factor ${dateFactor.toFixed(2)}`,
    ];
    if (raw !== suggested)
      reasons.push(
        `Clamped to supplied bounds ${data.min_price.toFixed(2)}–${data.max_price.toFixed(2)}`,
      );
    daily.push({
      date,
      current: base,
      suggested,
      ...(base > 0 ? { delta_pct: roundMoney(((suggested - base) / base) * 100) } : {}),
      reasons,
    });
  }
  const missing = skipped
    .filter((day) => day.reason === 'unknown' || day.reason === 'missing_price')
    .map((day) => `${day.reason}:${day.date}`);
  const total = roundMoney(daily.reduce((sum, day) => sum + day.suggested, 0));
  return {
    ...providedEvidence(data, missing),
    daily_prices: daily,
    skipped_dates: skipped,
    currency: data.currency,
    estimate_basis: 'all_nights_booked_before_fees' as const,
    summary: {
      avg_suggested: daily.length ? roundMoney(total / daily.length) : null,
      total_revenue_estimate: total,
    },
  };
};

export const calendarFromData = (
  referenceDate: string,
  horizon: number,
  data: z.infer<typeof CalendarData>,
) => {
  const dates = dateRange(referenceDate, addDays(referenceDate, horizon));
  const nights = new Map(data.nights.map((night) => [night.date, night]));
  const unknown = dates.filter(
    (date) =>
      !nights.has(date) ||
      nights.get(date)?.state === 'unknown' ||
      nights.get(date)?.state === 'cancelled',
  );
  const gaps: {
    start: string;
    end: string;
    nights: number;
    cost_estimate_eur: number | null;
    opportunity_amount: number | null;
    gap_kind: 'orphan_gap' | 'open_run';
    min_stay_conflict: boolean | null;
    suggestion: 'min_stay_relax' | 'review' | 'none';
  }[] = [];
  let i = 0;
  while (i < dates.length) {
    const start = dates[i];
    if (!start || nights.get(start)?.state !== 'available') {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < dates.length && nights.get(dates[j] ?? '')?.state === 'available') j++;
    const run = dates.slice(i, j);
    const end = addDays(start, run.length);
    const orphan =
      nights.get(addDays(start, -1))?.state === 'booked' && nights.get(end)?.state === 'booked';
    const conflict = data.min_nights === undefined ? null : run.length < data.min_nights;
    const priced = run.every((date) => nights.get(date)?.price !== undefined);
    const amount = priced
      ? roundMoney(run.reduce((sum, date) => sum + (nights.get(date)?.price ?? 0), 0))
      : null;
    gaps.push({
      start,
      end,
      nights: run.length,
      cost_estimate_eur: data.currency === 'EUR' ? amount : null,
      opportunity_amount: amount,
      gap_kind: orphan ? 'orphan_gap' : 'open_run',
      min_stay_conflict: conflict,
      suggestion: conflict ? 'min_stay_relax' : conflict === null ? 'review' : 'none',
    });
    i = j;
  }
  const amount =
    data.complete && unknown.length === 0 && gaps.every((gap) => gap.opportunity_amount !== null)
      ? roundMoney(gaps.reduce((sum, gap) => sum + (gap.opportunity_amount ?? 0), 0))
      : null;
  const missing = [
    ...(unknown.length ? ['calendar_coverage'] : []),
    ...(data.min_nights === undefined ? ['minimum_stay'] : []),
    ...(gaps.some((g) => g.opportunity_amount === null) ? ['gap_prices'] : []),
  ];
  return {
    ...providedEvidence(data, missing),
    reference_date: referenceDate,
    gaps,
    unknown_dates: unknown,
    opportunity_total: amount,
    potential_recovery_eur: data.currency === 'EUR' ? amount : null,
    estimate_basis: 'conditional_full_occupancy_opportunity_before_fees_not_recoverable_revenue',
  };
};

const REVIEW_SIGNALS: [string, RegExp][] = [
  [
    'electrical_safety',
    /exposed.{0,80}(wire|electrical)|(?:wire|cable).{0,80}exposed|electrical\s+(?:hazard|danger)|(?:offene|freiliegende).{0,60}(strom|kabel)|electri(?:c|cal) shock|stromschlag/i,
  ],
  [
    'safety',
    /\b(unsafe|dangerous|gas leak|fire|injur\w*|bedbugs?|unsicher|gefährlich|brand|verletzt\w*)\b/i,
  ],
  ['condition', /\b(dirty|broken|mold|noise|rude|refund|schimmel|schmutzig|defekt)\b/i],
];
export const reviewFromData = (
  review: string,
  rating: number,
  voice: 'warm' | 'professional',
  data: z.infer<typeof ReviewData>,
) => {
  const detected = REVIEW_SIGNALS.filter(([, pattern]) => pattern.test(review)).map(
    ([kind]) => kind,
  );
  const concerns = [...new Set([...detected, ...(data.concerns ?? [])])];
  const escalate = rating <= 2 || concerns.length > 0;
  const sentiment =
    concerns.length && rating >= 3
      ? ('mixed' as const)
      : rating <= 2
        ? ('negative' as const)
        : rating === 3
          ? ('neutral' as const)
          : ('positive' as const);
  const de = data.language === 'de';
  let draft = escalate
    ? de
      ? 'Vielen Dank für Ihr Feedback. Wir nehmen Ihre Hinweise ernst und werden die angesprochenen Punkte prüfen.'
      : 'Thank you for your feedback. We take your concerns seriously and will review the points you raised.'
    : de
      ? voice === 'warm'
        ? 'Vielen Dank für Ihre Bewertung und Ihren Aufenthalt.'
        : 'Vielen Dank, dass Sie Ihre Erfahrungen mit uns geteilt haben.'
      : voice === 'warm'
        ? 'Thank you for your review and for staying with us.'
        : 'Thank you for sharing your experience with us.';
  if (data.completed_actions?.length)
    draft += ` ${de ? 'Bestätigte Maßnahmen:' : 'Confirmed completed actions:'} ${data.completed_actions.map((action) => action.description).join('; ')}.`;
  return {
    ...providedEvidence(data),
    draft,
    sentiment,
    approval_required: true as const,
    needs_escalation: escalate,
    ...(escalate
      ? {
          escalation_reason: concerns.length
            ? 'Concern signals or host-supplied concerns require manual review.'
            : 'Low rating requires manual review.',
        }
      : {}),
    concerns,
    classification_limits: [
      'Rule-based EN/DE safety/condition signals; non-exhaustive, no reliable negation/sarcasm/open-language interpretation.',
      'Supplied action confirmations are caller assertions, not independent evidence of completed repairs.',
    ],
  };
};

export const turnoverFromData = (
  checkout: string,
  checkin: string,
  cleanerId: string | undefined,
  data: z.infer<typeof TurnoverData>,
) => {
  const begin = Date.parse(checkout),
    limit = Date.parse(checkin);
  const cleaning = data.tasks.reduce((sum, task) => sum + task.duration_min, 0);
  const required = cleaning + data.buffer_min;
  let selected: { id: string; start: number } | undefined;
  for (const cleaner of data.cleaners) {
    if (cleanerId !== undefined && cleaner.id !== cleanerId) continue;
    for (const interval of cleaner.available) {
      let start = Math.max(begin, Date.parse(interval.start));
      const end = Math.min(limit, Date.parse(interval.end));
      for (const assigned of [...cleaner.assignments].sort(
        (a, b) => Date.parse(a.start) - Date.parse(b.start),
      )) {
        if (
          start < Date.parse(assigned.end) &&
          start + required * 60000 > Date.parse(assigned.start)
        )
          start = Date.parse(assigned.end);
      }
      if (start + required * 60000 <= end && (!selected || start < selected.start))
        selected = { id: cleaner.id, start };
    }
  }
  const warnings = [
    ...(selected
      ? []
      : ['No supplied cleaner availability can fit the complete task sequence and buffer.']),
    ...(data.complete
      ? []
      : ['Source completeness is not established; the proposed plan requires host verification.']),
    'Proposed only: no cleaner assignment or message is sent.',
  ];
  let cursor = selected?.start ?? begin;
  const scheduled = data.tasks.map((task) => {
    const start = cursor;
    cursor += task.duration_min * 60000;
    return {
      id: task.id,
      title: task.title,
      start: new Date(start).toISOString(),
      end: new Date(cursor).toISOString(),
    };
  });
  const local = (time: number) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: data.timezone,
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(time);
  return {
    ...providedEvidence(data, selected ? [] : ['feasible_cleaner_assignment']),
    approval_required: true as const,
    brief: `Proposed turnover: ${data.tasks.length.toFixed(0)} tasks, ${cleaning.toFixed(0)} min cleaning + ${data.buffer_min.toFixed(0)} min buffer.`,
    checklist: data.tasks.map((task) => task.title),
    crew_message_draft: `Draft only: proposed cleaning ${local(begin)}–${local(limit)} (${data.timezone}); confirm availability and tasks before sending.`,
    estimated_duration_min: cleaning,
    required_duration_min: required,
    window_minutes: (limit - begin) / 60000,
    feasible: !!selected && data.complete,
    proposed_cleaner_id: selected?.id ?? null,
    assignment_status: 'proposed_only' as const,
    scheduled_tasks: selected ? scheduled : [],
    planned_start: selected ? new Date(selected.start).toISOString() : null,
    planned_end: selected ? new Date(selected.start + required * 60000).toISOString() : null,
    local_window: `${local(begin)}–${local(limit)} (${data.timezone})`,
    warnings,
  };
};
