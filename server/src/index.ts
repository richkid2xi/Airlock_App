import { app } from './app'

const port = Number(process.env.PORT ?? 8787)

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`airlock server listening on http://127.0.0.1:${port}`)
})
