# Fertigstellungs- und Abnahmeplan — 2. Oktober 2026

Ausgangsstand: `80f162254d7458c51f151ab80d12a921e6ca5738`. Der Plan umfasst jeden vorhandenen Funktionsbereich, die interne Workflow-Orchestrierung und die Nachweise. „High end“ wird durch konkrete Kriterien ersetzt; eine vollständige Live-Freigabe wird ohne Datenzugang und echte Nutzer nicht behauptet.

## Arbeitsablauf A bis Z

1. **Inventar und kritischer Review:** Funktionen, Methoden, Schemas, Datenquellen, aktuelle Tests und tatsächliche Lücken erfassen.
2. **Verträge und Abnahmekriterien:** Eingaben, Berechnungen, Grenzen, Fehlermodi und handberechnete Sollwerte festlegen. Demo und übergebene Daten bleiben getrennt.
3. **Fachliche Implementierung:** Die sieben Host-Funktionen rechnen und planen mit ausdrücklich übergebenen Daten. Keine erfundenen Buchungen, Marktpreise, Regeln oder bestätigten Einsätze.
4. **Technische Absicherung:** Abbruch nach begonnener Arbeit, begrenzte Ausgabe/Cache-Größe, Warteschlangenfehler und konkurrierende Recovery-Aufrufe prüfen.
5. **Agentischer Ablauf:** Ein überprüfbarer Plan wird validiert, begrenzt ausgeführt und anhand echter Tool-Ergebnisse bewertet. Fehler, Abbruch, Quellen und nötige Freigaben bleiben sichtbar.
6. **Abnahme:** Fachliche Tests mit nachrechenbaren Ergebnissen, SDK-Vertragstests, native/Container-Last, Installation, Lint, Typen, Coverage, Build und Audit ausführen. Maschinenberichte erzeugen.
7. **Übergabe:** Index, Funktionskarte, aktuelle Dokumentation, Abnahmeprotokoll, Quellcode-Archiv und vorhandenen Entwurfs-PR aktualisieren.
8. **Externe Abnahme:** Providerzugang, reale Import-/Schreibverträge, Zielsystem-Integration und menschliche Nutzerprüfung separat durchführen. Diese Punkte bleiben offen, wenn die Voraussetzungen fehlen.

## Zustände und Nachweise

Die lokale Implementierung liegt jetzt vor. Ein Abnahmestatus wird ausschließlich aus dem anschließend ausgeführten Maschinenbericht übernommen; offene externe Voraussetzungen bleiben offen.

`planned` bedeutet geplant; `implemented` bedeutet Code vorhanden; `verified` verlangt erfolgreiche, zum geprüften Quellstand gehörende Befehle und konkrete Testfälle. `external_pending` bezeichnet fehlende externe Voraussetzungen. Ein grüner Test für ein Demo darf keinen Provider- oder Menschen-Test ersetzen.

Die maschinenlesbare Matrix steht in [plan.json](acceptance/plan.json). Bei mehreren Aufgaben kann der vorhandene kritische Review unabhängig laufen; Datei-Verantwortung und anschließende Integration bleiben eindeutig. Pläne werden vor der jeweiligen Implementierung erstellt.

## Bereichsplan

### PUB-SEARCH — Public search

- Nightly, stay-total and unknown quotes preserve evidence and currency.
- Date/currency cache isolation, invalid inputs and changed public shapes fail explicitly.

Code: `src/tools/search`, `src/parsers/airbnb-public.ts`.

Prüfungen: `tests/integration/parser-search-live.test.ts`, `tests/unit/search-handler.test.ts`.

Externe Abnahme: Live Airbnb availability is a separate opt-in observation.

### PUB-LISTING — Public listing details

- Unknown numeric facts remain unknown; no invented account facts.
- All input, HTTP and output budgets hold; live timeout is visible.

Code: `src/tools/listing-details`, `src/parsers/airbnb-public.ts`.

Prüfungen: `tests/integration/parser-listing.test.ts`, `tests/unit/listing-handler.test.ts`.

Externe Abnahme: External listing availability cannot be guaranteed from fixtures.

### HOST-INSIGHTS — Operational insights

- 30 nights, 5 owner blocks, 10 occupied nights, revenue1000 -> occupancy0.4, ADR100, RevPAR40.
- Zero denominator -> null, cancelled/excluded nights do not inflate revenue, missing comparison -> no market claim.
- Identical provided data with a different listing ID produces identical numeric metrics.

Code: `src/tools/host-insights`.

Prüfungen: `tests/integration/provided-host-data.test.ts`.

Externe Abnahme: Authenticated automatic import and actual benchmark data need a provider.

### HOST-MESSAGE — Guest drafts

- Wifi plus pet question handles both topics; missing facts remain listed.
- Verified property policy overrides a guest claim; access data requires explicit permission.
- DE/EN template limits and unsupported topics are explicit; every draft requires approval.

Code: `src/tools/guest-message-assistant`.

Prüfungen: `tests/integration/provided-host-data.test.ts`.

Externe Abnahme: Sending a message requires authorized messaging integration.

### HOST-TRIAGE — Booking triage

- Capacity4 and party of20 cannot be recommended for acceptance.
- Explicit event/pet/min-stay violations take precedence over profile scores.
- Unknown required rules -> review; long trip reason is not proof of trust; no autonomous decision.

