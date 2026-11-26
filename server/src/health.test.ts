import { describe, it, expect } from 'vitest'
import { createApp } from './app'

describe('server /health', () => {
  it('returns ok and loads the example golden vector', async () => {
    const app = createApp()
    const server = app.listen(0)
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0

    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`)
      expect(res.status).toBe(200)
      const body = (await res.json()) as { status: string; goldenVectorId: string }
      expect(body.status).toBe('ok')
      expect(body.goldenVectorId).toBe('GV-EXAMPLE-001')
    } finally {
      server.close()
    }
  })
})