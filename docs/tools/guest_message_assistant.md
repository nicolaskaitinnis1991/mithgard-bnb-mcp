# guest_message_assistant

Draft guest acknowledgements without invented house facts. **Demo only:** output always carries `_mock: true`. This tool has no Airbnb Partner API connection and performs no external action. Treat results as examples, never as observed host data.

## Contract

- `thread_id`: nonempty identifier, at most 200 characters.
- `last_message`: nonempty text, at most 16,000 characters.
- `host_voice`: `casual`, `professional`, or `warm` (default).

A keyword heuristic selects wifi, check-in, late arrival, cancellation, pet, or generic acknowledgement templates. It does not read a listing, reservation or conversation history. Drafts ask for verification rather than inventing passwords, access codes, check-in times, pet permission or fees. `missing_context` identifies information that must be supplied before giving a factual answer. `approval_required: true` applies to every draft; this tool never sends messages.

All inputs reject unknown fields. Identifiers and free text are bounded. Invalid input produces an MCP tool error before the handler runs. Outputs are validated against the registered Zod schema.

## Reproducible offline example

This input/output pair was generated from the fixture handler, not from a real host account. Dates are explicit for reproducibility.

Input:

```json
{
  "thread_id": "demo-thread",
  "last_message": "What is the wifi password?",
  "host_voice": "warm"
}
```

Output:

```json
{
  "suggestions": [
    {
      "tone": "short",
      "text": "I will check the correct wifi details for your accommodation and get back to you."
    },
    {
      "tone": "friendly",
      "text": "Hi! Thanks for asking. I will confirm the wifi network and password for your accommodation and get back to you."
    },
    {
      "tone": "formal",
      "text": "Dear guest, I will verify the wifi details for your accommodation before sharing them with you."
    }
  ],
  "missing_context": [
    "Verified listing wifi credentials"
  ],
  "recommended_index": 1,
  "approval_required": true,
  "_mock": true,
  "_pitch": "Drafts host-voiced replies with approval gate"
}
```

## Source and validation

- [Schema](../../src/tools/guest-message-assistant/schema.ts)
- [Handler](../../src/tools/guest-message-assistant/handler.ts)
- [Fixture](../../src/mocks/guest-message-assistant.fixture.ts)
- [Synthetic host regression scenarios](../../tests/integration/virtual-host-scenarios.test.ts)
- [Limitations](../limitations.md)

Synthetic scenarios are automated acceptance tests. They do not constitute human user testing.
