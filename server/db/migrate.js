// Creates every table. Safe to run again: only missing tables are added.
import { readFile } from 'node:fs/promises'
import { getMigrations } from 'better-auth/db/migration'
import { auth } from '../src/lib/auth.js'
import { pool } from '../src/lib/db.js'

// 1. Better Auth's own tables: user, session, account, verification
const { runMigrations } = await getMigrations(auth.options)
await runMigrations()

// 2. Our tables: books, events, orders, order_items, reviews, wishlist,
// event_signups and notifications
await pool.query(await readFile(new URL('schema.sql', import.meta.url), 'utf8'))

console.log('Tables are up to date')
await pool.end()
