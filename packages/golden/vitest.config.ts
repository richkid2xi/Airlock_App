import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@airlock/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  test: {
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})