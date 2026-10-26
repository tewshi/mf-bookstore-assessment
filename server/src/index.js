import express from 'express'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth.js'
import { api } from './api.js'
import { stripeWebhook } from './webhook.js'

const app = express()

// `npm start` sets NODE_ENV=production; `npm run dev` doesn't
const isProduction = process.env.NODE_ENV === 'production'

// Signup, login, logout and "who am I" all live under /api/auth.
// It goes before express.json(), because Better Auth reads the body itself.
app.all('/api/auth/{*any}', toNodeHandler(auth))

// Stripe's payment confirmations. Also before express.json(): express.raw()
// keeps the body as the exact bytes Stripe signed (see webhook.js).
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook)

app.use(express.json())
app.use('/api', api)

// In production the same server also hands out the built React app,
// so the site and its API share one URL. In dev, Vite does this instead,
// so an old build in client/dist can't be mistaken for the live code.
if (isProduction) {
  app.use(express.static(new URL('../../client/dist', import.meta.url).pathname))
}

const port = process.env.PORT || 3000
app.listen(port, () => {
  if (isProduction) {
    console.log(`Site and API on port ${port}`)
  } else {
    // In dev the page comes from Vite, which passes /api on to here
    console.log(`API on http://localhost:${port}/api. Open the site at http://localhost:5173`)
  }
})
