# Host-side demo conversations

These scenarios use synthetic fixture data. They demonstrate the interface and approval flow, not a working host-account integration, measured host revenue or a human user study. All seven host tools return `_mock: true` and never send messages, change prices, accept bookings or assign cleaners.

## A new guest booking request

Host: “A new, unverified guest with no reviews wants one night. Help me review it.”

The agent calls `booking_request_triage` with the host-supplied facts and an explicit `reference_date`. The sample heuristic may recommend `decline_after_review`; it always returns `approval_required: true`. The score is not a calibrated risk probability. The agent asks the host to consider the complete conversation and their actual listing rules before deciding. No acceptance or decline happens.

[Exact reproducible triage input/output](../docs/tools/booking_request_triage.md).

## Wifi and pets

Host: “The guest asked for the wifi password. Draft a reply.”

The agent calls `guest_message_assistant`. The output requests verification of the accommodation's actual credentials and supplies `missing_context`. It does not invent a password, router location, pet fee or access policy. The host supplies the verified facts and reviews the message. This MCP cannot send the reply.

[Exact acknowledgement input/output](../docs/tools/guest_message_assistant.md).

## Pricing and calendar planning

Host: “Show how a pricing review would work for the next month.”

The agent chains `host_insights`, `smart_pricing` and `calendar_optimizer`, labelling every result as simulated. For reproducible examples, insight/calendar calls set `reference_date: "2026-10-01"`. Pricing spans are inclusive and limited to 30 days; the revenue sum assumes every night is booked before fees. Block suggestions do not count toward sample recoverable revenue. The agent demonstrates how actual data could be substituted, without recommending these fictional prices for a real property.

[Insights](../docs/tools/host_insights.md), [pricing](../docs/tools/smart_pricing.md), [calendar](../docs/tools/calendar_optimizer.md).

## A cleaning window that is too short

Host: “Checkout is 11:00 and the next guest arrives at 11:30, both Europe/Berlin on October 1, 2026.”

The agent passes `2026-10-01T11:00:00+02:00` and `2026-10-01T11:30:00+02:00` to `turnover_coordinator`. The response expresses those times in UTC, records a 30-minute window and flags `feasible: false` for its illustrative 90–150 minute cleaning estimate. Cleaner IDs refer to proposals; no crew assignment or message is sent. The host resolves the conflict before approving a real schedule.

[Exact turnover input/output](../docs/tools/turnover_coordinator.md).

## A review mentioning a serious concern

Host: “The guest left five stars but mentioned unsafe conditions.”

The agent calls `review_responder`. A concern keyword can trigger escalation even at five stars. Every draft still requires approval. The agent asks for human investigation and avoids claiming repairs or investigations have already happened. The heuristic cannot recognize every concern or language.

[Review responder contract](../docs/tools/review_responder.md).
