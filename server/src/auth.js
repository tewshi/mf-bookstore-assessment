import { betterAuth } from 'better-auth'
import { pool } from './db.js'

// Better Auth handles signup, login and sessions, and stores users in our
// Postgres. It reads BETTER_AUTH_SECRET (signs the session cookie) and
// BETTER_AUTH_URL (the address people open the site on) from the environment.
export const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },
})
