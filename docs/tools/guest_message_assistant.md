# guest_message_assistant

> Drafts three host-voiced replies (short / friendly / formal) to a guest
> message, with a recommended index. Always requires host approval before
> sending.
> Status: **Demo (requires Airbnb Partner API)** — current implementation
> detects topic by keyword and returns templated drafts.

## Purpose

`guest_message_assistant` is the safest of the host-workflow demo tools:
given the most recent guest message, it returns three pre-written reply
options keyed to a detected topic (wifi, check-in, late arrival,
cancellation, pets, or a generic fallback) in three tones. It never sends
anything — `approval_required: true` is hard-coded, and the recommended
index just biases the host toward a tone match. A real implementation would
use Airbnb's Messaging API to actually deliver the chosen reply.

## Input schema

```ts
{
  thread_id: string;                                          // required
  last_message: string;                                       // required, non-empty
  host_voice?: "casual" | "professional" | "warm";            // default "warm"
}
```

Source: [`src/tools/guest-message-assistant/schema.ts`](../../src/tools/guest-message-assistant/schema.ts).

## Output shape

```jsonc
{
  "suggestions": [
    { "tone": "short",    "text": "..." },
    { "tone": "friendly", "text": "..." },
    { "tone": "formal",   "text": "..." }
  ],
  "recommended_index": 1,        // 0..2; chosen by host_voice
  "approval_required": true,     // always true — hard gate
  "_mock": true,
  "_pitch": "Drafts host-voiced replies with approval gate"
}
```

`recommended_index` is `0` for `casual`, `1` for `warm`, `2` for
`professional`. Always exactly 3 suggestions.

## Example

### Agent prompt

> "A guest just asked for the wifi password — draft me a reply in my normal
> warm tone."

### Tool call (JSON-RPC)

```json
{
  "method": "tools/call",
  "params": {
    "name": "guest_message_assistant",
    "arguments": {
      "thread_id": "thread-abc",
      "last_message": "Hi, what is the wifi password?",
      "host_voice": "warm"
    }
  }
}
```

### Response

```jsonc
{
  "suggestions": [
    {
      "tone": "short",
      "text": "Wifi: \"BnBGuest\" / Password: \"welcome2026\". Router by the entrance."
    },
    {
      "tone": "friendly",
      "text": "Hi! The wifi network is \"BnBGuest\" and the password is \"welcome2026\". The router is right by the entrance — let me know if anything is unclear!"
    },
    {
      "tone": "formal",
      "text": "Dear guest, please find the wifi credentials below: SSID \"BnBGuest\", password \"welcome2026\". The router is located at the entrance area. Kind regards."
    }
  ],
  "recommended_index": 1,
  "approval_required": true,
  "_mock": true,
  "_pitch": "Drafts host-voiced replies with approval gate"
}
```

Topic detection: case-insensitive keyword scan against the last message.
Keywords (per topic) live in
[`src/mocks/guest-message-assistant.fixture.ts`](../../src/mocks/guest-message-assistant.fixture.ts):

- `wifi`: "wifi", "wlan", "internet"
- `checkin`: "check-in", "checkin", "check in", "einchecken"
- `late`: "late", "spät", "verspät", "delay"
- `cancel`: "cancel", "storno", "refund", "rückerstattung"
- `pet`: "pet", "hund", "katze", "dog", "cat"

No match → `default` topic (generic "I'll get back to you").

## Edge cases & failure modes

- **Demo data only** — `_mock: true` always set. Real version would call the
  Airbnb Messaging API and offer to actually send the chosen suggestion.
- **PII in `last_message`** — logger redacts `*.message_text` by default
  (see [`src/config/logger.ts`](../../src/config/logger.ts)). The tool itself
  echoes nothing of the message back in the output.
- **Multilingual message that matches multiple topics** → first match wins
  (in declared order: wifi → checkin → late → cancel → pet).
- **No topic match** → `default` topic returns generic acknowledgement, not
  an error.

## Performance characteristics

- **Cache TTL**: none.
- **Rate-limited**: no.
- **Typical p95 latency**: <1 ms (pure string scan + template lookup).

## When to use

- ✅ Best for: pre-drafting replies the host can approve in one tap, demos of
  approval-gated agent flows, integration into a host inbox UI.
- ❌ Not for: anything resembling auto-send. `approval_required` exists
  precisely to prevent that. Also not for novel/edge-case messages that don't
  fit one of the six template topics — a real LLM-backed implementation
  belongs there.

## See also

- Source: [`src/tools/guest-message-assistant/`](../../src/tools/guest-message-assistant/)
- Schema: [`src/tools/guest-message-assistant/schema.ts`](../../src/tools/guest-message-assistant/schema.ts)
- Fixture: [`src/mocks/guest-message-assistant.fixture.ts`](../../src/mocks/guest-message-assistant.fixture.ts)
- Related tools: [`booking_request_triage`](./booking_request_triage.md),
  [`review_responder`](./review_responder.md)
- Mock-vs-live honesty policy:
  [ADR-0005](../adr/0005-mock-vs-live-honesty.md)
