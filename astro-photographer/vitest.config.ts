import { defineConfig } from 'vitest/config';

// Minimal vitest config for the client script unit/property tests
// (src/scripts/*.ts). jsdom gives us a DOM + window for the motion/nav code.
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts'],
  },
});
