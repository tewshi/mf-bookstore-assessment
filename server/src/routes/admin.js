import { Router } from 'express'
import { pool } from '../lib/db.js'
import { requireAdmin } from '../lib/session.js'

// Mounted at /api/admin. Every route here is for admins only.
export const admin = Router()
admin.use(requireAdmin)

// Postgres error codes: "that would break a UNIQUE rule" (e.g. same ISBN),
// and "other rows still point at this one" (a REFERENCES rule)
const UNIQUE_VIOLATION = '23505'
const STILL_REFERENCED = '23503'

// GET /api/admin/orders: every order from everyone, newest first, with who
// placed it and a one-line summary of the books
admin.get('/orders', async (req, res) => {
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

// Checks a book from the admin form. Returns { book } with clean values,
// or { error } with a message to show.
function readBook(body) {
  const text = (name) => String(body[name] ?? '').trim()
  const book = {
    title: text('title'),
    author: text('author'),
    section: text('section'),
    isbn: text('isbn'),
    price: Number(body.price),
    image: text('image'),
    description: text('description'),
    format: text('format'),
    pages: Number(body.pages),
    published: Number(body.published),
    stock: Number(body.stock),
    // Empty boxes mean "not a staff pick"
    staffPickQuote: text('staffPickQuote') || null,
    staffPickBy: text('staffPickBy') || null,
  }
  const required = ['title', 'author', 'isbn', 'image', 'description', 'format']
  if (required.some((name) => !book[name])) return { error: 'Please fill in every field' }
  if (book.section !== 'Fiction' && book.section !== 'Nonfiction') {
    return { error: 'Section must be Fiction or Nonfiction' }
  }
  if (!(book.price > 0)) return { error: 'Price must be more than 0' }
  if (!Number.isInteger(book.pages) || book.pages < 1)
    return { error: 'Pages must be a whole number' }
  if (!Number.isInteger(book.published)) return { error: 'Published must be a year, e.g. 2026' }
  if (!Number.isInteger(book.stock) || book.stock < 0) return { error: 'Stock must be 0 or more' }
  if (!book.staffPickQuote !== !book.staffPickBy) {
    return { error: 'A staff pick needs both a quote and who picked it' }
  }
  return { book }
}

// The values in the same order as the columns in the SQL below
const bookValues = (book) => [
  book.title,
  book.author,
  book.section,
  book.isbn,
  book.price,
  book.image,
  book.description,
  book.format,
  book.pages,
  book.published,
  book.stock,
  book.staffPickQuote,
  book.staffPickBy,
]

// POST /api/admin/books: add a book. id is the slug used in links.
admin.post('/books', async (req, res) => {
  const { book, error } = readBook(req.body)
  if (error) return res.status(400).json({ error })
  const id = String(req.body.id ?? '').trim()
  if (!/^[a-z0-9-]+$/.test(id)) {
    return res
      .status(400)
      .json({ error: 'The id may only use a-z, 0-9 and dashes, e.g. slow-maps' })
  }
  try {
    await pool.query(
      `INSERT INTO books (title, author, section, isbn, price, image, description, format,
                          pages, published, stock, staff_pick_quote, staff_pick_by, id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [...bookValues(book), id],
    )
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'A book with that id or ISBN already exists' })
    }
    throw err
  }
  res.status(201).json({ id })
})

// PUT /api/admin/books/slow-maps: change a book (everything but its id)
admin.put('/books/:id', async (req, res) => {
  const { book, error } = readBook(req.body)
  if (error) return res.status(400).json({ error })
  try {
    const { rowCount } = await pool.query(
      `UPDATE books SET title = $1, author = $2, section = $3, isbn = $4, price = $5, image = $6,
         description = $7, format = $8, pages = $9, published = $10, stock = $11,
         staff_pick_quote = $12, staff_pick_by = $13
       WHERE id = $14`,
      [...bookValues(book), req.params.id],
    )
    if (rowCount === 0) return res.status(404).json({ error: 'Book not found' })
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'Another book already has that ISBN' })
    }
    throw err
  }
  res.json({ ok: true })
})

// DELETE /api/admin/books/test-book: remove a book nobody has ordered.
// Ordered books stay, because old orders and receipts point at them.
admin.delete('/books/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM books WHERE id = $1', [req.params.id])
    if (rowCount === 0) return res.status(404).json({ error: 'Book not found' })
  } catch (err) {
    if (err.code === STILL_REFERENCED) {
      return res.status(409).json({
        error:
          'This book has been ordered, so it stays for the order history. Set its stock to 0 instead.',
      })
    }
    throw err
  }
  res.json({ ok: true })
})

// GET /api/admin/events: every event, past ones too, newest first, with
// how many seats are taken
admin.get('/events', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT events.id, to_char(events.starts_at, 'YYYY-MM-DD"T"HH24:MI') AS datetime,
            events.label, events.title, events.text, events.seats,
            count(event_signups.user_id)::int AS taken,
            events.starts_at < localtimestamp AS past
     FROM events LEFT JOIN event_signups ON event_signups.event_id = events.id
     GROUP BY events.id
     ORDER BY events.starts_at DESC`,
  )
  res.json(rows)
})

// Checks an event from the admin form, like readBook
function readEvent(body) {
  const event = {
    datetime: String(body.datetime ?? ''),
    title: String(body.title ?? '').trim(),
    text: String(body.text ?? '').trim(),
    seats: Number(body.seats),
  }
  // <input type="datetime-local"> sends e.g. "2026-11-07T19:00"
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(event.datetime)) {
    return { error: 'Pick a date and time' }
  }
  if (!event.title || !event.text) return { error: 'Please fill in every field' }
  if (!Number.isInteger(event.seats) || event.seats < 1) return { error: 'Seats must be 1 or more' }
  return { event }
}

// The label shown on the site, e.g. "Sat 7 Nov, 19:00", made by Postgres
// from the date. Dy = short day name, FMDD = day without a leading zero.
const labelSql = `to_char($1::timestamp, 'Dy FMDD Mon, HH24:MI')`

// POST /api/admin/events: add an event
admin.post('/events', async (req, res) => {
  const { event, error } = readEvent(req.body)
  if (error) return res.status(400).json({ error })
  const id = String(req.body.id ?? '').trim()
  if (!/^[a-z0-9-]+$/.test(id)) {
    return res.status(400).json({ error: 'The id may only use a-z, 0-9 and dashes' })
  }
  try {
    await pool.query(
      `INSERT INTO events (starts_at, label, title, text, seats, id)
       VALUES ($1, ${labelSql}, $2, $3, $4, $5)`,
      [event.datetime, event.title, event.text, event.seats, id],
    )
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'An event with that id already exists' })
    }
    throw err
  }
  res.status(201).json({ id })
})

// PUT /api/admin/events/poetry-night: change an event. Seats can't go
// below the number already reserved.
admin.put('/events/:id', async (req, res) => {
  const { event, error } = readEvent(req.body)
  if (error) return res.status(400).json({ error })
  const { rows } = await pool.query(
    'SELECT count(*)::int AS taken FROM event_signups WHERE event_id = $1',
    [req.params.id],
  )
  if (event.seats < rows[0].taken) {
    return res.status(400).json({ error: `${rows[0].taken} people already have seats` })
  }
  const { rowCount } = await pool.query(
    `UPDATE events SET starts_at = $1, label = ${labelSql}, title = $2, text = $3, seats = $4
     WHERE id = $5`,
    [event.datetime, event.title, event.text, event.seats, req.params.id],
  )
  if (rowCount === 0) return res.status(404).json({ error: 'Event not found' })
  res.json({ ok: true })
})

// DELETE /api/admin/events/test-event: remove an event. Its seat
// reservations go with it (ON DELETE CASCADE in schema.sql).
admin.delete('/events/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM events WHERE id = $1', [req.params.id])
  if (rowCount === 0) return res.status(404).json({ error: 'Event not found' })
  res.json({ ok: true })
})
