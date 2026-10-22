import pg from 'pg'

// One pool of connections to Postgres, shared by the API, Better Auth
// and the scripts in db/. DATABASE_URL comes from .env (or Railway).
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
