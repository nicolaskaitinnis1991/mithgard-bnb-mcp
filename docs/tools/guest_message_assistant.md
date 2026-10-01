# guest_message_assistant

Builds three EN/DE draft replies from supplied property facts and policy. Multiple recognized topics are handled together; no message is sent.

## Mode and evidence

`mode: "provided"` requires `host_data`. Passing data without that mode, or omitting data in that mode, fails validation; there is no fixture fallback. With `mode: "demo"` (or no mode and no data), the existing synthetic fixture runs instead.

Every result has `_source`, `_mock`, and `data_evidence`. Provided calculations use `_source: "provided", _mock: false`; this means calculated from caller assertions, not authenticated/imported account data. Evidence includes the caller's `as_of` timestamp, IANA `timezone`, `currency`, `complete`, and detected `missing_fields`. `complete: true` is only retained when the source asserts completeness and required calculation facts are present. Demo evidence has `as_of: null`, `complete: false`, and `missing_fields: ["synthetic_data"]`.

Metadata is required in every supplied dataset. Supported currencies are EUR, GBP, USD, CAD, AUD and CHF; money supports up to two decimals, nonnegative values and a maximum of 1,000,000 per supplied amount. No currency conversion occurs. Input objects reject unknown fields; strings, arrays, dates and amounts are bounded. Outputs are validated at the MCP boundary.

## Supplied-data contract and calculation

- `thread_id`: nonempty ID up to 200 characters; `last_message`: 1–16,000 trimmed characters.
- `host_voice`: `casual`, `warm` (default), `professional`.
- `host_data.language`: `en` or `de` (required).
- Optional facts: `policy.pets_allowed`, `wifi: {ssid, password}`, `checkin_time` (`HH:MM` in the supplied timezone), `arrival_instructions`, `late_arrival_allowed`, `pet_fee`, `cancellation_policy`.
- `access_details_allowed: true` is required before WLAN credentials or arrival instructions can be included. The flag is a caller assertion, not independent booking authentication. Passwords are never copied into `data_evidence`.

Finite patterns recognize safety, wifi, check-in, late arrival, cancellation and pet topics. Safety signals appear first and set `needs_escalation: true`. A guest claim cannot override supplied pet policy. Missing facts/permission are listed in `missing_context` and drafted as requests for confirmation. Unknown topics and some mixed unsupported clauses require a personal host response. Detection is non-exhaustive and cannot reliably interpret arbitrary language, sarcasm, negation or complete conversation history; `limitations` explains this. Three tones do not imply three different factual answers. Every draft has `approval_required: true`.

## Reproducible synthetic example

These caller facts are synthetic test data, not a real property account. Input:

```json
{
  "mode": "provided",
  "thread_id": "synthetic-thread",
  "last_message": "What is the wifi password, and may I bring a dog?",
  "host_data": {
    "as_of": "2026-06-03T09:00:00Z",
    "timezone": "Europe/Berlin",
    "currency": "EUR",
    "complete": true,
    "language": "en",
    "policy": {
      "pets_allowed": false
    },
    "wifi": {
      "ssid": "synthetic-network",
      "password": "synthetic-access"
    },
    "access_details_allowed": false
  }
}
```

Selected output fields (the full result also includes evidence and other validated fields):

```json
{
  "_source": "provided",
  "_mock": false,
  "topics": [
    "wifi",
    "pet"
  ],
  "needs_escalation": false,
  "missing_context": [
    "access_details_permission"
  ],
  "approval_required": true,
  "recommended_index": 1
}
```

## External prerequisites and acceptance

Authenticating a reservation and sending a reply need an authorized messaging/provider integration. Open-ended language quality needs separate evaluation.

- [Schema](../../src/tools/guest-message-assistant/schema.ts)
- [Handler](../../src/tools/guest-message-assistant/handler.ts)
- [Strict host-data contracts](../../src/host-data/contracts.ts)
- [Local calculation engines](../../src/host-data/engines.ts)
- [Provided-data acceptance scenarios](../../tests/integration/provided-host-data.test.ts)
- [Saved acceptance plan](../acceptance-plan.md)

Automated scenarios and synthetic load are technical evidence, not human host acceptance.
