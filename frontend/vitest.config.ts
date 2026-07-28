import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, '.'),
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/vitest.setup.ts'],
    hookTimeout: 30000,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      exclude: [
        'node_modules/',
        '.nuxt/',
        'dist/',
        'electron/',
        'tests/',
      ],
    },
  },
});
