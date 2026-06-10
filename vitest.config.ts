import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    alias: {
      '@': new URL('.', import.meta.url).href,
    },
  },
  resolve: {
    alias: {
      '@': new URL('.', import.meta.url).href,
    },
  },
})
