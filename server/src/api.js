import { Router } from 'express'
import { pool } from './db.js'
import { currentUser, requireUser } from './session.js'
import { orders } from './orders.js'

export const api = Router()

// /api/orders lives in its own file, orders.js
api.use('/orders', orders)

// Turns a books row (snake_case columns) into the shape the React app
// has always used, with staffPick as null or { quote, by }.
// rating is the average review (null if none), reviewCount how many.
function toBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    section: row.section,
    isbn: row.isbn,
    // Postgres numeric comes back as a string, e.g. "14.00"
    price: Number(row.price),
    image: row.image,
    description: row.description,
    format: row.format,
    pages: row.pages,
    published: row.published,
    staffPick: row.staff_pick_quote ? { quote: row.staff_pick_quote, by: row.staff_pick_by } : null,
    rating: row.rating === null ? null : Number(row.rating),
    reviewCount: row.review_count,
  }
}

// Every column of books, plus the average rating and number of reviews.
// LEFT JOIN keeps books that have no reviews yet. Used by both book routes.
const booksWithRatings = `
  SELECT books.*, round(avg(reviews.rating), 1) AS rating, count(reviews.id)::int AS review_count
  FROM books LEFT JOIN reviews ON reviews.book_id = books.id`

// GET /api/books: every book, fiction first, then by title
api.get('/books', async (req, res) => {
  const { rows } = await pool.query(
    `${booksWithRatings} GROUP BY books.id ORDER BY books.section, books.title`,
  )
  res.json(rows.map(toBook))
})

// GET /api/books/slow-maps: one book, or 404
api.get('/books/:id', async (req, res) => {
  const { rows } = await pool.query(`${booksWithRatings} WHERE books.id = $1 GROUP BY books.id`, [
    req.params.id,
  ])
  if (rows.length === 0) return res.status(404).json({ error: 'Book not found' })
  res.json(toBook(rows[0]))
})

// GET /api/events: soonest first. to_char gives back the
// "2026-10-15T19:00" text the <time> tag expects.
api.get('/events', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, to_char(starts_at, 'YYYY-MM-DD"T"HH24:MI') AS datetime, label, title, text
     FROM events ORDER BY starts_at`,
  )
  res.json(rows)
})

// Has this person bought this book? Only buyers may review it.
async function hasBought(userId, bookId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM order_items JOIN orders ON orders.id = order_items.order_id
     WHERE orders.user_id = $1 AND order_items.book_id = $2 LIMIT 1`,
    [userId, bookId],
  )
  return rows.length > 0
}

// GET /api/books/slow-maps/reviews: newest first, with each reviewer's name.
// canReview says whether the person asking may write one (they bought it),
// and mine marks their own review, so the page can offer to edit it.
api.get('/books/:id/reviews', async (req, res) => {
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
api.post('/books/:id/reviews', requireUser, async (req, res) => {
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
