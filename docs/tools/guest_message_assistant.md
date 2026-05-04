# guest_message_assistant (DEMO)

> Requires Airbnb Partner API. Mock implementation matches keywords against a 5-topic template library.

**Pitch:** Drafts host-voiced replies with approval gate.

## Input

```json
{
  "thread_id": "thread-abc",
  "last_message": "Hi, what is the wifi password?",
  "host_voice": "warm"
}
```

## Output

3 suggestions (short/friendly/formal), one recommended index based on `host_voice`, and `approval_required: true`. The host must always confirm before send.
