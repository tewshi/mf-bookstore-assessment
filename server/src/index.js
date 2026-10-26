import express from 'express'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth.js'
import { api } from './routes/api.js'
import { stripeWebhook } from './routes/webhook.js'

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
  const dist = new URL('../../client/dist', import.meta.url).pathname
  app.use(express.static(dist))

  // Pages have real addresses (/cart, /book/slow-maps), but there is only
  // one HTML file: React picks the page from the address. So any other GET
  // gets index.html, e.g. after a refresh on /my-books. /api is left out,
  // so a wrong API address still answers 404 instead of a web page.
  app.get('/{*any}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(`${dist}/index.html`)
  })
}

// Any error a route didn't catch itself, e.g. the database being down.
// Express 5 sends errors from async routes here too. Without this, Express
// answers with an HTML error page, which the React app can't read as JSON.
// The real error goes to the log; the visitor only sees a short message.
app.use((err, req, res, next) => {
  // The answer already started (rare): let Express close the connection
  if (res.headersSent) return next(err)
  // express.json() gives a broken request body status 400. Anything
  // without a status is a mistake on our side: 500, and log it.
  const status = err.status ?? 500
  if (status === 500) console.error(err)
  res.status(status).json({
    error: status === 500 ? 'Something went wrong. Please try again.' : 'That request was not valid',
  })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  if (isProduction) {
    console.log(`Site and API on port ${port}`)
  } else {
    // In dev the page comes from Vite, which passes /api on to here
    console.log(`API on http://localhost:${port}/api. Open the site at http://localhost:5173`)
  }
})
