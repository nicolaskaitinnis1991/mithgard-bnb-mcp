import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
    // Retry transient failures once. The rate-limiter and e2e fixture tests have
    // small timing windows; a single retry papers over scheduler jitter without
    // hiding a genuine regression (which would fail twice in a row).
    retry: 1,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Lines/functions/statements at 80% measure real logic coverage.
      // Branches at 55% because:
      //   1. The HTML parser is multi-strategy (modern + legacy fallback) — many
      //      defensive branches fire only when Airbnb's JSON shape changes again.
      //   2. Tool handlers have cache-miss / http-err / parse-err defensive paths
      //      that are exercised end-to-end via the e2e tests, not unit-mocked.
      //   3. Strict TS (exactOptionalPropertyTypes, conditional spreads) introduces
      //      branches the type system already proves safe.
      // We measure 56.7% today; the 55% floor leaves 1.7 ppt of slack while still
      // catching regressions. The threshold's purpose is "no regression", not
      // theoretical purity — if a future change pushes branches below 55%, CI
      // catches the slip.
      thresholds: { lines: 80, branches: 55, functions: 80, statements: 80 },
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        'src/server.ts',
        'src/types/**',
        'src/mocks/**',
      ],
    },
  },
});
