# Session Handoff — Mithgard BnB MCP

> **Für den nächsten Agenten / das nächste Claude-Code-Fenster.**
> Diese Datei ist die Brücke zwischen Sessions. Lies sie zuerst, dann CLAUDE.md, dann den Build-Katalog.

---

## Aktueller Stand (2026-05-03)

**Repo:** `~/Desktop/16_MITHGARD-BNB-MCP` (privat, lokal, GitHub Desktop noch nicht verbunden)
**Branch:** `main`
**Commits:** 39
**Tags:** `foundation-complete`, `core-libs-complete`
**Tests:** 21 grün, 7 Test-Files
**Gates:** `npm run lint`, `npm run typecheck`, `npm test` alle exit 0

### Catalog-Fortschritt

| Block | Status | Tasks | Commits |
|---|---|---|---|
| 0. Foundation (T1–T15) | ✅ DONE | 15/15 | 17 (15 + 2 catalog-Fixes) |
| 1. Core Libs (T16–T30) | ✅ DONE | 15/15 | 18 (15 + 1 ESLint-Fix + 2 Milestones) |
| **2. MCP Scaffolding (T31–T40)** | ⏸ NEXT | 0/10 | — |
| 3a. airbnb_search (T41–T55) | ⏸ | 0/15 | — |
| 3b. airbnb_listing_details (T56–T70) | ⏸ | 0/15 | — |
| 4. 7 Mock Tools (T71–T120) | ⏸ | 0/50 | — |
| 5. Observability (T121–T130) | ⏸ | 0/10 | — |
| 6. DX & Docs (T131–T150) | ⏸ | 0/20 | — |
| 7. Pitch material (T151–T165) | ⏸ | 0/15 | — |
| 8. Release (T166–T180) | ⏸ | 0/15 | — |
| **TOTAL** | **17 %** | **30/180** | — |

---

## Was beim nächsten Agent JETZT zu tun ist

1. **Lies in dieser Reihenfolge:**
   - `docs/HANDOFF.md` (diese Datei)
   - `CLAUDE.md` (Vision + Workflow-Regeln)
   - `docs/specs/2026-05-03-mithgard-bnb-mcp-design.md` (Architektur-Wahrheit)
   - `docs/prompts/build-catalog.md`, suche `# Block 2` (~Zeile 1100+)

2. **Verifizier den Stand:**
   ```bash
   cd ~/Desktop/16_MITHGARD-BNB-MCP
   git log --oneline | head -10
   git tag        # erwartet: foundation-complete, core-libs-complete
   npm run lint   # erwartet: exit 0
   npm run typecheck   # erwartet: exit 0
   npm test       # erwartet: 21 passed
   ```

3. **Setup für die Subagenten-Kette:**
   - Skill: `superpowers:subagent-driven-development`
   - Per Task: Implementer → Spec-Reviewer → (für Logik-Code) Code-Quality-Reviewer
   - Für reine Config-Tasks (YAML, JSON, .env) reicht Implementer + Spec-Reviewer
   - Für TDD-Code (jeder Task in Block 1+) sollten alle drei Stufen laufen

4. **Beginne mit Block 2 — T31–T40.**
   Empfohlener Batch: **T31–T35** (Server-Bootstrap + Tool-Registry + Index + e2e-Test) in einem Implementer-Run, dann **T36–T40** (e2e-Smoke + Examples + Scripts + Milestone).

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

**Follow-up Idee (nicht jetzt machen):** `cache.ts` könnte injizierbare Time-Source nehmen — dann wären alle Tests fake-timer-fähig. Würde aber von Catalog abweichen. Zurückstellen.

### 7. T27 HTTP-Test: undici MockAgent statt msw

msw 2.x patched `globalThis.fetch` und `node:http`'s `ClientRequest`, aber **nicht** `undici.request` (was `src/lib/http.ts` per Catalog T26 nutzt). Daher: Test verwendet `MockAgent` + `setGlobalDispatcher` aus undici. Commit-Message bleibt aber `test(lib): cover http client with msw` per Catalog. Funktional äquivalent (gleiche zwei Assertions: 200 returns body, 500 surfaces err).

**Follow-up Idee:** entweder T26 von `undici.request` auf `globalThis.fetch` umstellen (dann msw funktioniert), oder Catalog auf MockAgent updaten. Zurückstellen.

### 8. Husky v9 Deprecation

