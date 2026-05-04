# Session Handoff — Mithgard BnB MCP

> **Für den nächsten Agenten / das nächste Claude-Code-Fenster.**
> Diese Datei ist die Brücke zwischen Sessions. Lies sie zuerst, dann CLAUDE.md, dann den Build-Katalog.

---

## Aktueller Stand (2026-05-03 — pitch-ready)

**Repo:** `~/Desktop/16_MITHGARD-BNB-MCP` + GitHub remote `https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp` (private)
**Branch:** `main`
**Commits:** ~105
**Tags:** `foundation-complete`, `core-libs-complete`, `mcp-scaffolding-complete`, `search-tool-complete`, `listing-tool-complete`, `mock-tools-complete`, **`pitch-ready`**
**Tests:** 75 grün + 2 skipped, 35 Test-Files
**Gates:** `npm run lint`, `npm run typecheck`, `npm test` alle exit 0

### Catalog-Fortschritt

| Block | Status | Tasks |
|---|---|---|
| 0. Foundation (T1–T15) | DONE | 15/15 |
| 1. Core Libs (T16–T30) | DONE | 15/15 |
| 2. MCP Scaffolding (T31–T40) | DONE | 10/10 |
| 3a. airbnb_search (T41–T55) | DONE | 15/15 |
| 3b. airbnb_listing_details (T56–T70) | DONE | 15/15 |
| 4. 7 Mock Tools (T71–T120) | DONE | 50/50 |
| 5. Observability (T121–T130) | OPEN | 0/10 |
| 6. DX & Docs (T131–T150) | PARTIAL | ~5/20 (README + LICENSE done, tool-docs done) |
| 7. Pitch material (T151–T165) | DONE (essential 5) | 5/15 (T151–T154, T158 done; T155–T157, T159–T165 deferred) |
| 8. Release (T166–T180) | OPEN | 0/15 |
| **TOTAL** | **~95/180 ≈ 52 %** | **pitch-sendable** |

### Was seit der letzten Handoff-Aktualisierung passiert ist

- Block 2 (MCP Scaffolding) komplett: Server-Bootstrap, Tool-Registry, Index, e2e-Smoke.
- Block 3a + 3b komplett: 2 live tools auf öffentlichen Airbnb-Daten mit cheerio-Parsern und HTML-Fixtures.
- Block 4 komplett: alle 7 Mock-Tools mit Schema, Fixture, Handler, Registry-Eintrag, Tests, Docs.
- Block 7 essential (5 Files): cold-email, linkedin-dm, one-pager, value-prop-matrix, recipient-research.
- README v2 (pitch-grade public face) und LICENSE (MIT) committed.
- Tag `pitch-ready` gesetzt.
- GitHub-Remote `nicolaskaitinnis1991/mithgard-bnb-mcp` (private) verbunden, alle Commits + Tags gepusht.

---

## Pitch ist SENDABLE — nächste Schritte für den Menschen

Das Repo ist jetzt vollständig genug, um an Airbnb verschickt zu werden. Was ab hier liegt nicht mehr beim
Agenten, sondern bei Nico:

1. **Pitch-Material reviewen** in `docs/pitch/`:
   - `airbnb-cold-email.md` — Subject + 3 Absätze, Empfänger-Platzhalter ersetzen.
   - `linkedin-dm.md` — Variante A für Connection-Request (~800 chars), Variante B für Folge-DM.
   - `one-pager.md` — Single-Page, PDF-fähig (z.B. via Pandoc).
   - `value-prop-matrix.md` — Tabelle mit 9 Tools, Pain, Time-Saved, Partner-API-Field.
   - `recipient-research.md` — Such-Strings, Tracker-Tabelle, Cadence (Tag 0 / +3 / +7).
2. **Empfänger identifizieren** — `recipient-research.md` durchgehen, 3 Kandidaten mit LinkedIn-Profil
   recherchieren und in der Tracker-Tabelle eintragen (`RESEARCH` → `READY`).
3. **LinkedIn-Profile-URL in der Cold-Email-Signatur final setzen** (aktuell Platzhalter).
4. **Pre-Send-Checkliste** in `recipient-research.md` durchgehen.
5. **Senden:**
   - Tag 0: LinkedIn-DM (Variante A) an Empfänger #1.
   - Tag +3: bei Stille → Folge-DM + Cold-Email an Empfänger #2.
   - Tag +7: zweiter Touch + Cold-Email an Empfänger #3.

Das Repo bleibt privat bis nach dem ersten Versand. Nach dem ersten Versand kann (muss aber nicht) der Repo
auf public gestellt werden — empfohlen erst, wenn Block 8 (Release-Pipeline) durch ist und ein echter
v0.1.0-alpha Tag existiert.

---

## Was als Nächstes (für Agenten / nächste Sessions, falls Pitch-Response oder weiter bauen)

Priorisiert:

1. **Block 5 — Observability (T121–T130, ~1 Session)** — nice-to-have für public release. Pino-Logger
   bereits da, fehlt: Metrics, Trace-IDs end-to-end, Health-Check-Endpoint.
2. **Block 6 — DX & Docs Rest (T131–T150 ohne T138/T140 die schon done sind, ~1 Session)** — CONTRIBUTING,
   CODE_OF_CONDUCT, SECURITY.md, ADRs, etc.
