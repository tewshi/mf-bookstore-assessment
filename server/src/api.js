import { Router } from 'express'
import { pool } from './db.js'

export const api = Router()

// Turns a books row (snake_case columns) into the shape the React app
// has always used, with staffPick as null or { quote, by }.
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
  }
}

// GET /api/books: every book, fiction first, then by title
api.get('/books', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM books ORDER BY section, title')
  res.json(rows.map(toBook))
})

// GET /api/books/slow-maps: one book, or 404
api.get('/books/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM books WHERE id = $1', [req.params.id])
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
