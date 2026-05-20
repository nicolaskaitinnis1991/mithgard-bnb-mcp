# Security FAQ

> Pre-emptive answers for a security or platform-trust reviewer at Airbnb (or any reader who
> reasonably wants to know what this tool does to their systems and data before they recommend
> opening Partner-API access).

For deeper detail see [`SECURITY.md`](../../SECURITY.md), [`docs/architecture.md`](../architecture.md),
[`docs/limitations.md`](../limitations.md), and [`docs/adr/0005-rate-limit-policy.md`](../adr/0005-rate-limit-policy.md).

---

## 1. Do you scrape Airbnb?

We fetch **public Airbnb pages only** — the same URLs a logged-out browser sees. No login flow, no
session cookies, no captcha bypassing, no headless-browser automation. Requests are issued via
`undici` with a conservative rate limit (see Q3) and a self-identifying User-Agent of the form
`mithgard-bnb-mcp/<version> (+https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp)`. If Airbnb's
public pages change shape, our parsers fail loudly rather than silently degrading.

See [`docs/adr/0005-rate-limit-policy.md`](../adr/0005-rate-limit-policy.md) and
[`docs/limitations.md`](../limitations.md).

---

## 2. Do you store PII?

No persistent storage of any kind. The MCP server is stateless between requests; the LRU cache is
in-memory and bounded. The only "logs" are structured stderr emissions via `pino`, which are
**redacted at the sink** — guest names, emails, phone numbers, and host identifiers are stripped
before they leave the process. No database, no disk writes, no cookies, no analytics endpoints by
default.

See the redaction list in [`SECURITY.md`](../../SECURITY.md) and the redactor implementation in
`src/lib/redact.ts`.

---

## 3. What's your rate-limit posture?

**1 request per second, 60 requests per hour**, per upstream host, with random jitter in the
backoff. On HTTP 429 (rate-limited by Airbnb) the client backs off exponentially and surfaces
the rate-limit error to the MCP client — it never silently retries past the cap. The values are
configurable via env var but the defaults are deliberately polite.

See [`docs/adr/0005-rate-limit-policy.md`](../adr/0005-rate-limit-policy.md) for the rationale and
[`tests/integration/ratelimit.test.ts`](../../tests/integration/ratelimit.test.ts) for the
behavioural test.

---

## 4. Do you bypass captcha?

**No.** If Airbnb serves a captcha or interstitial challenge, the parser fails (we look for the
embedded structured JSON; if it isn't there, we return a `ParseFailed` error to the MCP client).
There is no headless browser, no captcha-solving service integration, no human-in-the-loop
workaround. A captcha is a stop signal and we treat it as such.

---

## 5. What about Terms of Service?

The two live tools (`airbnb_search`, `airbnb_listing_details`) read public Airbnb pages — the same
URLs anyone with a browser can hit while logged out. No login. No session re-use. No PII storage.
Conservative rate limiting. Self-identifying User-Agent (Airbnb's infra can block us by UA whenever
they want). The seven mock tools don't touch Airbnb at all; they return fixture-shaped responses
with `_mock: true`. This project is designed to survive a legal review at Airbnb, not to skirt
one. If Airbnb requests changes or asks us to stop, we will.

See "What this is NOT" in the [README](../../README.md#honesty-section--what-this-is-not) and
[`docs/limitations.md`](../limitations.md).

---

## 6. Do you handle a login or impersonate a host?

**No.** There is no login flow anywhere in the codebase. Grep for it:

```bash
$ grep -ri 'login\|password\|cookie\|session\|csrf\|oauth' src/ | grep -v '\.test\.'
# (zero hits in handler / client paths)
```

The 7 demo tools that *would* need write access to a host account (sending messages, accepting
reservations, updating prices) are mocks that return fixture data with `_mock: true` and a `_pitch`
field naming the Partner-API endpoint a real implementation would call. They are not skeletons
waiting for credentials — they are documentation of the schema a real implementation would need.

---

## 7. Is data shared with third parties?

**No.** The MCP server is local-only by default. It runs on the user's machine over stdio, talks
to Airbnb's public pages, and returns results to the user's MCP client. No analytics endpoint, no
telemetry beacon, no crash reporter — none of it. Logs go to stderr on the user's machine.

The single opt-in exception is the `OTEL_EXPORTER_OTLP_ENDPOINT` env var, which is honored only if
the user explicitly sets it. If unset (the default), no OTEL data leaves the process. See
[`docs/adr/0007-otel-defer.md`](../adr/0007-otel-defer.md).

---

## 8. What's your supply-chain posture?

- **Dependabot** is active on `package.json` and GitHub Actions. Weekly checks, auto-PRs on patch
  and minor bumps.
- **CodeQL** is configured in `.github/workflows/codeql.yml`. It runs on every push to `main` and
  on a weekly schedule. It will flip from "internal-only" to "public" the moment the repo goes
  public, which is the v0.1.0-alpha.1 cutover plan.
- **Distroless Docker base** (`gcr.io/distroless/nodejs20-debian12`) — no shell, no apt, no
  package manager in the production image. Minimal CVE surface.
- **All dependencies locked** via `package-lock.json` committed to the repo; CI runs `npm ci`
  (no `npm install`), so the lockfile is the source of truth.
- **No postinstall scripts** in our own `package.json`.
- **CI gates** lint + typecheck + test + build on every PR; nothing merges without 4-green.

A current `npm audit --production` finding (4 transitive devDep vulns in `hono`, `ip-address`,
`express-rate-limit` — none in runtime path) is tracked in Dispatch 11 of the production-gap plan.