Husky v9 prints Deprecation-Warnings bei jedem Commit über die shebang-Lines in `.husky/pre-commit` und `.husky/commit-msg`. Catalog gibt diese Lines exakt vor. Wird mit Husky v10 brechen — Dependabot wird's surface, dann fixen.

### 9. Milestones brauchen HUSKY=0

Commits mit Type `milestone:` (z.B. `milestone: Block 0 Foundation complete`) sind nicht in commitlints conventional-types-Liste. Daher: Milestone-Commits mit `HUSKY=0 git commit --allow-empty -m "..."` machen. Alle Block-Abschluss-Tags folgen diesem Pattern.

---

## Aktuelle Datei-Struktur

```
~/Desktop/16_MITHGARD-BNB-MCP/
├── CLAUDE.md
├── README.md
├── LICENSE                          ← noch nicht da (T140)
├── Dockerfile + .dockerignore       ✓
├── package.json + package-lock.json ✓
├── tsconfig.json + tsconfig.build.json ✓
├── eslint.config.js, prettier.config.js, vitest.config.ts ✓
├── commitlint.config.js             ✓
├── .nvmrc, .editorconfig, .env.example, .gitignore ✓
├── .husky/{pre-commit, commit-msg}  ✓
├── .github/workflows/{ci.yml, codeql.yml} + dependabot.yml ✓
├── docs/
│   ├── HANDOFF.md                   ← du liest sie gerade
│   ├── specs/2026-05-03-...md       ✓
│   └── prompts/build-catalog.md     ✓
├── src/
│   ├── index.ts                     ✓ PLACEHOLDER (replaced by T35)
│   ├── config/{env.ts, logger.ts}   ✓
│   ├── lib/{result, errors, cache, http, request-id}.ts ✓
│   └── types/airbnb.ts              ✓
├── tests/unit/                       ✓ 7 test files, 21 tests
├── (leer) tests/integration/, tests/e2e/
├── (leer) src/server.ts, src/parsers/, src/tools/, src/mocks/
└── (leer) examples/, scripts/
```

---

## Kontext-Status der Vorsession

- Subagent-Driven-Development funktioniert gut
- Pragmatik-Anpassung: Block 0 reine Config-Tasks → nur 1-stage Spec-Review
- Block 1 TDD-Tasks → strikt 2-stage Review (Spec + Code Quality)
- Implementer hat 3× korrekt BLOCKED bei strict-mode-Konflikten — alle gelöst durch surgical Catalog-Patches (siehe Abweichungen oben)

## Empfohlener Workflow für nächste Session

1. **Schritt 1:** Skill `superpowers:subagent-driven-development` aufrufen
2. **Schritt 2:** TodoWrite anlegen mit 8 verbleibenden Blöcken
3. **Schritt 3:** Implementer für T31–T35 dispatchen (Server-Bootstrap, Tool-Registry, etc.)
4. **Schritt 4:** Spec-Review + Code-Quality-Review wie gehabt
5. **Schritt 5:** T36–T40 (e2e-Smoke, Examples, Scripts) als zweiten Batch
6. **Schritt 6:** Tag `mcp-scaffolding-complete` → empty milestone-Commit (mit HUSKY=0)

Block 2 ist überschaubar (10 Tasks, alles MCP-spezifisches Bootstrap-Code, keine echten Parser oder HTTP-Calls). Sollte in 1 Session laufen.

## Verbleibende große Brocken (für Planung)

- **Block 3a + 3b (T41–T70):** echte HTTP-Calls + cheerio-Parser + e2e-Tests gegen captured HTML-Fixtures. Riskanter weil Airbnb-HTML-Struktur sich ändert. ~2 Sessions.
- **Block 4 (T71–T120):** 7 Mock-Tools × 7 Sub-Tasks. Template-driven, repetitiv aber viel. ~2-3 Sessions.
- **Block 5–8 (T121–T180):** Observability, Docs, Pitch, Release. Moderate Komplexität. ~2 Sessions.

**Gesamtschätzung:** Aktuell 17 % done. Volle 180 Tasks brauchen geschätzt **6-8 weitere Sessions**.

## Pitch-Strategie-Notizen (vom User)

- Repo bleibt privat bis Pitch versendet ist.
- Empfänger: Head of Host Tools / Head of Platform Engineering bei Airbnb.
- LinkedIn-DM bevorzugt vor Cold-Email.
- User hostet selbst auf Airbnb → authentische Story.
- Domain `mithgard.ai` ist gekauft (für Landing-Page in T159+).
- User-E-Mail: `nicolaskaitinnis1991@gmail.com`.
