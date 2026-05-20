# Mithgard BnB MCP — Design-Spec

**Datum:** 2026-05-03
**Autor:** Nico Kaitinnis (Mithgard)
**Status:** Entwurf — wartet auf Nutzer-Freigabe vor dem Plan-Schreiben
**Repo:** `~/Desktop/MITHGARD/Tools und MCP/MITHGARD-BNB-MCP` (privat)

---

## 1. Problem

Einzel-Airbnb-Hosts bekommen keinen Partner-API-Key. Es gibt keinen First-Party-MCP-Server, kein Agenten-SDK, keinen programmatischen Zugang zu Host-seitigen Workflows (Gäste-Nachrichten, Buchungsanfragen, Pricing, Kalender, Reviews, Übergaben). Die einzigen Optionen heute:

1. Ein PMS bezahlen (Hostaway, Smoobu, Hospitable), das Partner-API-Zugang hat — indirekt, vorgegebene Meinung, nicht agenten-nativ.
2. Community-Scraper benutzen (openbnb/mcp-server-airbnb) — nur lesen, nur öffentliche Daten, ToS-fragil.

Keines davon hilft dem Host, der **Claude / einen persönlichen KI-Agenten** direkt in seinen Airbnb-Alltag verdrahten will.

## 2. Lösung

Ausliefern: ein **production-grade, Open-Source-MCP-Server**, der:

1. **Heute:** das macht, was rechtlich und technisch auf öffentlichen Airbnb-Daten möglich ist — Suche und Listing-Details — in einer Qualität, die bestehende Community-Server schlägt.
2. **Morgen (gemockt, voll spec'd):** die sieben Host-seitigen Workflows demonstriert, die Partner-API-Zugang brauchen. Jedes Mock-Tool hat das Schema, die Handler-Form, die Doku und die Fixture, die ein Airbnb-Engineer bräuchte, um die echte API dahinter zu verdrahten.

Das Repo ist das **Pitch-Artefakt**: funktionierender Code + designte Oberfläche + saubere Architektur, an Airbnbs Head of Host Tools / Head of Platform Engineering geschickt mit der Botschaft "wir haben es schon gebaut; öffnet die API und wir liefern".

## 3. Ziele

- `openbnb/mcp-server-airbnb` schlagen in Robustheit, Typen, Error-Handling, Observability und Doku.
- Die Demo-Tools so nah an "echt" haben, dass Airbnbs Eng-Team sie wie einen PR reviewen kann.
- In 60 Sekunden installierbar via `claude-desktop-config.json`-Snippet.
- Als Single-Binary deploybar bleiben (Docker), für Hosts, die selbst hosten wollen.
- Ein Airbnb-Legal-/Security-Review überleben (kein Scraping über öffentliche Oberflächen hinaus, keine PII-Speicherung, kein Spoofing).

## 4. Non-Goals

- Kein PMS-Ersatz.
- Kein Multi-Plattform-Aggregator (kein VRBO / Booking.com in v1).
- Kein Billing-/Payments-Tool.
- Kein gäste-zugewandtes Tool.
- Keine Marketing-Site (das machen README + Pitch-Deck).

## 5. Architektur

### 5.1 High-Level

```
KI-Agent (Claude / Claude Code / Cursor / etc.)
    │  MCP über stdio (Default) oder SSE (optional)
    ▼
Mithgard BnB MCP Server (Node 20+, TypeScript)
    │
    ├── Tool-Registry (9 Tools)
    │     ├── 2 Live-Tools  → src/parsers/airbnb-public.ts → undici + Cache + Rate-Limit
    │     └── 7 Mock-Tools  → src/mocks/*.fixture.ts (deterministisch, gelabelt _mock: true)
    │
    ├── Validierungs-Layer (zod) — jeder Input + Output validiert
    ├── Telemetrie (pino strukturiertes Log, optional OTEL-Traces)
    └── Fehler-Envelope (Result<T, McpError>)
```

### 5.2 Modul-Grenzen

| Modul | Zweck | Hängt ab von |
|---|---|---|
| `src/server.ts` | MCP-Server-Bootstrap, registriert Tools | sdk, registry |
| `src/tools/<name>/` | Ein Tool pro Ordner: schema + handler + test + doc | lib, parsers ODER mocks |
| `src/lib/http.ts` | undici-Client, Retry, 429-Handling, Jitter | undici, p-queue |
| `src/lib/cache.ts` | LRU-Cache, mit TTL, opt-in pro Tool | lru-cache |
| `src/lib/result.ts` | `Result<T, E>`-Typ — keine geworfenen Errors über Grenzen hinweg | — |
| `src/parsers/airbnb-public.ts` | HTML-/JSON-Parsing öffentlicher Airbnb-Seiten | cheerio |
| `src/mocks/<tool>.fixture.ts` | Handgemachte realistische Fixtures | — |
| `src/config/env.ts` | Env-Parsing via zod | zod |
| `src/config/logger.ts` | pino-Logger-Factory | pino |

### 5.3 Warum TypeScript statt Python

- Das offizielle MCP-SDK ist in TS am reifsten.
- Single-Binary-Distribution via `pkg` oder Docker ist einfach.
- Type-Safety auf Tool-I/O matched 1:1 mit Zod-Schemas.
- Bestehendes Mithgard-Portfolio mischt TS (Mundart, Schreibtisch) und Python (Lemma, Idea-Genome) — TS hält das hier in der Host-Tooling-Spur.

## 6. Die 9 Tools

### Live (öffentliche Daten)

#### 6.1 `airbnb_search`
- **Input:** `{ location: string; checkin?: ISO_date; checkout?: ISO_date; adults?: int; children?: int; min_price?: int; max_price?: int; currency?: ISO_4217; }`
- **Output:** `{ results: Listing[]; total_estimate: int; query: NormalizedQuery; _source: "public"; }`
- **Quelle:** Öffentliche Airbnb-Suchseite, geparst.
- **Cache:** 15 Min pro Query.
- **Rate-Limit:** 1 Req/Sek, 60 Req/Stunde, mit Jitter.

#### 6.2 `airbnb_listing_details`
- **Input:** `{ listing_id: string | number; checkin?: ISO_date; checkout?: ISO_date; }`
- **Output:** `{ listing: ListingFull; reviews_summary: ReviewsSummary; host_summary: HostSummary; _source: "public"; }`
- **Quelle:** Öffentliche Listing-Seite.
- **Cache:** 30 Min.

### Mock (Partner-API-gated)

Jedes Mock-Tool:
- Beschreibung beginnt mit `[DEMO — braucht Airbnb Partner-API]`.
- Output enthält `_mock: true` und `_pitch: "<ein-Satz-Wert-Aussage>"`.
- Fixture ist handgemacht, realistisch, deterministisch (gleicher Input → gleicher Output).

#### 6.3 `host_insights`
Auslastung, Revenue, Konkurrenz-Vergleich, Pricing-Empfehlungen pro Listing.

#### 6.4 `guest_message_assistant`
Eingehende Nachricht rein → drei Antwort-Vorschläge (kurz / freundlich / formal) + Empfehlung. Approval-Gate dokumentiert.

#### 6.5 `booking_request_triage`
Anfrage rein → Risk-Score (0–100), Auto-Accept-/Decline-Empfehlung, Begründung, "send to host"-Approval.

#### 6.6 `smart_pricing`
Listing + Datumsbereich → Tagespreise mit Begründung (Events, Wetter, Konkurrenz, historische Auslastung).

#### 6.7 `calendar_optimizer`
30-/60-/90-Tage-Kalender → Lücken erkennen, Last-Minute-Discount-Vorschläge, Min-Stay-Anpassungen.

#### 6.8 `review_responder`
Review rein → Antwort-Entwurf in Host-Voice + Sentiment-Tag + Eskalations-Flag wenn nötig.

#### 6.9 `turnover_coordinator`
Check-out + Check-in → Reinigungs-Briefing, Übergabe-Checkliste, Crew-Notification-Entwurf.

## 7. Beispiele für Datenfluss

### 7.1 Suche (live)
```
Agent → airbnb_search("Berlin", 2026-06-01, 2026-06-04, 2 Erwachsene)
     → zod validiert Input
     → Cache-Lookup (Miss)
     → p-queue holt sich Slot
     → undici GET https://www.airbnb.com/s/Berlin/homes?...
     → cheerio parst <script type="application/json"> mit Ergebnissen
     → normalisiert → Listing[]
     → Cache-Store
     → zod validiert Output
     → return { results, total_estimate, query, _source: "public" }
```

### 7.2 Guest-Message-Assistant (mock)
```
Agent → guest_message_assistant({ thread_id, last_message })
     → zod validiert Input
     → mocks/guest-message-assistant.fixture.ts (matched per Keyword in Nachricht)
     → return { suggestions: [...], recommended_index: 1, _mock: true,
                _pitch: "Schreibt Host-stimmige Antworten mit Approval-Gate" }
```

## 8. Fehler-Handling

- Alle öffentlichen Grenzen geben `Result<T, McpError>` zurück — werfen nie.
- `McpError` ist eine Tagged Union: `RateLimited | UpstreamHTTP | ParseFailed | ValidationFailed | NotImplemented`.
- HTTP 429 → Backoff + Retry bis zu 3 Mal; wenn aufgebraucht, `RateLimited` mit `retry_after_ms` zurückgeben.
- HTML-Struktur ändert sich → `ParseFailed` mit dem fehlenden Selector als WARN-Log.

## 9. Test-Strategie

- **Unit:** jeder Tool-Handler mit Input-Fixtures (vitest).
- **Integration:** Parser-Tests gegen aufgenommene HTML-Fixtures in `tests/integration/fixtures/`.
- **E2E:** Server starten, MCP-Tool-Calls über stdio schicken, Antworten asserten.
- **Contract:** zod-Schema-Snapshot — fällt CI durch, wenn ein Tool-Schema sich ohne Changeset ändert.
- **Coverage-Gate:** 80 % Lines, 80 % Branches.

## 10. Observability

- Strukturierte Logs (pino) mit `{tool, request_id, duration_ms, cache_hit, _source}`.
- Optional OTEL via `OTEL_EXPORTER_OTLP_ENDPOINT`-Env-Var.
- Ein `--debug`-Flag auf der CLI druckt Request/Response-Envelopes (sanitisiert).

## 11. Security & Compliance

- Keine Credentials nötig für Live-Tools. Werden nicht akzeptiert, selbst wenn der User welche durchreicht.
- `.env.example` dokumentiert alle Knöpfe; kein `.env` committed.
- `SECURITY.md` mit Privatem-Disclosure-Flow.
- `LICENSE` MIT (Default — vor Public Release auf Apache-2.0 umstellbar).
- `CODE_OF_CONDUCT.md` (Contributor Covenant).
- Dependabot + CodeQL standardmäßig an.

## 12. Distribution

- `npm pkg` published als `@mithgard/bnb-mcp` (privat bis Pitch raus ist).
- Docker-Image `ghcr.io/mithgard/bnb-mcp` (multi-arch, distroless).
- Ein-Zeilen-Install-Snippet für `claude_desktop_config.json` im README.

## 13. Roadmap (nach MVP)

| Phase | Trigger | Bringt |
|---|---|---|
| v0.1 | Scaffold fertig | 2 Live-Tools funktional, 7 Mock-Tools gelabelt |
| v0.2 | Erster Pitch raus | Pitch-Deck + Landing-Page |
| v0.3 | Feedback-Runde 1 | Härtung basierend auf Reviewer-Notes |
| v1.0 | Airbnb Partner-API-Zugang ODER Community-Traction | Echte Implementierungen der Mock-Tools |

## 14. Der 100–200-Prompt-Build-Katalog

Der Implementations-Plan ist keine Prosa-Checkliste. Er ist ein **Katalog aus 100–200 selbst-enthaltenen Prompts**, jeder einzeln von einem Agenten (Claude Code / Codex) ausführbar, jeder endet mit einem Commit. Katalog liegt in `docs/prompts/build-catalog.md` und wird im nächsten Schritt von der `writing-plans`-Skill generiert.

Geplante Katalog-Struktur:

| Block | Prompts | Beschreibung |
|---|---|---|
| 0. Foundation | 1–15 | git init, package.json, tsconfig, eslint, prettier, husky, vitest, CI, Docker |
| 1. Core-Libs | 16–30 | http, cache, result, errors, logger, env |
| 2. MCP-Scaffolding | 31–40 | Server-Bootstrap, Tool-Registry, Schema-Validation-Harness |
| 3. Live-Tools | 41–70 | Parser, Fixtures, Search-Tool, Listing-Details-Tool, Tests |
| 4. Mock-Tools | 71–120 | 7 Tools × ~7 Prompts (Schema, Handler, Fixture, Test, Doc) |
| 5. Observability | 121–135 | pino, OTEL, request_id, Metrics |
| 6. DX & Docs | 136–155 | README, ADRs, Tool-Docs, Examples, Claude-Desktop-Config |
| 7. Pitch-Material | 156–175 | Cold-Email, LinkedIn-DM, One-Pager, Landing v0 |
| 8. Release | 176–200 | changesets, npm-publish-Dry-Run, Docker-Build, GH-Release |

Jeder Prompt hat die Form: **Vorbedingung → Aktion → Akzeptanzkriterium → Commit-Message**.

## 15. Out-of-Scope für v1

- Multi-Sprache Host-Voice (nur Deutsch + Englisch).
- VRBO-/Booking.com-Adapter.
- Mobile-/Web-UI.
- Multi-Tenant-Modus.
- Echtzeit-Webhooks (verschoben auf Partner-API-Integration).

## 16. Risiken

| Risiko | Wahrscheinlichkeit | Mitigation |
|---|---|---|
| Airbnb ändert öffentliches HTML | Hoch | Versionierte Parser, Fixture-getriebene Tests, schneller WARN→FIX-Loop |
| Airbnb lehnt Pitch ab | Mittel | Repo steht auch alleine als Mithgard-Showcase |
| Scope-Creep in 7 Mock-Tools "lass uns das echt machen" | Hoch | Harte Regel in CLAUDE.md: Mocks bleiben Mocks bis Partner-API |
| Zeitverlust gegen Mundart / BAU-Prios | Hoch | Katalog-getriebener Bau → resumable, parkbar, kein halbfertiger Zustand |

## 17. Erfolgskriterien

Diese Spec ist "fertig", wenn:
- [ ] Nutzer hat dieses Dokument freigegeben.
- [ ] `writing-plans`-Skill hat `docs/prompts/build-catalog.md` mit 100–200 Einträgen ausgegeben.
- [ ] Erster Commit auf `main` enthält: diese Spec, CLAUDE.md, Prompt-Katalog, baseline `package.json` + `tsconfig.json`.
