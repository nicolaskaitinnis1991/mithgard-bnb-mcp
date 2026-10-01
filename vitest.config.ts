import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/e2e/**/*.test.ts',
    ],
    passWithNoTests: false,
    retry: 0,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Coverage floors guard regressions; they do not prove every line correct.
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
