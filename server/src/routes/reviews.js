import { Router } from 'express'
import { pool } from '../lib/db.js'
import { currentUser, requireUser } from '../lib/session.js'

// Mounted at /api/books/:id/reviews (see api.js). mergeParams lets these
// routes read :id, which is part of the path above this router.
export const reviews = Router({ mergeParams: true })

// Has this person bought (and paid for) this book? Only buyers may review it.
async function hasBought(userId, bookId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM order_items JOIN orders ON orders.id = order_items.order_id
     WHERE orders.user_id = $1 AND order_items.book_id = $2 AND orders.status = 'paid' LIMIT 1`,
    [userId, bookId],
  )
  return rows.length > 0
}

// GET /api/books/slow-maps/reviews: newest first, with each reviewer's name.
// canReview says whether the person asking may write one (they bought it),
// and mine marks their own review, so the page can offer to edit it.
reviews.get('/', async (req, res) => {
  const user = await currentUser(req)
  const { rows } = await pool.query(
    `SELECT reviews.id, reviews.user_id, reviews.rating, reviews.text, reviews.created_at,
            "user".name
     FROM reviews JOIN "user" ON "user".id = reviews.user_id
     WHERE reviews.book_id = $1
     ORDER BY reviews.created_at DESC`,
    [req.params.id],
  )
  res.json({
    canReview: user ? await hasBought(user.id, req.params.id) : false,
    reviews: rows.map((row) => ({
      id: row.id,
      name: row.name,
      rating: row.rating,
      text: row.text,
      createdAt: row.created_at,
      mine: row.user_id === user?.id,
    })),
  })
})

// POST /api/books/slow-maps/reviews with { rating, text }. Writing a
// second review of the same book replaces the first one.
reviews.post('/', requireUser, async (req, res) => {
  const rating = req.body.rating
  const text = String(req.body.text ?? '').trim()
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Pick a rating from 1 to 5 stars' })
  }
  if (text.length === 0 || text.length > 2000) {
    return res.status(400).json({ error: 'Write a few words (up to 2000 characters)' })
  }
  if (!(await hasBought(req.user.id, req.params.id))) {
    return res.status(403).json({ error: 'You can review a book after you buy it' })
  }

  // ON CONFLICT: the UNIQUE (user_id, book_id) rule in schema.sql turns
  // a second review into an update of the first.
  await pool.query(
    `INSERT INTO reviews (user_id, book_id, rating, text) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, book_id)
     DO UPDATE SET rating = EXCLUDED.rating, text = EXCLUDED.text, created_at = now()`,
    [req.user.id, req.params.id, rating, text],
  )
  res.status(201).json({ ok: true })
})
