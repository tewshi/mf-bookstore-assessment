import { Router } from 'express'
import { pool } from '../lib/db.js'

// Mounted at /api/books
export const books = Router()

// Turns a books row (snake_case columns) into the shape the React app
// has always used, with staffPick as null or { quote, by }.
// rating is the average review (null if none), reviewCount how many.
// Exported for the tests.
export function toBook(row) {
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
    stock: row.stock,
    rating: row.rating === null ? null : Number(row.rating),
    reviewCount: row.review_count,
  }
}

// Every column of books, plus the average rating and number of reviews.
// LEFT JOIN keeps books that have no reviews yet. Used by both book routes.
const booksWithRatings = `
  SELECT books.*, round(avg(reviews.rating), 1) AS rating, count(reviews.id)::int AS review_count
  FROM books LEFT JOIN reviews ON reviews.book_id = books.id`

// The sort options the book grid offers. ORDER BY can't take a $1
// placeholder, so we only ever put one of these fixed strings into the SQL,
// never text from the request (that would allow SQL injection).
const sortOrders = {
  featured: 'books.section, books.title',
  'price-low': 'books.price, books.title',
  'price-high': 'books.price DESC, books.title',
  rating: 'rating DESC NULLS LAST, books.title',
  newest: 'books.published DESC, books.title',
}

// GET /api/books: every book, fiction first, then by title.
// GET /api/books?page=2&q=river&section=Fiction&sort=price-low: one page of
// books that match, as { books, total, page, perPage, pageCount }. q searches the
// title, author and ISBN (with or without dashes). 12 books per page.
books.get('/', async (req, res) => {
  if (!req.query.page) {
    const { rows } = await pool.query(
      `${booksWithRatings} GROUP BY books.id ORDER BY books.section, books.title`,
    )
    return res.json(rows.map(toBook))
  }

  const perPage = 12
  const page = Math.max(1, Number.parseInt(req.query.page) || 1)
  const q = String(req.query.q ?? '').trim()
  const section =
    req.query.section === 'Fiction' || req.query.section === 'Nonfiction' ? req.query.section : null
  const orderBy = sortOrders[req.query.sort] ?? sortOrders.featured

  // The same filter for the count and for the page. ILIKE is LIKE that
  // ignores upper/lower case, and % means "anything here".
  // "$1::text IS NULL" lets one query handle "no section chosen".
  const where = `
    WHERE ($1::text IS NULL OR books.section = $1)
      AND (books.title ILIKE $2 OR books.author ILIKE $2 OR replace(books.isbn, '-', '') LIKE $3)`
  const filters = [section, `%${q}%`, `%${q.replaceAll('-', '')}%`]

  // How many books match in total, to work out the number of pages
  const { rows: counted } = await pool.query(
    `SELECT count(*)::int AS total FROM books ${where}`,
    filters,
  )
  const total = counted[0].total

  // Just this page: OFFSET skips the books on earlier pages, LIMIT stops after 8
  const { rows } = await pool.query(
    `${booksWithRatings} ${where}
     GROUP BY books.id ORDER BY ${orderBy}
     LIMIT $4 OFFSET $5`,
    [...filters, perPage, (page - 1) * perPage],
  )
  res.json({
    books: rows.map(toBook),
    total,
    page,
    perPage,
    pageCount: Math.ceil(total / perPage),
  })
})

// GET /api/books/slow-maps: one book, or 404
books.get('/:id', async (req, res) => {
  const { rows } = await pool.query(`${booksWithRatings} WHERE books.id = $1 GROUP BY books.id`, [
    req.params.id,
  ])
  if (rows.length === 0) return res.status(404).json({ error: 'Book not found' })
  res.json(toBook(rows[0]))
})

// GET /api/books/slow-maps/recommendations: "readers who bought this also
// bought". Up to 4 books, the ones most of this book's buyers also bought
// first. Empty when nobody has bought the book yet.
books.get('/:id/recommendations', async (req, res) => {
  const { rows } = await pool.query(
    `-- 1. Everyone who has bought (and paid for) this book
     WITH buyers AS (
       SELECT DISTINCT orders.user_id
       FROM orders JOIN order_items ON order_items.order_id = orders.id
       WHERE order_items.book_id = $1 AND orders.status = 'paid'
     ),
     -- 2. The other books those people bought, and how many of them bought each
     also_bought AS (
       SELECT order_items.book_id, count(DISTINCT orders.user_id) AS readers
       FROM orders JOIN order_items ON order_items.order_id = orders.id
       WHERE orders.user_id IN (SELECT user_id FROM buyers) AND order_items.book_id <> $1
         AND orders.status = 'paid'
       GROUP BY order_items.book_id
     )
     -- 3. Those books in full (with ratings), most readers first
     ${booksWithRatings}
     JOIN also_bought ON also_bought.book_id = books.id
     GROUP BY books.id, also_bought.readers
     ORDER BY also_bought.readers DESC, books.title
     LIMIT 4`,
    [req.params.id],
  )
  res.json(rows.map(toBook))
})
