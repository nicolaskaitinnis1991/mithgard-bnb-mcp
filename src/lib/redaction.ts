// Debug logs carry structure and constrained metadata, never free-form text.
// This applies to derived replies/briefings as well as raw guest input. The
// actual MCP response is unaffected; this helper is used only on stderr logs.
const SENSITIVE_KEYS = new Set([
  'email',
  'phone',
  'host_name',
  'guest_name',
  'id',
  'listing_id',
  'thread_id',
  'review_id',
  'cleaner_id',
]);

const SAFE_STRING_VALUES: Record<string, ReadonlySet<string>> = {
  _source: new Set(['public']),
  status: new Set(['ok', 'error']),
  kind: new Set([
    'RateLimited',
    'UpstreamHTTP',
    'ParseFailed',
    'ValidationFailed',
    'NotImplemented',
    'TransportFailed',
    'OutputValidationFailed',
    'UnexpectedError',
    'Cancelled',
  ]),
  error_kind: new Set([
    'RateLimited',
    'UpstreamHTTP',
    'ParseFailed',
    'ValidationFailed',
    'NotImplemented',
    'TransportFailed',
    'OutputValidationFailed',
    'UnexpectedError',
    'Cancelled',
  ]),
  host_voice: new Set(['casual', 'professional', 'warm']),
  tone: new Set(['short', 'friendly', 'formal']),
  sentiment: new Set(['positive', 'neutral', 'negative', 'mixed']),
  recommendation: new Set(['accept_after_review', 'decline_after_review', 'review']),
  suggestion: new Set(['discount', 'min_stay_relax', 'block']),
  period: new Set(['last_30d', 'last_90d', 'last_year']),
  price_basis: new Set(['nightly', 'total_stay', 'unknown']),
};

// Field names themselves can contain secrets in arbitrary records. Only
// schema-defined keys are retained; unknown keys are counted, not printed.
const SAFE_KEYS = new Set([
  ...Object.keys(SAFE_STRING_VALUES),
  ...SENSITIVE_KEYS,
  'location',
  'checkin',
  'checkout',
  'adults',
  'children',
  'min_price',
  'max_price',
  'currency',
  'from',
  'to',
  'reference_date',
  'horizon_days',
  'guest_profile',
  'trip',
  'joined',
  'reviews',
  'rating',
  'verified',
  'pets',
  'nights',
  'reason',
  'last_message',
  'review_text',
  'message_text',
  'checkout_at',
  'checkin_at',
  'results',
  'total_estimate',
  'query',
  'listing',
  'title',
  'url',
  'price_per_night',
  'display_price',
  'review_count',
  'thumbnail_url',
  'description',
  'amenities',
  'bedrooms',
  'bathrooms',
  'max_guests',
  'check_in',
  'check_out',
  'house_rules',
  'reviews_summary',
  'host_summary',
  'total',
  'average',
  'by_category',
  'cleanliness',
  'accuracy',
  'communication',
  'value',
  'recent_excerpts',
  'name',
  'superhost',
  'response_rate',
  'response_time',
  'languages',
  'occupancy_rate',
  'revenue_eur',
  'competitor_avg_revenue_eur',
  'delta_pct',
  'pricing_recommendations',
  'insights',
  'date_range',
  'current',
  'suggested',
  'suggestions',
  'text',
  'recommended_index',
  'approval_required',
  'missing_context',
  'warnings',
  'risk_score',
  'reasoning',
  'red_flags',
  'green_flags',
  'daily_prices',
  'summary',
  'avg_suggested',
  'total_revenue_estimate',
  'date',
  'reasons',
  'gaps',
  'start',
  'end',
  'cost_estimate_eur',
  'potential_recovery_eur',
  'draft',
  'needs_escalation',
  'escalation_reason',
  'brief',
  'checklist',
  'crew_message_draft',
  'estimated_duration_min',
  '_mock',
  '_pitch',
  'error',
  'retry_after_ms',
  'issues',
  'code',
  'path',
]);

const DEPTH_LIMIT = 10;
const ARRAY_LIMIT = 100;

export const sanitize = (value: unknown, depth = 0): unknown => {
  if (depth > DEPTH_LIMIT) return '[DEPTH_LIMIT]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return '[REDACTED]';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '[REDACTED]';
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'object') return '[REDACTED]';
  if (Array.isArray(value)) {
    const limited = value.slice(0, ARRAY_LIMIT).map((v) => sanitize(v, depth + 1));
    if (value.length > ARRAY_LIMIT)
      limited.push(`[TRUNCATED ${String(value.length - ARRAY_LIMIT)} ITEMS]`);
    return limited;
  }

  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  let redactedFields = 0;
  for (const [k, v] of Object.entries(input)) {
    const key = k.toLowerCase();
    if (!SAFE_KEYS.has(key)) {
      redactedFields += 1;
    } else if (SENSITIVE_KEYS.has(key)) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'string' && SAFE_STRING_VALUES[key]?.has(v)) {
      out[k] = v;
    } else {
      out[k] = sanitize(v, depth + 1);
    }
  }
  if (redactedFields > 0) out._redacted_fields = redactedFields;
  return out;
};
