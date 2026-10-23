import pg from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Add it to server/.env, or as a Railway variable.')
}

// One pool of connections to Postgres, shared by the API, Better Auth
// and the scripts in db/. DATABASE_URL comes from .env (or Railway).
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

// Neon closes connections that sit idle. Without this listener, pg reports
// that as an unhandled 'error' event and the whole server crashes. The pool
// throws the dead connection away and opens a new one when it needs it.
pool.on('error', (err) => console.error('Idle database connection closed:', err.message))
