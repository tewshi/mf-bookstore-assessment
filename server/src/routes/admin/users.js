import { Router } from 'express'
import { pool } from '../../lib/db.js'

// Mounted at /api/admin/users (see ../admin.js, which checks for an admin first)
export const adminUsers = Router()

// GET /api/admin/users: everyone with an account, newest first, with how
// many paid orders they have and what they spent. Read only: accounts are
// made by signing up, and roles change with db/make-admin.js.
adminUsers.get('/', async (req, res) => {
  // LEFT JOIN keeps people with no paid orders (their count is 0). Better
  // Auth names its columns in camelCase, so "createdAt" needs quotes.
  const { rows } = await pool.query(
    `SELECT "user".id, "user".name, "user".email, "user".image, "user".role,
            "user"."createdAt" AS created_at,
            count(orders.id)::int AS order_count,
            coalesce(sum(orders.total), 0) AS spent
     FROM "user"
     LEFT JOIN orders ON orders.user_id = "user".id AND orders.status = 'paid'
     GROUP BY "user".id
     ORDER BY "user"."createdAt" DESC`,
  )
  res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role,
      createdAt: row.created_at,
      orderCount: row.order_count,
      spent: Number(row.spent),
    })),
  )
})
