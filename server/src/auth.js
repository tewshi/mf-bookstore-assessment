import { betterAuth } from 'better-auth'
import { pool } from './db.js'

for (const name of ['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL']) {
  if (!process.env[name]) {
    throw new Error(`${name} is not set. Add it to server/.env, or as a Railway variable.`)
  }
}

// Better Auth handles signup, login and sessions, and stores users in our
// Postgres. It reads BETTER_AUTH_SECRET (signs the session cookie) and
// BETTER_AUTH_URL (the address people open the site on) from the environment.
export const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },
  user: {
    // An extra column on the user table: 'customer' or 'admin'. migrate.js
    // adds it. input: false means sign up can't set it, so nobody can make
    // themselves an admin; only db/make-admin.js changes it.
    additionalFields: {
      role: { type: 'string', defaultValue: 'customer', input: false },
    },
  },
})
