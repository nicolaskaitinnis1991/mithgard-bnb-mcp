# CLAUDE.md — Mithgard BnB MCP

> **Agenten-Kontextdatei.** Jeder Claude Code / Codex / Copilot-Agent, der dieses Repo anfasst, liest zuerst diese Datei. Knapp halten, ehrlich halten, als alleinige Quelle der Wahrheit für Vision und Grenzen pflegen.

---

## 1. Vision (ein Absatz)

**Mithgard BnB MCP** ist ein Model-Context-Protocol-Server, der KI-Agenten strukturierten, host-tauglichen Zugang zu Airbnb gibt. Heute funktioniert er nur auf öffentlichen Daten (Suche, Listing-Details). Sein eigentlicher Zweck ist es, die **Referenz-Implementierung** zu sein, die Airbnb übernimmt — oder lizenziert — sobald sie eine Partner-API für KI-Agenten öffnen. Wir bauen das, weil wir selbst auf Airbnb hosten, weil wir die Lücke gemerkt haben, und weil wir lieber das fehlende Stück bauen als darauf zu warten.

## 2. Warum es das gibt

- **Für uns:** Gäste-Nachrichten, Buchungs-Triage, Pricing, Kalender-Lücken, Review-Antworten und Übergabe-Koordination auf unseren eigenen Listings automatisieren.
- **Für andere Hosts:** dieselbe Automatisierung als saubere, offene MCP-Lösung ausliefern — ohne Scraper-Hacks, ohne ToS-Grauzonen.
- **Für Airbnb:** in funktionierendem Code zeigen, wie die Oberfläche einer host-tauglichen KI-API aussehen würde. Dieses Repo ist der Pitch.

## 3. Nordstern-Kennzahl

Ein Host, der dieses MCP nutzt, spart **5–10 Stunden pro Woche** bei Gäste-Kommunikation, Pricing und Operations — ohne Persönlichkeit, Genauigkeit oder Konformität mit Airbnbs Hospitality Standards zu verlieren.

## 4. Non-Goals (was wir NIEMALS tun)

- ❌ **Kein Scraping, das Airbnb-ToS verletzt.** Nur öffentlich lesbare Endpunkte. Kein Login-Replay. Kein Session-Hijacking.
- ❌ **Kein Schreib-seitiges Spoofing.** Wenn wir keine offizielle Partner-API haben, ist das Tool **gemockt und klar gekennzeichnet** — niemals stillschweigend abgespeckt.
- ❌ **Keine PII-Speicherung.** Wir reichen durch, wir speichern keine Gäste-Daten. Lokaler Cache ist opt-in und zeitbegrenzt.
- ❌ **Keine Finanz-Aktionen.** Keine Auszahlungen, keine Erstattungen, keine Chargebacks. Bei Geld immer nur lesen.
- ❌ **Keine "KI auf Autopilot" ohne Approval-Gates.** Jede ausgehende Aktion (Nachricht, Preis-Änderung, Ablehnung) läuft standardmäßig durch einen menschlichen Freigabe-Schritt.

## 5. Architektur (eine Bildschirmseite)