Code: `src/tools/booking-request-triage`.

Prüfungen: `tests/integration/provided-host-data.test.ts`.

Externe Abnahme: Booking decisions and source authenticity need authorized integration.

### HOST-PRICING — Price suggestions

- Base100 x factor1.25 capped120 ->120, with reason.
- Booked/blocked nights are excluded; absent prices never get a synthetic baseline.
- Currency, max30dates, bounds and full-occupancy assumption are explicit; no claimed revenue forecast.

Code: `src/tools/smart-pricing`.

Prüfungen: `tests/integration/provided-host-data.test.ts`.

Externe Abnahme: Live market feed and actual price changes are separate provider operations.

### HOST-CALENDAR — Calendar analysis

- Fully booked calendar -> no gaps.
- Two available nights between booked nights with min-stay3 -> actual min-stay conflict.
- Unknown dates never become available; amounts derive only from supplied prices and are conditional.

Code: `src/tools/calendar-optimizer`.

Prüfungen: `tests/integration/provided-host-data.test.ts`.

Externe Abnahme: Automatic calendar synchronization requires a provider.

### HOST-REVIEW — Review drafts

- Five-star exposed-electrical-wires complaint escalates and does not get a praise-only response.
- No completed repair is claimed without supplied confirmation; concerns outrank star count.
- Classification limits are explicit and human approval always required.

Code: `src/tools/review-responder`.

Prüfungen: `tests/integration/provided-host-data.test.ts`.

Externe Abnahme: Publication and open-ended LLM interpretation need separate integration/evaluation.

### HOST-TURNOVER — Turnover plan

- 120 cleaning +30 buffer fits180minute window.
- Availability, conflicting assignment and late start can make a plan infeasible.
- UTC-offset/timezone arithmetic is tested; proposed assignment is never reported as confirmed.

Code: `src/tools/turnover-coordinator`.

Prüfungen: `tests/integration/provided-host-data.test.ts`.

Externe Abnahme: Real crew assignment/status/communication requires a provider.

### FLOW — Plan / execute / verify workflow

- Bounded explicit steps produce a reviewable plan before execution.
- All arguments are validated before the first step; unknown tools and recursion are rejected.
- Cancellation, deadlines, dependency order and partial failure are explicit; later dependent work cannot falsely succeed.
- Results retain provided/demo/public provenance and require human approval for business actions.

Code: `src/workflows`.

Prüfungen: `tests/integration/host-workflow.test.ts`.

Externe Abnahme: Optional LLM planner is distinct from deterministic tool orchestration.

### PROTO — MCP contracts and privacy

- Discovery before SDK calls enforces output contracts for every tool.
- Abort during a handler cannot return a late success; UTF8 output has a finite byte limit.
- Errors/debug logs do not expose arbitrary guest text, credentials or dynamic keys.

Code: `src/tools/registry.ts`, `src/server.ts`, `src/lib/redaction.ts`.

Prüfungen: `tests/integration/mcp-contract.test.ts`, `tests/unit/registry.test.ts`, `tests/unit/redaction.test.ts`.

### OPS — Operations, HTTP and resource limits

- Queue timeout is distinguished from upstream timeout and does not trip upstream circuit.
- Old success or failure cannot override a newer recovery generation.
- Cache memory and workflow/HTTP queue/body/deadline budgets are bounded; shutdown releases active work.

Code: `src/operations`, `src/lib/http.ts`, `src/lib/cache.ts`.

Prüfungen: `tests/unit/operations-agent.test.ts`, `tests/unit/http-resilience.test.ts`, `tests/integration/http-lifecycle.test.ts`, `tests/unit/cache.test.ts`, `tests/unit/env.test.ts`, `tests/e2e/eof-shutdown.test.ts`.

Externe Abnahme: Process restart and external alert delivery require a configured supervisor/destination.

### LOAD — Synthetic multi-tool load

- Initialized discovery, all domain result schemas and workflow batches are checked.
- Explicit call counts, concurrency, success/error counts, duration and scope are recorded.
- Native and constrained-container runs pass; no external Airbnb stress.

Code: `tests/stress`.

Prüfungen: `tests/stress/virtual-users.test.ts`.

Externe Abnahme: Synthetic tests are not human acceptance or an internet-scale SLA.

### EVIDENCE — Inventory, traceability, packaging

- Source/function/method inventory and Markdown hashes cover maintained code and docs.
- Each acceptance area maps to real source, real test cases and machine-produced command results.
- No acceptance result is written as passed without successful execution; failures and external gates remain visible.
- Clean install, lint, strict types, coverage, build, container and audit are executed locally; CI repeats this gate. The final handoff separately records remote CI and reviewed-commit archive identity.

Code: `scripts`, `docs`.

Prüfungen: Maschinenlesbare Prüfberichte, Inventar- und Verpackungsprüfung.

Externe Abnahme: Human host acceptance and target Base360 integration require real participants/access.

## Zeit und Umfang

Die Codebasis ist überschaubar. Der Aufwand liegt in korrekten Datenverträgen, Negativfällen und belastbarer Abnahme. Bestehende bestandene Prüfungen werden wiederverwendet; neue/fehlerhafte Bereiche erhalten gezielte Prüfungen, danach folgt ein gemeinsamer Durchlauf. Es wird kein Endtermin für fehlende Providerzugänge oder menschliche Rückmeldungen erfunden.
