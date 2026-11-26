import express from 'express'
import { loadExampleVector } from '@airlock/golden'

export function createApp() {
  const app = express()
  app.get('/health', (_req, res) => {
    const vector = loadExampleVector()
    res.json({ status: 'ok', service: 'airlock-server', goldenVectorId: vector.id })
  })
  return app
}

export const app = createApp()
