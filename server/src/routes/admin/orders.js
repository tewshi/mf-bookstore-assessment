import { Router } from 'express'
import { pool } from '../../lib/db.js'

// Mounted at /api/admin/orders (see ../admin.js, which checks for an admin first)
export const adminOrders = Router()

// GET /api/admin/orders: every order from everyone, newest first, with who
// placed it and a one-line summary of the books
adminOrders.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT orders.id, orders.total, orders.status, orders.card_last4, orders.created_at,
            "user".name, "user".email,
            sum(order_items.quantity)::int AS book_count,
            string_agg(books.title || ' × ' || order_items.quantity, ', ' ORDER BY books.title) AS summary
     FROM orders
     JOIN "user" ON "user".id = orders.user_id
     JOIN order_items ON order_items.order_id = orders.id
     JOIN books ON books.id = order_items.book_id
     GROUP BY orders.id, "user".name, "user".email
     ORDER BY orders.created_at DESC`,
  )
  res.json(
    rows.map((row) => ({
      id: row.id,
      total: Number(row.total),
      status: row.status,
      cardLast4: row.card_last4,
      createdAt: row.created_at,
      name: row.name,
      email: row.email,
      bookCount: row.book_count,
      summary: row.summary,
    })),
  )
})
