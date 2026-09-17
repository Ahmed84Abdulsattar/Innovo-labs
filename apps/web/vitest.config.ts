import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals:     false,
    include:     ['__tests__/**/*.test.ts'],
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'lcov'],
      include:   ['lib/**/*.ts'],
      exclude:   ['lib/context.tsx'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // The server-only / client-only guards throw outside Next's bundler.
      // Map them to their shipped no-op stubs so unit tests can import the
      // guarded modules. (Next.js resolves these itself at build time.)
      'server-only': path.resolve(__dirname, 'node_modules/server-only/empty.js'),
      'client-only': path.resolve(__dirname, 'node_modules/client-only/index.js'),
    },
  },
})