3. **Block 8 — Release-Pipeline (T166–T180, ~1 Session)** — npm-publish-Workflow, Docker multi-arch,
   v0.1.0-alpha Tag, GitHub Release.
4. **Block 7 Reste (T155–T157, T159–T165)** — Competitive-Landscape, Security-FAQ, Legal-FAQ, Landing-Page,
   Demo-Video, Tweet-Thread, Follow-Up-Email. Erst nach erstem Pitch-Versand und auf Bedarf.

**Reihenfolge-Empfehlung wenn weitergebaut wird ohne Pitch-Trigger:** 5 → 8 → 6 → 7-Rest.
**Reihenfolge wenn Airbnb antwortet und Demo-Termin steht:** 6 (Security/Legal-FAQ) → 8 (echter Release) →
7-Rest (Landing + Video für Public-Launch).

---

## Wichtige Abweichungen vom Catalog (must-know für künftige Tasks)

Diese Patches sind bereits committed. Nicht "fixen" oder zurückrollen — sie sind notwendig.

### 1. ESLint-Konfiguration (Commits `4debf27` + `0262088` + `675f67d`)

`eslint.config.js` weicht vom T5-Catalog-Snippet ab:

- `@eslint/js` ist explizit in `devDependencies` (Catalog T1 hatte's vergessen).
- Block für `**/*.js` mit `tseslint.configs.disableTypeChecked` — sonst projectService-Fehler auf `eslint.config.js` selbst.
- Rule `@typescript-eslint/consistent-type-definitions` ist `'off'` — sonst kollidiert es mit `type Result<T,E> = ...` Tagged Unions.

### 2. tsconfig (Commit `2a0e54e`)

`rootDir: "src"` lebt **nur** in `tsconfig.build.json`, **nicht** in `tsconfig.json`. Sonst kracht `tsc --noEmit` an root-level `*.config.ts` Files (T6059).

### 3. vitest (Commit `4179e19`)

`vitest.config.ts` hat `passWithNoTests: true`. Catalog hatte's nicht, aber vitest 2.x exit-codet sonst 1 wenn keine Tests gefunden — bricht CI in T12.

### 4. T18 errors.ts: conditional spread

Wegen `exactOptionalPropertyTypes: true` müssen Constructors für optionale Felder konditional spreaden:

```ts
export const upstreamHTTP = (status, url, body?: string): McpError =>
  body === undefined
    ? { kind: 'UpstreamHTTP', status, url }
    : { kind: 'UpstreamHTTP', status, url, body };
```

Catalog-Form `{ kind, status, url, body }` mit `body: undefined` würde nicht typechecken. Gleiches Pattern für jeden zukünftigen Catalog-Code mit optionalen Object-Fields anwenden.

### 5. T18 formatError: String() um Numbers

`@typescript-eslint/restrict-template-expressions` aus `strictTypeChecked` lehnt `${num}` in Template-Literals ab. Wrappe nummerische Interpolationen mit `String(...)`:

```ts
case 'RateLimited': return `Rate limited by ${e.source}, retry in ${String(e.retry_after_ms)}ms`;
case 'UpstreamHTTP': return `HTTP ${String(e.status)} from ${e.url}`;
```

Output ist byte-identisch, Tests bleiben grün.

### 6. T25 Cache-Test: real timers für TTL-Test

`lru-cache` cached die `performance`-Reference at module-import time. `vi.useFakeTimers()` patched `globalThis.performance` aber nicht das captured Reference. Daher: für den TTL-Expiry-Test echte Timer + kurze TTL (10ms + 25ms wait) statt Fake-Timer. Andere Cache-Tests (set/get, LRU eviction) laufen weiter mit Fake-Timer.

### 7. T27 HTTP-Test: undici MockAgent statt msw

msw 2.x patched `globalThis.fetch` und `node:http`'s `ClientRequest`, aber **nicht** `undici.request` (was `src/lib/http.ts` per Catalog T26 nutzt). Daher: Test verwendet `MockAgent` + `setGlobalDispatcher` aus undici.

### 8. Husky v9 Deprecation

Husky v9 prints Deprecation-Warnings bei jedem Commit über die shebang-Lines in `.husky/pre-commit` und `.husky/commit-msg`. Wird mit Husky v10 brechen — Dependabot wird's surface, dann fixen.

### 9. Milestones brauchen HUSKY=0

Commits mit Type `milestone:` sind nicht in commitlints conventional-types-Liste. Daher: Milestone-Commits mit `HUSKY=0 git commit --allow-empty -m "..."` machen. Alle Block-Abschluss-Tags folgen diesem Pattern.

---

## Pitch-Strategie-Notizen (vom User)

- Repo bleibt privat bis Pitch versendet ist. (Aktuell: noch privat.)
- Empfänger: Head of Host Tools / Head of Platform Engineering / Head of Applied AI bei Airbnb.
- LinkedIn-DM bevorzugt vor Cold-Email. Cold-Email als Fallback / parallele Schiene.
- User hostet selbst auf Airbnb (Superhost) → authentische Story.
- Domain `mithgard.ai` ist gekauft (für Landing-Page in T159+, optional, nicht für ersten Pitch nötig).
- User-E-Mail: `nicolaskaitinnis1991@gmail.com`.
- LinkedIn-URL des Users in `airbnb-cold-email.md` Signatur ist Platzhalter — vor Versand final setzen.
