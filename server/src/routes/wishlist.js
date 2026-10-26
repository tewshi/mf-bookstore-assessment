import { Router } from 'express'
import { pool } from '../lib/db.js'
import { requireUser } from '../lib/session.js'

// Mounted at /api/wishlist: the books the signed-in person saved for later
export const wishlist = Router()
wishlist.use(requireUser)

// GET /api/wishlist: the saved book ids, newest first, e.g. ['slow-maps'].
// Just the ids: the React app already has every book's details.
wishlist.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT book_id FROM wishlist WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id],
  )
  res.json(rows.map((row) => row.book_id))
})

// PUT /api/wishlist/slow-maps: save a book. PUT because doing it twice is
// the same as doing it once; ON CONFLICT DO NOTHING ignores the second time.
// The SELECT ... FROM books only inserts if the book really exists.
wishlist.put('/:bookId', async (req, res) => {
  await pool.query(
    `INSERT INTO wishlist (user_id, book_id)
     SELECT $1, id FROM books WHERE id = $2
     ON CONFLICT DO NOTHING`,
    [req.user.id, req.params.bookId],
  )
  res.json({ ok: true })
})

// DELETE /api/wishlist/slow-maps: un-save a book
wishlist.delete('/:bookId', async (req, res) => {
  await pool.query('DELETE FROM wishlist WHERE user_id = $1 AND book_id = $2', [
    req.user.id,
    req.params.bookId,
  ])
  res.json({ ok: true })
})
