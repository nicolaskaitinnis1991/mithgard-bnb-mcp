import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/stress/**/*.test.ts'],
    environment: 'node',
    retry: 0,
    reporters: [
      'default',
      [
        'json',
        {
          outputFile: process.env.MITHGARD_STRESS_DOCKER_IMAGE
            ? 'reports/stress-container.json'
            : 'reports/stress-native.json',
        },
      ],
    ],
    testTimeout: 30_000,
  },
});
