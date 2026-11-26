import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@airlock/shared': path.resolve(__dirname, '../packages/shared/src'),
      '@airlock/golden': path.resolve(__dirname, '../packages/golden/src'),
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})