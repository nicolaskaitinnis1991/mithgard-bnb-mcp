import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/stress/**/*.test.ts'],
    environment: 'node',
    retry: 0,
    testTimeout: 30_000,
  },
});
