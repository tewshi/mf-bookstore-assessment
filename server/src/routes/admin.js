import { Router } from 'express'
import { pool } from '../lib/db.js'
import { requireAdmin } from '../lib/session.js'
import { adminOrders } from './admin/orders.js'
import { adminBooks } from './admin/books.js'
import { adminEvents } from './admin/events.js'
import { adminUsers } from './admin/users.js'

// Mounted at /api/admin. requireAdmin runs first, so every route in the
// admin/ folder is for admins only. One file per tab of the admin page.
export const admin = Router()
admin.use(requireAdmin)

// GET /api/admin/counts: how many orders, books, events and users there
// are, for the badges on the admin page's tabs. Each count is a small
// subquery, so it is one trip to the database.
admin.get('/counts', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT (SELECT count(*)::int FROM orders) AS orders,
            (SELECT count(*)::int FROM books) AS books,
            (SELECT count(*)::int FROM events) AS events,
            (SELECT count(*)::int FROM "user") AS users`,
  )
  res.json(rows[0])
})

admin.use('/orders', adminOrders)
admin.use('/books', adminBooks)
admin.use('/events', adminEvents)
admin.use('/users', adminUsers)
