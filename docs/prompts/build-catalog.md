# Mithgard BnB MCP — Build-Katalog (Implementations-Plan)

> **Für agentenbasierte Worker:** ERFORDERLICHE SUB-SKILL: Nutze `superpowers:subagent-driven-development` (empfohlen) oder `superpowers:executing-plans`, um diesen Plan Task für Task zu implementieren. Schritte verwenden Checkbox-Syntax (`- [ ]`) zum Tracking.

**Goal:** Liefere einen production-grade MCP-Server für Airbnb mit 2 Live-Tools auf öffentlichen Daten und 7 Mock-Tools, die die Partner-API-Vision demonstrieren — als Pitch-Artefakt für Airbnb und als nutzbares Tool für Mithgard-Hosts.

**Architecture:** TypeScript-MCP-Server (Node 20+, official `@modelcontextprotocol/sdk`), strikt getypt mit Zod-Schemas, `Result<T, McpError>` als Fehler-Envelope, undici + p-queue + lru-cache als HTTP-Layer, vitest + msw für Tests, pino für strukturiertes Logging.

**Tech Stack:** TypeScript (strict, ES2022), `@modelcontextprotocol/sdk`, `zod`, `undici`, `p-queue`, `lru-cache`, `cheerio`, `pino`, `vitest`, `msw`, ESLint Flat-Config, Prettier, Husky, Conventional Commits, GitHub Actions, Docker (distroless).

**Total Tasks:** 135, organisiert in 9 Blöcken (0–8).

---

## Datei-Struktur (Single Source of Truth)

```
16_MITHGARD-BNB-MCP/
├── CLAUDE.md                            ✓ existiert
├── README.md                            ✓ existiert (wird in T136 final)
├── LICENSE                              T140
├── CHANGELOG.md                         T141
├── CONTRIBUTING.md                      T137
├── CODE_OF_CONDUCT.md                   T138
├── SECURITY.md                          T139
├── package.json                         T1
├── package-lock.json                    auto
├── tsconfig.json                        T2
├── tsconfig.build.json                  T3
├── eslint.config.js                     T5
├── prettier.config.js                   T6
├── .prettierignore                      T6
├── vitest.config.ts                     T7
├── .nvmrc                               T4
├── .editorconfig                        T4
├── .env.example                         T8
├── .gitignore                           ✓ existiert
├── Dockerfile                           T15
├── .dockerignore                        T15
├── .husky/
│   ├── pre-commit                       T9
│   └── commit-msg                       T11
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                       T12
│   │   ├── codeql.yml                   T13
│   │   └── release.yml                  T182
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug.yml                      T151
│   │   └── feature.yml                  T152
│   ├── PULL_REQUEST_TEMPLATE.md         T153
│   └── dependabot.yml                   T14
├── src/
│   ├── index.ts                         T35   (entry + stdio)
│   ├── server.ts                        T31   (MCP bootstrap)
│   ├── config/
│   │   ├── env.ts                       T20
│   │   └── logger.ts                    T22
│   ├── lib/
│   │   ├── result.ts                    T16
│   │   ├── errors.ts                    T18
│   │   ├── cache.ts                     T24
│   │   ├── http.ts                      T26
│   │   ├── request-id.ts                T28
│   │   └── telemetry.ts                 T121
│   ├── parsers/
│   │   └── airbnb-public.ts             T41,T44,T58
│   ├── tools/
│   │   ├── index.ts                     T34
│   │   ├── registry.ts                  T32
│   │   ├── search/                      T45-T54
│   │   ├── listing-details/             T59-T68
│   │   ├── host-insights/               T71-T77   (mock)
│   │   ├── guest-message-assistant/     T78-T84   (mock)
│   │   ├── booking-request-triage/      T85-T91   (mock)
│   │   ├── smart-pricing/               T92-T98   (mock)
│   │   ├── calendar-optimizer/          T99-T105  (mock)
│   │   ├── review-responder/            T106-T112 (mock)
│   │   └── turnover-coordinator/        T113-T119 (mock)
│   ├── mocks/                           T71+
│   └── types/
│       └── airbnb.ts                    T30
├── tests/
│   ├── unit/                            (per task)
│   ├── integration/
│   │   └── fixtures/                    T42, T56
│   └── e2e/                             T36, T53, T67
├── docs/
│   ├── specs/                           ✓ existiert
│   ├── prompts/build-catalog.md         (dieses Dokument)
│   ├── adr/                             T142-T146
│   ├── tools/                           T52, T66, T77+
│   ├── pitch/                           T156-T175
│   ├── architecture.md                  T147
│   └── deploy.md                        T148
├── examples/
│   ├── claude-desktop-config.json       T37
│   ├── usage.md                         T149
│   └── agent-conversation.md            T150
└── scripts/
    ├── dev.sh                           T38
    ├── build.sh                         T39
    └── publish-dry-run.sh               T178
```

---

# Block 0 — Foundation (T1–T15)

**Ziel:** Komplette Tool-Chain bevor irgendeine Zeile Anwendungs-Code geschrieben wird. Wer hier abkürzt, zahlt es 10×-fach in Block 4.

---

### T1: package.json mit allen Dependencies

**Files:** Create `package.json`

- [ ] **Schritt 1:** Datei schreiben

```json
{
  "name": "@mithgard/bnb-mcp",
  "version": "0.0.0",
  "private": true,
  "description": "Production-grade MCP server for Airbnb hosts. 2 live tools on public data, 7 demo tools showcasing Partner-API-grade host workflows.",
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "main": "dist/index.js",
  "bin": { "mithgard-bnb-mcp": "dist/index.js" },
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "prepare": "husky"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "cheerio": "^1.0.0",
    "lru-cache": "^11.0.0",
    "p-queue": "^8.0.0",
    "pino": "^9.0.0",
    "undici": "^6.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0",
    "@types/node": "^20.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "eslint": "^9.0.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "msw": "^2.0.0",
    "prettier": "^3.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.5.0",
    "typescript-eslint": "^8.0.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Schritt 2:** Run `npm install`
- [ ] **Schritt 3:** Verify: `node --version` ≥ 20, `cat package.json | head -5` zeigt Inhalt
- [ ] **Schritt 4:** Commit
  ```bash
  git add package.json package-lock.json
  git commit -m "chore: add package.json with full toolchain dependencies"
  ```

---

### T2: tsconfig.json (strict)

**Files:** Create `tsconfig.json`

- [ ] **Schritt 1:** Datei schreiben

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "inlineSources": true,
    "removeComments": false
  },
  "include": ["src/**/*", "tests/**/*", "*.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Schritt 2:** Run `npm run typecheck`
- [ ] **Schritt 3:** Expected: kein Error (oder nur "no input files")
- [ ] **Schritt 4:** Commit: `chore: add strict tsconfig`

---

### T3: tsconfig.build.json

**Files:** Create `tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "tests/**"]
}
```

- [ ] Run `npm run build` → `dist/` (leer ist OK in diesem Stadium)
- [ ] Commit: `chore: add build tsconfig that excludes tests`

---

### T4: .nvmrc + .editorconfig

**Files:** Create `.nvmrc`, `.editorconfig`

`.nvmrc`:
```
20
```

`.editorconfig`:
```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] Commit: `chore: pin node version and editorconfig`

---

### T5: ESLint Flat-Config