```
┌──────────────────────────────────────────────────────────────┐
│                    KI-Agent (Claude / etc.)                  │
└────────────────────────┬─────────────────────────────────────┘
                         │ stdio / SSE
┌────────────────────────▼─────────────────────────────────────┐
│              Mithgard BnB MCP Server (TS)                    │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │ Tool-      │  │ Validierung     │  │ Telemetrie       │   │
│  │ Registry   │  │ (Zod-Schemas)   │  │ (pino, OTEL)     │   │
│  └──────┬─────┘  └────────┬────────┘  └─────────┬────────┘   │
│         │                 │                     │            │
│  ┌──────▼─────────────────▼─────────────────────▼────────┐   │
│  │ 9 Tools (2 live · 7 mock bis Partner-API)             │   │
│  └──────┬───────────────────────────────────┬────────────┘   │
│         │                                   │                │
│  ┌──────▼─────────┐                  ┌──────▼──────────┐     │
│  │ Öffentl. Daten │                  │ Mock-Fixtures   │     │
│  │ (Suche,Listing)│                  │ (Host-Insights, │     │
│  │ rate-limited,  │                  │  Gäste-Nachr.,  │     │
│  │ gecached       │                  │  Pricing usw.)  │     │
│  └────────────────┘                  └─────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

## 6. Die 9 Tools

| # | Tool | Status | Quelle |
|---|---|---|---|
| 1 | `airbnb_search` | ✅ Live | Öffentliche Suche |
| 2 | `airbnb_listing_details` | ✅ Live | Öffentliches Listing |
| 3 | `host_insights` | 🚧 Mock | Braucht Partner-API |
| 4 | `guest_message_assistant` | 🚧 Mock | Braucht Partner-API |
| 5 | `booking_request_triage` | 🚧 Mock | Braucht Partner-API |
| 6 | `smart_pricing` | 🚧 Mock | Braucht Partner-API |
| 7 | `calendar_optimizer` | 🚧 Mock | Braucht Partner-API |
| 8 | `review_responder` | 🚧 Mock | Braucht Partner-API |
| 9 | `turnover_coordinator` | 🚧 Mock | Braucht Partner-API |

Jedes Tool hat einen eigenen Ordner unter `src/tools/<name>/` mit: `tool.ts`, `schema.ts` (Zod), `handler.ts`, `*.test.ts`, und einer Fixture (für Mocks) oder einem Live-Adapter (für Tools mit öffentlichen Daten).

## 7. Tech-Stack (nicht verhandelbar)

- **Sprache:** TypeScript (strict, ES2022, Node 20+)
- **MCP-SDK:** `@modelcontextprotocol/sdk` (offiziell)
- **Validierung:** `zod` für jeden Tool-Input und -Output
- **HTTP:** `undici` + `p-queue` (Rate-Limit) + `lru-cache`
- **Logging:** `pino` (strukturiertes JSON)
- **Tests:** `vitest` + `msw` für HTTP-Mocking
- **Lint:** `eslint` (Flat-Config) + `prettier`
- **Hooks:** `husky` + `lint-staged` + `commitlint` (Conventional Commits)
- **CI:** GitHub Actions (Lint, Typecheck, Test, Build, CodeQL)
- **Release:** `changesets` für SemVer
- **Docker:** Multi-Stage-Build, Distroless-Runtime
- **Docs:** Markdown in `docs/`, ADRs in `docs/adr/`

## 8. Vom Mithgard-Portfolio geerbte Regeln

(Aus `~/.claude/projects/.../memory/MEMORY.md`:)

- **Von Anfang an richtig bauen.** Komplette Infrastruktur ab Tag 1 — kein "Tests/CI/Types fügen wir später hinzu".
- **99-%-Sicherheit als Default.** Verifizieren bevor behaupten; alle Annahmen doppelt prüfen.
- **Keine Mocks im Produktiv-Pfad.** Mocks leben in `src/mocks/` und werden ausschließlich von Mock-Tools explizit importiert.
- **Echte Services in Tests.** Integration > Unit, wenn möglich. Keine Mock-überall-Tests.
- **Immer Vorhandenes prüfen.** Bevor neuer Helper geschrieben wird, im Repo greppen.

## 9. Pitch-Story (das Warum hinter dem Was)

> "Wir hosten auf Airbnb. Wir nutzen Claude. Wir wollten, dass Claude unsere Gäste-Nachrichten, Buchungsanfragen, Pricing und Übergaben übernimmt — so wie er unsere E-Mails übernimmt. Wir haben gemerkt, dass Airbnb keine Host-API für Einzel-Hosts hat und keinen MCP. Also haben wir die Referenz-Implementierung gebaut: 2 funktionierende Tools auf öffentlichen Daten, 7 designte und spec'd Tools, die auf Partner-API-Zugang warten. Nehmt es. Auditiert es. Lizenziert es. Oder öffnet die API und lasst uns es richtig liefern."

Pitch-Material lebt in `docs/pitch/`:
- `airbnb-cold-email.md` — an Head of Host Tools / Head of Platform Eng
- `linkedin-dm.md` — Kurzversion
- `one-pager.md` — für Engineering-Leads

## 10. Wo die Dinge liegen

- `src/` — nur Produktiv-Code. Kein experimenteller Scratch.
- `tests/` — `unit/`, `integration/`, `e2e/`. Ein Ordner pro Test-Art.
- `docs/specs/` — Design-Specs (das ist die Quelle der Wahrheit, bevor Code geschrieben wird).
- `docs/prompts/` — der 100–200-Prompt-Build-Katalog, der den agenten-getriebenen Bau steuert.
- `docs/adr/` — Architecture Decision Records.
- `docs/tools/` — eine Anwender-Doku pro Tool.
- `docs/pitch/` — Material für Airbnb.
- `examples/` — `claude-desktop-config.json`, End-to-End-Nutzungsbeispiele.
- `scripts/` — Dev-/Build-/Publish-Helfer, kein Anwendungscode.

## 11. Workflow-Regeln für Agenten

1. **Erst die Spec lesen** (`docs/specs/2026-05-03-mithgard-bnb-mcp-design.md`).
2. **Dann den Prompt-Katalog lesen** (`docs/prompts/build-catalog.md`) — von oben nach unten arbeiten, ein Prompt nach dem anderen, nach jedem committen.
3. **Conventional Commits.** `feat(tool): add airbnb_search`, `fix(http): handle 429`, etc.
4. **Jede Tool-Änderung kommt mit Tests.** Keine Ausnahme. Coverage-Gate in CI.
5. **Keine neue Dependency** ohne ADR.
6. **Kein neues Tool** ohne: Schema, Handler, Test, Doku, Registry-Eintrag.
7. **Mocks müssen offensichtlich sein.** Jedes Mock-Tool beginnt seine Beschreibung mit `[DEMO]` und gibt im Output ein `_mock: true` Feld zurück.

## 12. Offene Fragen / noch zu treffende Entscheidungen

- [ ] Airbnb-Pitch-Empfänger: Name + E-Mail (LinkedIn zuerst?)
- [ ] Lizenz: MIT vs. Apache-2.0 (Default: MIT, bis entschieden)
- [ ] Timing für öffentliches Release: privat bleiben bis Pitch raus ist? (Default: ja)

## 13. Status

**v0.0.0 — Scaffolding.** Spec geschrieben, Repo initialisiert, 0/9 Tools implementiert. Nächstes Artefakt ist der Build-Katalog.
