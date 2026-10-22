import express from 'express'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './auth.js'
import { api } from './api.js'

const app = express()

// Signup, login, logout and "who am I" all live under /api/auth.
// It goes before express.json(), because Better Auth reads the body itself.
app.all('/api/auth/{*any}', toNodeHandler(auth))

app.use(express.json())
app.use('/api', api)

// In production the same server also hands out the built React app,
// so the site and its API share one URL. In dev, Vite does this instead.
app.use(express.static(new URL('../../client/dist', import.meta.url).pathname))

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Server on http://localhost:${port}`))