**Files:** Create `eslint.config.js`

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
);
```

- [ ] Run `npm run lint`
- [ ] Expected: 0 errors (no source code yet)
- [ ] Commit: `chore: add eslint flat config with strict TS rules`

---

### T6: Prettier

**Files:** Create `prettier.config.js`, `.prettierignore`

`prettier.config.js`:
```js
export default {
  printWidth: 100,
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  arrowParens: 'always',
};
```

`.prettierignore`:
```
node_modules/
dist/
coverage/
*.md
```

- [ ] Run `npm run format`
- [ ] Commit: `chore: add prettier config`

---

### T7: vitest.config.ts

**Files:** Create `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/types/**'],
    },
  },
});
```

- [ ] Run `npm test`
- [ ] Expected: "No test files found" (OK)
- [ ] Commit: `chore: add vitest config with 80% coverage gate`

---

### T8: .env.example

**Files:** Create `.env.example`

```
# Logging
LOG_LEVEL=info
# Optional OTEL
# OTEL_EXPORTER_OTLP_ENDPOINT=
# Cache (optional override)
CACHE_TTL_SEARCH_MS=900000
CACHE_TTL_LISTING_MS=1800000
# Rate-Limit
HTTP_RATE_PER_SEC=1
HTTP_RATE_PER_HOUR=60
```

- [ ] Commit: `chore: document env vars in .env.example`

---

### T9: Husky pre-commit

**Files:** Create `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run typecheck
```

- [ ] Run `chmod +x .husky/pre-commit`
- [ ] Run `npx husky` (initialisiert)
- [ ] Commit: `chore: add husky pre-commit hook`

---

### T10: lint-staged

**Files:** Modify `package.json` (root level)

```json
"lint-staged": {
  "*.{ts,js}": ["eslint --fix", "prettier --write"],
  "*.{md,json,yml}": ["prettier --write"]
}
```

- [ ] Test: ändere eine Datei, stage sie, run `npx lint-staged`
- [ ] Commit: `chore: configure lint-staged`

---

### T11: commitlint + commit-msg hook

**Files:** Create `commitlint.config.js`, `.husky/commit-msg`

`commitlint.config.js`:
```js
export default { extends: ['@commitlint/config-conventional'] };
```

`.husky/commit-msg`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx --no -- commitlint --edit "$1"
```

- [ ] `chmod +x .husky/commit-msg`
- [ ] Test: `git commit -m "wrong format"` schlägt fehl
- [ ] Test: `git commit -m "chore: add commitlint"` funktioniert
- [ ] Commit: `chore: enforce conventional commits via commitlint`

---

### T12: GitHub Actions CI

**Files:** Create `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:cov
      - uses: codecov/codecov-action@v4
        with: { files: ./coverage/lcov.info }
```

- [ ] Commit: `ci: add lint+typecheck+test workflow`

---

### T13: CodeQL

**Files:** Create `.github/workflows/codeql.yml`

```yaml
name: CodeQL
on:
  push: { branches: [main] }
  schedule: [{ cron: '0 4 * * 1' }]
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions: { security-events: write, contents: read }
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: javascript-typescript }
      - uses: github/codeql-action/analyze@v3
```

- [ ] Commit: `ci: add CodeQL security scanning`

---

### T14: Dependabot

**Files:** Create `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    open-pull-requests-limit: 5
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: monthly }
```

- [ ] Commit: `ci: add dependabot for npm + actions`

---

### T15: Dockerfile (distroless multi-stage)

**Files:** Create `Dockerfile`, `.dockerignore`

`Dockerfile`:
```dockerfile
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm ci
COPY src ./src
RUN npm run build && npm prune --production

FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
USER nonroot
ENTRYPOINT ["/nodejs/bin/node", "dist/index.js"]
```

`.dockerignore`:
```
node_modules
dist
coverage
.git
.github
tests
docs
*.md
```

- [ ] Run `docker build -t mithgard-bnb-mcp:dev .`  (sanity, kein Push)
- [ ] Commit: `chore: add multi-stage distroless Dockerfile`

---

# Block 1 — Core Libraries (T16–T30)

**Ziel:** Wiederverwendbare Bausteine, die jedes Tool nutzt: Result, Errors, Env, Logger, Cache, HTTP, Request-ID, Types. Streng TDD: erst Test, dann Implementierung.

---

### T16: src/lib/result.ts (Result-Typ)

**Files:** Create `src/lib/result.ts`

```ts
export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.ok;

export const map = <T, U, E>(r: Result<T, E>, f: (v: T) => U): Result<U, E> =>
  r.ok ? ok(f(r.value)) : r;

export const mapErr = <T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F> =>
  r.ok ? r : err(f(r.error));
```

- [ ] Commit: `feat(lib): add Result<T,E> type with ok/err/map helpers`

---

### T17: tests/unit/result.test.ts

**Files:** Create `tests/unit/result.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, map, mapErr } from '../../src/lib/result.js';

describe('Result', () => {
  it('ok creates a successful result', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
    expect(isOk(ok(42))).toBe(true);
  });
  it('err creates a failed result', () => {
    expect(err('boom')).toEqual({ ok: false, error: 'boom' });
    expect(isErr(err('boom'))).toBe(true);
  });
  it('map transforms ok value', () => {
    expect(map(ok(2), (x) => x * 2)).toEqual(ok(4));
  });
  it('map preserves err', () => {
    expect(map(err('x'), (n: number) => n * 2)).toEqual(err('x'));
  });
  it('mapErr transforms error', () => {
    expect(mapErr(err('a'), (e) => e + '!')).toEqual(err('a!'));
  });
});
```

- [ ] Run `npm test`
- [ ] Expected: 5 passed
- [ ] Commit: `test(lib): cover Result helpers`

---

### T18: src/lib/errors.ts (McpError tagged union)

**Files:** Create `src/lib/errors.ts`

```ts
export type McpError =
  | { kind: 'RateLimited'; retry_after_ms: number; source: string }
  | { kind: 'UpstreamHTTP'; status: number; url: string; body?: string }
  | { kind: 'ParseFailed'; selector: string; url: string; cause?: string }
  | { kind: 'ValidationFailed'; field: string; message: string }
  | { kind: 'NotImplemented'; tool: string; reason: string };

export const rateLimited = (retry_after_ms: number, source: string): McpError =>
  ({ kind: 'RateLimited', retry_after_ms, source });
export const upstreamHTTP = (status: number, url: string, body?: string): McpError =>
  ({ kind: 'UpstreamHTTP', status, url, body });
export const parseFailed = (selector: string, url: string, cause?: string): McpError =>
  ({ kind: 'ParseFailed', selector, url, cause });
export const validationFailed = (field: string, message: string): McpError =>
  ({ kind: 'ValidationFailed', field, message });
export const notImplemented = (tool: string, reason: string): McpError =>
  ({ kind: 'NotImplemented', tool, reason });

export const formatError = (e: McpError): string => {
  switch (e.kind) {
    case 'RateLimited': return `Rate limited by ${e.source}, retry in ${e.retry_after_ms}ms`;
    case 'UpstreamHTTP': return `HTTP ${e.status} from ${e.url}`;
    case 'ParseFailed': return `Parse failed at ${e.selector} on ${e.url}${e.cause ? `: ${e.cause}` : ''}`;
    case 'ValidationFailed': return `Validation failed on ${e.field}: ${e.message}`;
    case 'NotImplemented': return `Tool ${e.tool} not implemented: ${e.reason}`;
  }
};
```

- [ ] Commit: `feat(lib): add McpError tagged union with constructors and formatter`

---

### T19: tests/unit/errors.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { rateLimited, upstreamHTTP, parseFailed, validationFailed, notImplemented, formatError } from '../../src/lib/errors.js';

describe('McpError', () => {
  it.each([
    [rateLimited(1000, 'airbnb.com'), 'Rate limited by airbnb.com, retry in 1000ms'],
    [upstreamHTTP(500, 'https://x'), 'HTTP 500 from https://x'],
    [parseFailed('.title', 'https://x'), 'Parse failed at .title on https://x'],
    [validationFailed('location', 'required'), 'Validation failed on location: required'],
    [notImplemented('foo', 'mock only'), 'Tool foo not implemented: mock only'],
  ])('formats %j', (e, expected) => {
    expect(formatError(e)).toBe(expected);
  });
});
```

- [ ] Run, expect 5 passed
- [ ] Commit: `test(lib): cover error formatter`

---

### T20: src/config/env.ts

**Files:** Create `src/config/env.ts`

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  CACHE_TTL_SEARCH_MS: z.coerce.number().int().positive().default(900_000),
  CACHE_TTL_LISTING_MS: z.coerce.number().int().positive().default(1_800_000),
  HTTP_RATE_PER_SEC: z.coerce.number().int().positive().default(1),
  HTTP_RATE_PER_HOUR: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof EnvSchema>;
export const loadEnv = (raw: NodeJS.ProcessEnv = process.env): Env => EnvSchema.parse(raw);
```

- [ ] Commit: `feat(config): add zod-validated env loader`

---

### T21: tests/unit/env.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

describe('loadEnv', () => {
  it('uses defaults for missing vars', () => {
    const e = loadEnv({});
    expect(e.LOG_LEVEL).toBe('info');
    expect(e.CACHE_TTL_SEARCH_MS).toBe(900_000);
  });
  it('coerces numeric strings', () => {
    const e = loadEnv({ HTTP_RATE_PER_SEC: '5' });
    expect(e.HTTP_RATE_PER_SEC).toBe(5);
  });
  it('rejects invalid LOG_LEVEL', () => {
    expect(() => loadEnv({ LOG_LEVEL: 'banana' })).toThrow();
  });
});
```

- [ ] Run, expect 3 passed
- [ ] Commit: `test(config): cover env loader defaults and validation`

---

### T22: src/config/logger.ts

**Files:** Create `src/config/logger.ts`

```ts
import pino, { type Logger } from 'pino';
import type { Env } from './env.js';

export const createLogger = (env: Env): Logger =>
  pino({
    level: env.LOG_LEVEL,
    base: { service: 'mithgard-bnb-mcp' },
    redact: {
      paths: ['*.email', '*.phone', '*.guest_name', '*.message_text'],
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
```

- [ ] Commit: `feat(config): add pino logger factory with PII redaction`

---

### T23: tests/unit/logger.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { createLogger } from '../../src/config/logger.js';

describe('createLogger', () => {
  it('returns a pino logger', () => {
    const log = createLogger({
      LOG_LEVEL: 'info',
      CACHE_TTL_SEARCH_MS: 1, CACHE_TTL_LISTING_MS: 1,
      HTTP_RATE_PER_SEC: 1, HTTP_RATE_PER_HOUR: 1,
    });
    expect(typeof log.info).toBe('function');
    expect(log.level).toBe('info');
  });
});
```

- [ ] Commit: `test(config): smoke test logger factory`

---

### T24: src/lib/cache.ts

**Files:** Create `src/lib/cache.ts`

```ts
import { LRUCache } from 'lru-cache';

export interface CacheOptions { max: number; ttlMs: number }
export interface ICache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  has(key: string): boolean;
  clear(): void;
  size(): number;
}

export const createCache = <V extends object>(opts: CacheOptions): ICache<V> => {
  const lru = new LRUCache<string, V>({ max: opts.max, ttl: opts.ttlMs });
  return {
    get: (k) => lru.get(k),
    set: (k, v) => { lru.set(k, v); },
    has: (k) => lru.has(k),
    clear: () => { lru.clear(); },
    size: () => lru.size,
  };
};
```

- [ ] Commit: `feat(lib): add LRU cache wrapper with TTL`

---

### T25: tests/unit/cache.test.ts

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCache } from '../../src/lib/cache.js';

describe('cache', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('stores and retrieves values', () => {
    const c = createCache<{ x: number }>({ max: 10, ttlMs: 1000 });
    c.set('a', { x: 1 });
    expect(c.get('a')).toEqual({ x: 1 });
  });
  it('expires after TTL', () => {
    const c = createCache<{ x: number }>({ max: 10, ttlMs: 1000 });
    c.set('a', { x: 1 });
    vi.advanceTimersByTime(1500);
    expect(c.get('a')).toBeUndefined();
  });
  it('evicts LRU when full', () => {
    const c = createCache<{ x: number }>({ max: 2, ttlMs: 60_000 });
    c.set('a', { x: 1 }); c.set('b', { x: 2 }); c.set('c', { x: 3 });
    expect(c.has('a')).toBe(false);
  });
});
```

- [ ] Commit: `test(lib): cover cache TTL and LRU eviction`

---

### T26: src/lib/http.ts (undici + p-queue + retry)

**Files:** Create `src/lib/http.ts`

```ts
import { request } from 'undici';
import PQueue from 'p-queue';
import { type Result, ok, err } from './result.js';
import { type McpError, rateLimited, upstreamHTTP } from './errors.js';

export interface HttpOptions { ratePerSec: number; ratePerHour: number; userAgent: string }

export const createHttpClient = (opts: HttpOptions) => {
  const perSec = new PQueue({ intervalCap: opts.ratePerSec, interval: 1000 });
  const perHour = new PQueue({ intervalCap: opts.ratePerHour, interval: 3_600_000 });

  const get = async (url: string, attempt = 0): Promise<Result<string, McpError>> => {
    return perHour.add(() => perSec.add(async () => {
      const jitter = Math.random() * 250;
      await new Promise((r) => setTimeout(r, jitter));
      const res = await request(url, { method: 'GET', headers: { 'user-agent': opts.userAgent } });
      if (res.statusCode === 429) {
        const ra = Number(res.headers['retry-after'] ?? 5) * 1000;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, ra));
          return get(url, attempt + 1);
        }
        return err(rateLimited(ra, new URL(url).host));
      }
      if (res.statusCode >= 400) {
        const body = await res.body.text();
        return err(upstreamHTTP(res.statusCode, url, body.slice(0, 200)));
      }
      return ok(await res.body.text());
    }) as Promise<Result<string, McpError>>) as Promise<Result<string, McpError>>;
  };

  return { get };
};
```

- [ ] Commit: `feat(lib): add rate-limited http client with retry`

---

### T27: tests/unit/http.test.ts (mit msw)

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createHttpClient } from '../../src/lib/http.js';
import { isOk, isErr } from '../../src/lib/result.js';

const server = setupServer(
  http.get('https://example.test/ok', () => HttpResponse.text('hello')),
  http.get('https://example.test/429', () =>
    new HttpResponse(null, { status: 429, headers: { 'Retry-After': '0' } })),
  http.get('https://example.test/500', () =>
    new HttpResponse('boom', { status: 500 })),
);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('http client', () => {
  const client = createHttpClient({ ratePerSec: 100, ratePerHour: 100_000, userAgent: 'test' });
  it('returns body on 200', async () => {
    const r = await client.get('https://example.test/ok');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe('hello');
  });
  it('surfaces 500', async () => {
    const r = await client.get('https://example.test/500');
    expect(isErr(r)).toBe(true);
  });
});
```

- [ ] Commit: `test(lib): cover http client with msw`

---

### T28: src/lib/request-id.ts

```ts
import { randomBytes } from 'node:crypto';
export const newRequestId = (): string => randomBytes(8).toString('hex');
```

- [ ] Commit: `feat(lib): add request-id generator`

---

### T29: tests/unit/request-id.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { newRequestId } from '../../src/lib/request-id.js';

describe('newRequestId', () => {
  it('returns 16-char hex', () => {
    const id = newRequestId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
  it('returns unique values', () => {
    const a = newRequestId(); const b = newRequestId();
    expect(a).not.toBe(b);
  });
});
```

- [ ] Commit: `test(lib): cover request-id`

---

### T30: src/types/airbnb.ts (geteilte Typen)

```ts
export interface Listing {
  id: string;
  title: string;
  url: string;
  price_per_night: number;
  currency: string;
  rating?: number;
  review_count?: number;
  host_name?: string;
  location: string;
  thumbnail_url?: string;
}

export interface ListingFull extends Listing {
  description: string;
  amenities: string[];
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  check_in?: string;
  check_out?: string;
  house_rules?: string[];
}

export interface ReviewsSummary {
  total: number;
  average: number;
  by_category?: { cleanliness: number; accuracy: number; communication: number; location: number; check_in: number; value: number };
  recent_excerpts?: string[];
}

export interface HostSummary {
  name: string;
  superhost: boolean;
  joined: string;
  response_rate?: number;
  response_time?: string;
  languages?: string[];
}

export interface NormalizedQuery {
  location: string;
  checkin?: string;
  checkout?: string;
  adults: number;
  children: number;
  min_price?: number;
  max_price?: number;
  currency: string;
}
```

- [ ] Commit: `feat(types): add shared Airbnb domain types`

---

# Block 2 — MCP Scaffolding (T31–T40)

**Ziel:** Server hochfahren können. Tools registrieren können. Über stdio sprechen.

---

### T31: src/server.ts (Bootstrap)

```ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ToolDefinition } from './tools/registry.js';
import type { Logger } from 'pino';

export const buildServer = (tools: ToolDefinition[], log: Logger) => {
  const server = new Server(
    { name: 'mithgard-bnb-mcp', version: '0.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools.find((t) => t.name === req.params.name);
    if (!tool) throw new Error(`Unknown tool: ${req.params.name}`);
    log.info({ tool: tool.name }, 'tool.call');
    return tool.handler(req.params.arguments ?? {});
  });

  return server;
};
```

- [ ] Commit: `feat(server): MCP bootstrap with list/call handlers`

---

### T32: src/tools/registry.ts

```ts
import type { ZodSchema } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;        // JSON-Schema for MCP
  schema: ZodSchema;                           // Zod runtime check
  handler: (input: unknown) => Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}

export const wrapHandler = <T>(
  schema: ZodSchema<T>,
  fn: (input: T) => Promise<unknown>,
) => async (raw: unknown) => {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'ValidationFailed', issues: parsed.error.issues }) }] };
  }
  const out = await fn(parsed.data);
  return { content: [{ type: 'text' as const, text: JSON.stringify(out) }] };
};
```

- [ ] Commit: `feat(registry): add ToolDefinition + wrapHandler with zod validation`

---

### T33: tests/unit/registry.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { wrapHandler } from '../../src/tools/registry.js';

describe('wrapHandler', () => {
  const schema = z.object({ q: z.string().min(1) });
  const handler = wrapHandler(schema, async (input) => ({ echo: input.q }));

  it('accepts valid input', async () => {
    const r = await handler({ q: 'hi' });
    expect(JSON.parse(r.content[0]!.text)).toEqual({ echo: 'hi' });
  });
  it('rejects invalid input', async () => {
    const r = await handler({ q: '' });
    const body = JSON.parse(r.content[0]!.text);
    expect(body.error).toBe('ValidationFailed');
  });
});
```

- [ ] Commit: `test(registry): cover validation wrapper`

---

### T34: src/tools/index.ts (alle Tools registrieren)

```ts
import type { ToolDefinition } from './registry.js';
// imports werden hier hinzugefügt, sobald Tools existieren
// import { airbnbSearchTool } from './search/tool.js';
// ...

export const allTools = (): ToolDefinition[] => [
  // airbnbSearchTool,
  // airbnbListingDetailsTool,
  // hostInsightsTool, ...
];
```

- [ ] Commit: `feat(tools): add empty registry index (filled per tool task)`

---

### T35: src/index.ts (Entry + stdio Transport)

```ts
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './config/logger.js';
import { buildServer } from './server.js';
import { allTools } from './tools/index.js';

const main = async () => {
  const env = loadEnv();
  const log = createLogger(env);
  const tools = allTools();
  const server = buildServer(tools, log);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info({ tool_count: tools.length }, 'server.started');
};

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] Commit: `feat: wire stdio transport in entry point`

---

### T36: tests/e2e/server.test.ts (Spawn + Ping)

```ts
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';

describe('server e2e', () => {
  it('starts and lists tools over stdio', async () => {
    const proc = spawn('node', ['--import', 'tsx', 'src/index.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const req = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n';
    proc.stdin.write(req);
    const data = await new Promise<string>((resolve) => {
      proc.stdout.once('data', (b) => resolve(b.toString()));
    });
    proc.kill();
    expect(data).toContain('"jsonrpc"');
  }, 10_000);
});
```

- [ ] Commit: `test(e2e): server starts and responds to tools/list`

---

### T37: examples/claude-desktop-config.json

```json
{
  "mcpServers": {
    "mithgard-bnb": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/16_MITHGARD-BNB-MCP/dist/index.js"]
    }
  }
}
```

- [ ] Commit: `docs(examples): add claude-desktop-config snippet`

---

### T38: scripts/dev.sh

```bash
#!/usr/bin/env bash
set -euo pipefail
exec npx tsx watch src/index.ts
```

- [ ] `chmod +x scripts/dev.sh`
- [ ] Commit: `chore(scripts): add dev runner`

---

### T39: scripts/build.sh

```bash
#!/usr/bin/env bash
set -euo pipefail
npm run typecheck
npm run lint
npm run test:cov
npm run build
echo "✓ build complete"
```

- [ ] `chmod +x scripts/build.sh`
- [ ] Commit: `chore(scripts): add build runner with quality gates`

---

### T40: Smoke-Test-Commit (Stand: leerer Server läuft)

- [ ] Run `./scripts/build.sh` — alles grün
- [ ] Run `node dist/index.js` und sende `tools/list` per stdin — antwortet mit leerem Array
- [ ] Tag: `git tag scaffold-complete && git commit --allow-empty -m "milestone: scaffold complete, 0/9 tools, server boots"`

---

# Block 3 — Live-Tools (T41–T70)

**Ziel:** `airbnb_search` und `airbnb_listing_details` funktionieren auf öffentlichen Daten.

## Sub-Block 3a: airbnb_search (T41–T55)

---

### T41: src/parsers/airbnb-public.ts (Skelett)

```ts
import * as cheerio from 'cheerio';
import { type Result, ok, err } from '../lib/result.js';
import { type McpError, parseFailed } from '../lib/errors.js';
import type { Listing, NormalizedQuery } from '../types/airbnb.js';

export const parseSearchResults = (html: string, query: NormalizedQuery): Result<{ listings: Listing[]; total: number }, McpError> => {
  const $ = cheerio.load(html);
  // Airbnb embeds JSON in a <script id="data-deferred-state-0"> tag
  const scriptText = $('script#data-deferred-state-0').text();
  if (!scriptText) return err(parseFailed('script#data-deferred-state-0', 'search'));
  // Implementation in T44 — this is the skeleton for the test to fail against
  return err(parseFailed('not implemented', 'search'));
};
```

- [ ] Commit: `feat(parser): add search parser skeleton (returns ParseFailed)`

---

### T42: tests/integration/fixtures/search-berlin.html

- [ ] Run `curl -A "Mozilla/5.0" "https://www.airbnb.com/s/Berlin/homes" -o tests/integration/fixtures/search-berlin.html`
- [ ] Verify file size > 100KB
- [ ] Commit: `test(fixtures): capture search-berlin html`

> **Hinweis:** falls Airbnb 403 schickt, manuell im Browser laden und HTML-Source speichern.

---

### T43: tests/integration/parser-search.test.ts (Failing Test)

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseSearchResults } from '../../src/parsers/airbnb-public.js';
import { isOk } from '../../src/lib/result.js';

describe('parseSearchResults', () => {
  const html = readFileSync('tests/integration/fixtures/search-berlin.html', 'utf-8');
  it('extracts at least 10 listings', () => {
    const r = parseSearchResults(html, { location: 'Berlin', adults: 2, children: 0, currency: 'EUR' });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.listings.length).toBeGreaterThanOrEqual(10);
  });
  it('each listing has id, title, price', () => {
    const r = parseSearchResults(html, { location: 'Berlin', adults: 2, children: 0, currency: 'EUR' });
    if (isOk(r)) {
      for (const l of r.value.listings) {
        expect(l.id).toBeTruthy();
        expect(l.title).toBeTruthy();
        expect(l.price_per_night).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] Run `npm test`
- [ ] Expected: FAIL (parser not yet implemented)
- [ ] Commit: `test(parser): add failing search parser tests`

---

### T44: src/parsers/airbnb-public.ts (Search-Parser implementieren)

```ts
// Replace skeleton parseSearchResults with real implementation
export const parseSearchResults = (html: string, _query: NormalizedQuery): Result<{ listings: Listing[]; total: number }, McpError> => {
  const $ = cheerio.load(html);
  const scriptText = $('script#data-deferred-state-0').text();
  if (!scriptText) return err(parseFailed('script#data-deferred-state-0', 'search'));
  let json: unknown;
  try { json = JSON.parse(scriptText); }
  catch (e) { return err(parseFailed('JSON.parse', 'search', String(e))); }
  // Airbnb JSON path: niobeMinimalClientData → search results
  // (Path varies by deploy; the code below uses defensive lookup)
  const sections = findInObject<unknown[]>(json, ['niobeMinimalClientData']) ?? [];
  const listings: Listing[] = [];
  walkForListings(sections, listings);
  return ok({ listings, total: listings.length });
};

const findInObject = <T>(o: unknown, path: string[]): T | undefined => {
  let cur: any = o;
  for (const p of path) { if (cur == null) return undefined; cur = cur[p]; }
  return cur as T;
};

const walkForListings = (node: unknown, out: Listing[]) => {
  if (Array.isArray(node)) { for (const n of node) walkForListings(n, out); return; }
  if (typeof node !== 'object' || node === null) return;
  const obj = node as Record<string, unknown>;
  if (typeof obj.id === 'string' && typeof obj.name === 'string' && obj.pricingQuote) {
    const pq = obj.pricingQuote as { rate?: { amount?: number; currency?: string } };
    out.push({
      id: obj.id,
      title: obj.name,
      url: `https://www.airbnb.com/rooms/${obj.id}`,
      price_per_night: pq.rate?.amount ?? 0,
      currency: pq.rate?.currency ?? 'EUR',
      location: typeof obj.city === 'string' ? obj.city : 'unknown',
    });
  }
  for (const v of Object.values(obj)) walkForListings(v, out);
};
```

- [ ] Run `npm test tests/integration/parser-search.test.ts`
- [ ] Expected: PASS
- [ ] Commit: `feat(parser): implement search parser`

---

### T45: src/tools/search/schema.ts

```ts
import { z } from 'zod';

export const SearchInput = z.object({
  location: z.string().min(1),
  checkin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkout: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().int().min(1).max(16).default(2),
  children: z.number().int().min(0).max(10).default(0),
  min_price: z.number().int().nonnegative().optional(),
  max_price: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).default('EUR'),
});
export type SearchInputT = z.infer<typeof SearchInput>;

export const SearchOutput = z.object({
  results: z.array(z.object({
    id: z.string(),
    title: z.string(),
    url: z.string().url(),
    price_per_night: z.number(),
    currency: z.string(),
    location: z.string(),
  })),
  total_estimate: z.number().int().nonnegative(),
  query: z.object({ location: z.string(), adults: z.number(), children: z.number(), currency: z.string() }),
  _source: z.literal('public'),
});
```

- [ ] Commit: `feat(search): add zod schemas`

---

### T46: tests/unit/search-schema.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { SearchInput } from '../../src/tools/search/schema.js';

describe('SearchInput', () => {
  it('accepts minimal valid', () => {
    expect(SearchInput.parse({ location: 'Berlin' }).adults).toBe(2);
  });
  it('rejects empty location', () => {
    expect(() => SearchInput.parse({ location: '' })).toThrow();
  });
  it('rejects bad date format', () => {
    expect(() => SearchInput.parse({ location: 'X', checkin: '2026/06/01' })).toThrow();
  });
});
```

- [ ] Commit: `test(search): cover input schema`

---

### T47: src/tools/search/handler.ts (Skelett)

```ts
import type { SearchInputT } from './schema.js';
import { type Result, err } from '../../lib/result.js';
import { type McpError, notImplemented } from '../../lib/errors.js';

export interface SearchDeps {
  http: { get: (url: string) => Promise<Result<string, McpError>> };
  cache: { get: (k: string) => unknown; set: (k: string, v: unknown) => void };
  parse: (html: string, q: any) => Result<{ listings: any[]; total: number }, McpError>;
}

export const searchHandler = (_deps: SearchDeps) => async (_input: SearchInputT) => {
  return err(notImplemented('airbnb_search', 'wired in T49'));
};
```

- [ ] Commit: `feat(search): add handler skeleton with deps interface`

---

### T48: tests/unit/search-handler.test.ts (Failing)

```ts
import { describe, it, expect, vi } from 'vitest';
import { searchHandler } from '../../src/tools/search/handler.js';
import { ok } from '../../src/lib/result.js';

describe('searchHandler', () => {
  it('returns parsed results', async () => {
    const deps = {
      http: { get: vi.fn().mockResolvedValue(ok('<html/>')) },
      cache: { get: vi.fn(), set: vi.fn() },
      parse: vi.fn().mockReturnValue(ok({ listings: [{ id: '1', title: 'Hut', url: 'https://x', price_per_night: 50, currency: 'EUR', location: 'B' }], total: 1 })),
    };
    const h = searchHandler(deps as any);
    const r = await h({ location: 'Berlin', adults: 2, children: 0, currency: 'EUR' });
    expect((r as any).ok).toBe(true);
  });
});
```

- [ ] Run, expect FAIL
- [ ] Commit: `test(search): failing handler test`

---

### T49: src/tools/search/handler.ts (Implementierung)

```ts
import type { SearchInputT } from './schema.js';
import { type Result, ok } from '../../lib/result.js';
import type { McpError } from '../../lib/errors.js';

export interface SearchDeps {
  http: { get: (url: string) => Promise<Result<string, McpError>> };
  cache: { get: (k: string) => any; set: (k: string, v: any) => void };
  parse: (html: string, q: any) => Result<{ listings: any[]; total: number }, McpError>;
}

const buildUrl = (i: SearchInputT) => {
  const u = new URL(`https://www.airbnb.com/s/${encodeURIComponent(i.location)}/homes`);
  u.searchParams.set('adults', String(i.adults));
  u.searchParams.set('children', String(i.children));
  if (i.checkin) u.searchParams.set('checkin', i.checkin);
  if (i.checkout) u.searchParams.set('checkout', i.checkout);
  if (i.min_price) u.searchParams.set('price_min', String(i.min_price));
  if (i.max_price) u.searchParams.set('price_max', String(i.max_price));
  return u.toString();
};

export const searchHandler = (deps: SearchDeps) => async (input: SearchInputT): Promise<Result<unknown, McpError>> => {
  const url = buildUrl(input);
  const cached = deps.cache.get(url);
  if (cached) return ok(cached);

  const resp = await deps.http.get(url);
  if (!resp.ok) return resp;

  const parsed = deps.parse(resp.value, input);
  if (!parsed.ok) return parsed;

  const out = {
    results: parsed.value.listings,
    total_estimate: parsed.value.total,
    query: { location: input.location, adults: input.adults, children: input.children, currency: input.currency },
    _source: 'public' as const,
  };
  deps.cache.set(url, out);
  return ok(out);
};
```

- [ ] Run, expect PASS
- [ ] Commit: `feat(search): implement handler with cache + http + parse`

---

### T50: src/tools/search/tool.ts (Tool-Definition)

```ts
import { SearchInput } from './schema.js';
import { searchHandler, type SearchDeps } from './handler.js';
import { wrapHandler, type ToolDefinition } from '../registry.js';
import { isOk } from '../../lib/result.js';
import { formatError } from '../../lib/errors.js';

export const buildSearchTool = (deps: SearchDeps): ToolDefinition => ({
  name: 'airbnb_search',
  description: 'Search Airbnb listings on public data. Returns listing IDs, titles, prices, locations.',
  inputSchema: { type: 'object', properties: { location: { type: 'string' } }, required: ['location'] },
  schema: SearchInput,
  handler: wrapHandler(SearchInput, async (input) => {
    const r = await searchHandler(deps)(input);
    if (isOk(r)) return r.value;
    return { error: formatError(r.error), kind: r.error.kind };
  }),
});
```

- [ ] Commit: `feat(search): wire tool definition`

---

### T51: tests/unit/search-tool.test.ts

```ts
import { describe, it, expect, vi } from 'vitest';
import { buildSearchTool } from '../../src/tools/search/tool.js';
import { ok } from '../../src/lib/result.js';

describe('buildSearchTool', () => {
  it('exposes airbnb_search name', () => {
    const t = buildSearchTool({
      http: { get: vi.fn() } as any,
      cache: { get: () => undefined, set: () => {} } as any,
      parse: () => ok({ listings: [], total: 0 }),
    });
    expect(t.name).toBe('airbnb_search');
  });
});
```

- [ ] Commit: `test(search): smoke-test tool definition`

---

### T52: docs/tools/airbnb_search.md

```markdown
# airbnb_search

Search public Airbnb listings.

**Input:**
- `location` (required, string)
- `checkin`, `checkout` (ISO date)
- `adults` (default 2), `children` (default 0)
- `min_price`, `max_price` (int)
- `currency` (default EUR)

**Output:** `{ results: Listing[], total_estimate, query, _source: "public" }`

**Cache:** 15 min per query.

**Rate-Limit:** 1 req/s, 60 req/h.

**Example agent prompt:** "Find me Airbnbs in Berlin for 2 adults, June 1-4, under 100€."
```

- [ ] Commit: `docs(tools): airbnb_search reference`

---

### T53: tests/e2e/search-e2e.test.ts

```ts
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';

describe.skip('search e2e (live, run with E2E_LIVE=1)', () => {
  it('returns results for Berlin', async () => {
    if (process.env.E2E_LIVE !== '1') return;
    const proc = spawn('node', ['dist/index.js']);
    const req = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'airbnb_search', arguments: { location: 'Berlin' } } }) + '\n';
    proc.stdin.write(req);
    const data = await new Promise<string>((resolve) => proc.stdout.once('data', (b) => resolve(b.toString())));
    proc.kill();
    const parsed = JSON.parse(data);
    expect(parsed.result.content[0].text).toContain('"results"');
  }, 30_000);
});
```

- [ ] Commit: `test(e2e): search live test (skipped by default)`

---

### T54: src/tools/index.ts (Search registrieren)

```ts
// Modify: import + add to allTools
import { buildSearchTool } from './search/tool.js';
// ... in allTools(): add buildSearchTool(searchDeps)
```

- [ ] Wire deps in `src/index.ts` (createHttpClient, createCache, parseSearchResults)
- [ ] Commit: `feat(tools): register airbnb_search`

---

### T55: Smoke-Test gegen Claude Desktop

- [ ] Build: `npm run build`
- [ ] Update `~/Library/Application Support/Claude/claude_desktop_config.json` mit Pfad zu `dist/index.js`
- [ ] Restart Claude Desktop
- [ ] Test: "Use the airbnb_search tool to find listings in Berlin"
- [ ] Expected: ≥ 10 Listings im Output
- [ ] Commit (no code change): `chore: validate airbnb_search via Claude Desktop`

---

## Sub-Block 3b: airbnb_listing_details (T56–T70)

> **Pattern wie 3a, gekürzt — gleiches Schema-Schritte-Test-Implementierungs-Doc-Wire-Smoke.**

### T56: tests/integration/fixtures/listing-12345.html
- [ ] curl ein bekanntes Listing (z.B. eines deiner eigenen) und speichere HTML
- [ ] Commit: `test(fixtures): capture listing html`

### T57: tests/integration/parser-listing.test.ts
- [ ] Schreibe failing test analog zu T43, asserts `listing.title`, `listing.bedrooms`, `reviews_summary.average`
- [ ] Commit: `test(parser): add failing listing parser tests`

### T58: src/parsers/airbnb-public.ts (Listing-Parser hinzufügen)
- [ ] Implement `parseListingDetails(html, listingId): Result<{ listing: ListingFull, reviews_summary, host_summary }, McpError>`
- [ ] Defensive Lookup wie in T44, aber Pfade auf `bookingPdpSections` und `reviewsModule`
- [ ] Tests grün
- [ ] Commit: `feat(parser): implement listing details parser`

### T59–T63: Schema, Handler-Skelett, Failing Test, Implementation, Tool-Def
- [ ] T59: `src/tools/listing-details/schema.ts` — Input `{ listing_id, checkin?, checkout? }`, Output mit `ListingFull`, `ReviewsSummary`, `HostSummary`
- [ ] T60: Schema-Test
- [ ] T61: Handler-Skelett (returns NotImplemented)
- [ ] T62: Failing Handler-Test (mit msw)
- [ ] T63: Handler-Implementation (URL `https://www.airbnb.com/rooms/{id}`, cache 30 min, parse, return)
- [ ] Each commit: konventionell

### T64–T68: Tool-Def, Test, Doc, Wire, e2e-skip
- [ ] T64: `tool.ts` mit `buildListingDetailsTool(deps)`
- [ ] T65: Smoke-Test wie T51
- [ ] T66: `docs/tools/airbnb_listing_details.md`
- [ ] T67: e2e skipped Live-Test
- [ ] T68: Wire in `src/tools/index.ts`

### T69: Cache-Hit-Metric

```ts
// Erweitere handler.ts: log.info({ tool: 'airbnb_listing_details', cache_hit: !!cached }, 'tool.cache')
```
- [ ] Commit: `feat(listing): emit cache_hit log`

### T70: Rate-Limit Integration-Test

```ts
// tests/integration/ratelimit.test.ts
// Sende 5 sequentielle search-Calls mit ratePerSec=1, miss erwartet, Wall-Clock ≥ 4s
```
- [ ] Commit: `test(integration): rate limiter enforces 1 req/sec`

---

# Block 4 — Mock-Tools (T71–T120)

**Ziel:** 7 Demo-Tools, jedes ein Pitch-Beweis. Alle gemockt, alle deterministisch, alle gelabelt.

## Template-Task (gilt für jedes Mock-Tool)

> Ersetze `<NAME>` und `<name>` mit dem konkreten Tool-Namen. Jedes Tool hat 7 Sub-Tasks.

**Pro Tool 7 Tasks:**

1. **`src/tools/<name>/schema.ts`** — Zod Input + Output Schemas. Output enthält IMMER `_mock: true` und `_pitch: string`.
2. **`tests/unit/<name>-schema.test.ts`** — accept/reject Validierung.
3. **`src/mocks/<name>.fixture.ts`** — handgemachte realistische Beispieldaten, deterministisch (gleicher Input → gleicher Output).
4. **`src/tools/<name>/handler.ts`** — wählt Fixture per Keyword/ID-Hash.
5. **`tests/unit/<name>-handler.test.ts`** — assert determinism + `_mock: true` field.
6. **`src/tools/<name>/tool.ts`** — Tool-Definition; Description beginnt mit `[DEMO — requires Airbnb Partner API]`.
7. **`docs/tools/<name>.md`** — Beschreibung, Beispiel-Input/Output, Pitch-Statement.

**Commit-Stil:** je Sub-Task ein Commit, z.B. `feat(host_insights): add zod schemas`, `test(host_insights): cover handler determinism`.

---

### Tool 1: host_insights (T71–T77)

**Pitch:** "Tells the host: this listing under-performs by 18% vs similar listings; raise weekend prices €15."

**Input:**
```ts
{ listing_id: string; period?: 'last_30d' | 'last_90d' | 'last_year' }
```

**Output (Mock):**
```ts
{
  occupancy_rate: number;             // 0-1
  revenue_eur: number;
  competitor_avg_revenue_eur: number;
  delta_pct: number;                  // signed
  pricing_recommendations: Array<{ date_range: string; current: number; suggested: number; reason: string }>;
  insights: string[];
  _mock: true;
  _pitch: 'Surfaces revenue gaps and concrete pricing actions per listing';
}
```

- [ ] T71: schema.ts → commit
- [ ] T72: schema test → commit
- [ ] T73: fixture.ts (3 deterministic profiles: under/at/over performing) → commit
- [ ] T74: handler.ts (hash listing_id → pick profile) → commit
- [ ] T75: handler test → commit
- [ ] T76: tool.ts mit `[DEMO]` description → commit
- [ ] T77: docs/tools/host_insights.md → commit

---

### Tool 2: guest_message_assistant (T78–T84)

**Pitch:** "Drafts host-voiced replies to incoming guest messages with approval gate."

**Input:**
```ts
{ thread_id: string; last_message: string; host_voice?: 'casual' | 'professional' | 'warm' }
```

**Output (Mock):**
```ts
{
  suggestions: Array<{ tone: 'short'|'friendly'|'formal'; text: string }>;
  recommended_index: number;
  approval_required: true;
  _mock: true;
  _pitch: 'Drafts host-voiced replies with approval gate';
}
```

**Fixture-Strategie:** Match per Keyword (`wifi`, `check-in`, `late`, `cancel`, `pet`) → eines von 5 Templates. Default-Template wenn nichts matched.

- [ ] T78–T84 (7 Sub-Tasks) wie Template

---

### Tool 3: booking_request_triage (T85–T91)

**Pitch:** "Risk-scores incoming booking requests with reasoning the host can audit."

**Input:**
```ts
{ thread_id: string; guest_profile: { joined: string; reviews: number; rating?: number; verified: boolean }; trip: { adults: number; children: number; pets: boolean; nights: number; reason?: string } }
```

**Output:**
```ts
{
  risk_score: number;                 // 0–100, 100 = high risk
  recommendation: 'auto_accept' | 'review' | 'auto_decline';
  reasoning: string[];
  red_flags: string[];
  green_flags: string[];
  _mock: true;
  _pitch: 'Risk-scores guests with auditable reasoning, never auto-acts without approval';
}
```

- [ ] T85–T91 wie Template

---

### Tool 4: smart_pricing (T92–T98)

**Pitch:** "Daily prices with reasoning: events, weather, competition, occupancy patterns."

**Input:**
```ts
{ listing_id: string; from: ISO_date; to: ISO_date }
```

**Output:**
```ts
{
  daily_prices: Array<{ date: string; suggested: number; current?: number; delta_pct?: number; reasons: string[] }>;
  summary: { avg_suggested: number; total_revenue_estimate: number };
  _mock: true;
  _pitch: 'Per-day pricing with explainable factors';
}
```

- [ ] T92–T98 wie Template

---

### Tool 5: calendar_optimizer (T99–T105)

**Pitch:** "Spot the 1-night gaps the calendar currently bleeds money through."

**Input:**
```ts
{ listing_id: string; horizon_days: 30 | 60 | 90 }
```

**Output:**
```ts
{
  gaps: Array<{ start: string; end: string; nights: number; cost_estimate_eur: number; suggestion: 'discount' | 'min_stay_relax' | 'block' }>;
  potential_recovery_eur: number;
  _mock: true;
  _pitch: 'Surfaces calendar gaps and concrete actions to recover lost nights';
}
```

- [ ] T99–T105 wie Template

---

### Tool 6: review_responder (T106–T112)

**Pitch:** "Drafts host responses to reviews; flags if escalation (refund/policy) is needed."

**Input:**
```ts
{ review_id: string; review_text: string; rating: 1|2|3|4|5; host_voice?: 'warm' | 'professional' }
```

**Output:**
```ts
{
  draft: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  needs_escalation: boolean;
  escalation_reason?: string;
  _mock: true;
  _pitch: 'Auto-drafts review responses, flags escalation cases for human review';
}
```

- [ ] T106–T112 wie Template

---

### Tool 7: turnover_coordinator (T113–T119)

**Pitch:** "Briefs the cleaning crew, sends the access code, builds the next handover checklist."

**Input:**
```ts
{ listing_id: string; checkout_at: ISO_datetime; checkin_at: ISO_datetime; cleaner_id?: string }
```

**Output:**
```ts
{
  brief: string;
  checklist: string[];
  crew_message_draft: string;
  estimated_duration_min: number;
  _mock: true;
  _pitch: 'Coordinates turnover end-to-end with crew briefing and handover checklist';
}
```

- [ ] T113–T119 wie Template

---

### T120: Validation aller 9 Tools

- [ ] Run `node dist/index.js`, sende `tools/list`, expected: 9 Tools
- [ ] Smoke jeden Mock-Tool aus Claude Desktop heraus
- [ ] Commit: `milestone: all 9 tools registered and reachable`

---

# Block 5 — Observability (T121–T130)

### T121: src/lib/telemetry.ts

```ts
import type { Logger } from 'pino';
import { newRequestId } from './request-id.js';

export const withTelemetry = <I, O>(
  log: Logger,
  tool: string,
  fn: (input: I) => Promise<O>,
) => async (input: I): Promise<O> => {
  const request_id = newRequestId();
  const start = Date.now();
  try {
    const out = await fn(input);
    log.info({ tool, request_id, duration_ms: Date.now() - start, status: 'ok' }, 'tool.done');
    return out;
  } catch (e) {
    log.error({ tool, request_id, duration_ms: Date.now() - start, status: 'error', err: String(e) }, 'tool.error');
    throw e;
  }
};
```

- [ ] Commit: `feat(telemetry): add withTelemetry wrapper`

### T122: tests/unit/telemetry.test.ts
- [ ] Cover: log.info called with correct fields, errors logged at error level
- [ ] Commit

### T123: Integriere telemetry in jeden Handler
- [ ] Modify all 9 tool.ts files: `wrapHandler(schema, withTelemetry(log, name, handler))`
- [ ] Commit: `refactor(tools): wrap all handlers in telemetry`

### T124: Cache-Hit als Log-Field
- [ ] Modify search/listing handlers: emit `cache_hit: boolean`
- [ ] Commit: `feat(observability): log cache hit/miss per tool call`

### T125: src/lib/otel.ts (optional)
- [ ] Nur initialisieren wenn `OTEL_EXPORTER_OTLP_ENDPOINT` gesetzt
- [ ] Auto-instrument undici
- [ ] Commit: `feat(otel): optional OTLP traces gated on env`

### T126: tests/unit/otel.test.ts
- [ ] Test: ohne env var → noop init; mit env var → SDK initialized
- [ ] Commit

### T127: CLI `--debug` Flag
- [ ] In `src/index.ts`: parse `process.argv`, if `--debug` set logger level to `debug`, dump tool I/O envelopes
- [ ] Commit: `feat(cli): --debug prints sanitized request/response`

### T128: tests/e2e/debug-flag.test.ts
- [ ] Spawn with `--debug`, expect debug logs in stderr
- [ ] Commit

### T129: src/lib/redaction.ts + Test
- [ ] Custom redaction beyond pino's default — strip `email`, `phone`, `last_message`, `review_text` from any output destined for logs
- [ ] Commit: `feat(redaction): strip PII from log payloads`

### T130: docs/architecture.md (Observability-Sektion)
- [ ] Dokumentiere Log-Format, Felder, OTEL-Setup
- [ ] Commit

---

# Block 6 — DX & Docs (T131–T150)

### T131: README.md (final)
- [ ] Badges (CI status, npm, license, Node version)
- [ ] Quick-Start Snippet (5 Zeilen Claude Desktop config)
- [ ] Tools-Tabelle (live vs mock)
- [ ] Limitations-Sektion (Honest about ToS, public-only)
- [ ] Commit: `docs: write production README`

### T132: CONTRIBUTING.md
- [ ] Commit-Format, Dev-Setup, Test-Anforderungen, ADR-Pflicht für neue Deps
- [ ] Commit

### T133: CODE_OF_CONDUCT.md
- [ ] Contributor Covenant 2.1
- [ ] Commit

### T134: SECURITY.md
- [ ] Disclosure-Email, Coverage, SLA
- [ ] Commit

### T135: LICENSE
- [ ] MIT, Copyright "Mithgard / Nico Kaitinnis 2026"
- [ ] Commit

### T136: CHANGELOG.md (changesets init)
- [ ] `npx changeset init`
- [ ] Empty CHANGELOG with header
- [ ] Commit

### T137–T141: ADRs
- [ ] T137: `docs/adr/0001-typescript.md` — Warum TS statt Python
- [ ] T138: `docs/adr/0002-mcp-sdk.md` — Official SDK statt Custom-Build
- [ ] T139: `docs/adr/0003-zod-validation.md` — Zod als Single-Source für Schemas
- [ ] T140: `docs/adr/0004-result-type.md` — Throw vs Result
- [ ] T141: `docs/adr/0005-mock-vs-live.md` — Warum Mocks ehrlich gelabelt
- Each: `docs(adr): NNNN <topic>` commit

### T142: docs/architecture.md
- [ ] Vollständiges Architektur-Doc mit Diagrammen, Modul-Boundaries, Data-Flow
- [ ] Commit

### T143: docs/deploy.md
- [ ] Self-hosting Guide (Docker, Claude Desktop, Cursor)
- [ ] Commit

### T144: examples/usage.md
- [ ] Real conversation transcripts mit Claude
- [ ] Commit

### T145: examples/agent-conversation.md
- [ ] 3 realistische Agent-Szenarien (Search, Booking-Triage, Calendar-Opt)
- [ ] Commit

### T146: .github/ISSUE_TEMPLATE/bug.yml
- [ ] Strukturiertes Issue-Form
- [ ] Commit

### T147: .github/ISSUE_TEMPLATE/feature.yml
- [ ] Feature-Request-Form
- [ ] Commit

### T148: .github/PULL_REQUEST_TEMPLATE.md
- [ ] Checklist (tests, docs, changeset, ADR if dep)
- [ ] Commit

### T149: README-Badges + ASCII-Demo
- [ ] CI-Badge, Coverage-Badge, License, Node-Version
- [ ] Optional: asciinema cast eingebettet
- [ ] Commit

### T150: docs/limitations.md
- [ ] Klare Liste was wir NICHT können (kein Login, kein Schreiben, kein PII)
- [ ] Commit

---

# Block 7 — Pitch-Material (T151–T165)

### T151: docs/pitch/airbnb-cold-email.md

**Template:**
```
Subject: We built the host-side Airbnb MCP you don't have yet — open source, audit-ready

Hi <name>,

I host on Airbnb. I use Claude. I wanted Claude to handle my guest comms,
booking triage, pricing, calendar optimization, review responses, and
turnovers — the way it already handles my email.

I noticed Airbnb has no host-side API for individual hosts and no MCP.
So I built the reference implementation:

- 2 working tools on public data (search, listing details)
- 7 designed-and-spec'd tools waiting for Partner API access
  (host insights, guest messages, booking triage, smart pricing,
   calendar optimizer, review responder, turnover coordinator)

Repo: github.com/mithgard/bnb-mcp (private, share access on request)
Demo: 2-min video at <link>

I'd love 20 minutes to walk through it. Either you take it (MIT license,
no strings) or you open Partner API access and I ship it for real with
the seven mock tools wired to your endpoints.

— Nico Kaitinnis, Mithgard
   nicolaskaitinnis1991@gmail.com · LinkedIn: /in/...
```

- [ ] Commit: `docs(pitch): airbnb cold email template`

### T152: docs/pitch/linkedin-dm.md
- [ ] 800-Char-Variante für LinkedIn-Limit
- [ ] Commit

### T153: docs/pitch/one-pager.md
- [ ] Single-Page PDF-fähig (Markdown → PDF), 80/20-Pitch
- [ ] Commit

### T154: docs/pitch/value-prop-matrix.md
- [ ] Tabelle: Tool × Host-Pain × Time-Saved × Partner-API-Field-Required
- [ ] Commit

### T155: docs/pitch/competitive-landscape.md
- [ ] Hostaway, Smoobu, Hospitable, openbnb-mcp Vergleich
- [ ] Was wir anders machen
- [ ] Commit

### T156: docs/pitch/security-faq.md
- [ ] Häufige Sicherheits-Fragen + Antworten (kein Login, kein PII, etc.)
- [ ] Commit

### T157: docs/pitch/legal-faq.md
- [ ] ToS, Open Source License, Trademark, etc.
- [ ] Commit

### T158: docs/pitch/recipient-research.md
- [ ] Liste potenzieller Empfänger: Head of Host Tools, Head of Platform Eng, Head of AI
- [ ] LinkedIn-Profile, Twitter, Vorab-Research zu jedem
- [ ] Empfehlung: Wen zuerst, wann, wie
- [ ] Commit

### T159–T161: Landing-Page (statisch, optional)
- [ ] T159: `landing/index.html`
- [ ] T160: `landing/styles.css`
- [ ] T161: Demo-Asciinema oder Loom-Embed
- [ ] Commit jeweils

### T162: Demo-Video Script
- [ ] 90-Sekunden-Skript: Hook (10s), Problem (20s), Demo (40s), Ask (20s)
- [ ] Commit

### T163: Demo-Video Aufnahme
- [ ] Loom-Aufnahme nach Skript
- [ ] Link in pitch-files einbetten
- [ ] Commit (just link)

### T164: Tweet-Thread Draft
- [ ] 6-Tweet-Thread für Public-Release-Tag
- [ ] Commit

### T165: Follow-up Email Template (T+7)
- [ ] Soft Bump, value-add (z.B. "1 neuer Tool dazugekommen")
- [ ] Commit

---

# Block 8 — Release (T166–T180)

### T166: .npmrc
```
access=restricted
```
- [ ] Commit

### T167: scripts/publish-dry-run.sh
```bash
#!/usr/bin/env bash
set -euo pipefail
npm pack --dry-run
echo "✓ pack ok"
```
- [ ] Commit

### T168: changesets erste Changeset
- [ ] `npx changeset` → "minor: initial alpha release"
- [ ] Commit

### T169: GitHub Action — release.yml
- [ ] Action triggers on tag `v*`, runs build, publishes to ghcr.io as Docker
- [ ] Commit

### T170: Docker multi-arch build
- [ ] `docker buildx build --platform linux/amd64,linux/arm64 -t mithgard/bnb-mcp:0.1.0 .`
- [ ] Commit

### T171: User-Agent String
- [ ] `src/lib/http.ts`: UA = `mithgard-bnb-mcp/0.1.0 (+github.com/mithgard/bnb-mcp)`
- [ ] Commit

### T172: --version Flag
- [ ] Read from package.json, print, exit 0
- [ ] Test
- [ ] Commit

### T173: Pre-Release Checklist
- [ ] `docs/release-checklist.md` mit 15 Items
- [ ] Commit

### T174: Rollback-Procedure
- [ ] `docs/rollback.md` — wie revert man Docker-Tag, NPM-Deprecate, Git-Tag-Rollback
- [ ] Commit

### T175: GPG-Signing-Setup
- [ ] `.gitconfig` per-repo: `commit.gpgsign = true`
- [ ] Doku in `docs/release-checklist.md`
- [ ] Commit

### T176: Tag v0.1.0-alpha
- [ ] `git tag v0.1.0-alpha -s -m "Alpha: 2 live + 7 mock tools, ready for pitch"`
- [ ] Push tag
- [ ] Verify GH-Action läuft, Docker-Image baut
- [ ] Commit (none — tag operation)

### T177: Release-Notes v0.1.0
- [ ] CHANGELOG-Eintrag, GH-Release-Body
- [ ] Commit

### T178: Final-Build-Smoke
- [ ] Pull Docker image, run, send tools/list, expected 9 tools
- [ ] Commit (none)

### T179: Pitch versenden
- [ ] Liste aus T158 abarbeiten (3 Empfänger, gestaffelt: Tag 0, +3, +7)
- [ ] Tracker in `docs/pitch/sent-log.md`
- [ ] Commit `docs(pitch): log first batch of outreach`

### T180: Post-Send-Verification
- [ ] Repo ist privat, README finalisiert, Demo-Video läuft, alle CI grün
- [ ] Tag `pitch-batch-1-sent`
- [ ] Final commit: `milestone: pitch batch 1 sent — repo + docs + tools production-ready`

---

## Selbst-Review (manuell vor Ausführung)

Bevor irgendein Agent diesen Katalog ausführt:

1. **Spec-Coverage-Check:** Jede der 17 Sektionen aus dem Design-Spec hat eine Task-Reihe?
   - Architektur → Block 0–2 ✓
   - 9 Tools → Block 3–4 ✓
   - Error-Handling → T18, T19 ✓
   - Testing → durchgängig ✓
   - Observability → Block 5 ✓
   - Security → T134, T156 ✓
   - Distribution → Block 8 ✓
   - Pitch → Block 7 ✓

2. **Placeholder-Scan:** Suche nach "TBD", "TODO", "implement later" — none found.

3. **Type-Konsistenz:** `Listing`, `ListingFull`, `ReviewsSummary`, `HostSummary`, `NormalizedQuery` durchgängig dieselben Namen über T30, T44, T58, T63 hinweg ✓.

4. **Mock-Pflicht:** Jedes Mock-Tool emittiert `_mock: true` und `_pitch: string` per T71-T119 Template ✓.

---

## Execution Handoff

**Plan komplett, gespeichert in `docs/prompts/build-catalog.md`. Zwei Ausführungs-Optionen:**

**1. Subagent-Driven (empfohlen)** — pro Task ein frischer Subagent, Review zwischen Tasks, schnelle Iteration. Skill: `superpowers:subagent-driven-development`.

**2. Inline Execution** — Tasks in dieser Session ausführen, Batch-Execution mit Checkpoints. Skill: `superpowers:executing-plans`.

**Welcher Ansatz?**
