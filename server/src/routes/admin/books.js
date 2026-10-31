import { Router } from 'express'
import { pool } from '../../lib/db.js'
import { notifyEveryone } from '../../lib/live.js'

// Mounted at /api/admin/books (see ../admin.js, which checks for an admin first)
export const adminBooks = Router()

// Postgres error codes: "that would break a UNIQUE rule" (e.g. same ISBN),
// and "other rows still point at this one" (a REFERENCES rule)
const UNIQUE_VIOLATION = '23505'
const STILL_REFERENCED = '23503'

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
adminBooks.post('/', async (req, res) => {
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
  // Every book list on the site (and carts, for the stock) fetches again
  notifyEveryone('books')
  res.status(201).json({ id })
})

// PUT /api/admin/books/slow-maps: change a book (everything but its id)
adminBooks.put('/:id', async (req, res) => {
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
  notifyEveryone('books')
  res.json({ ok: true })
})

// DELETE /api/admin/books/test-book: remove a book nobody has ordered.
// Ordered books stay, because old orders and receipts point at them.
adminBooks.delete('/:id', async (req, res) => {
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
  notifyEveryone('books')
  res.json({ ok: true })
})
