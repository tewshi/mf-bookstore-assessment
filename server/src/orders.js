import { Router } from 'express'
import { pool } from './db.js'
import { requireUser } from './session.js'

// Mounted at /api/orders. Every route here needs someone signed in.
export const orders = Router()
orders.use(requireUser)

// Pretend card payments: there is no real payment provider. Only these
// test numbers (the same ones Stripe uses) are accepted, so nobody can
// type a real card into the demo by mistake.
const testCards = {
  '4242424242424242': 'approved',
  '4000000000000002': 'declined',
}

// POST /api/orders with { items: [{ bookId, quantity }], cardNumber }
// "Charges" the card, then saves the order. Answers { id, total }.
orders.post('/', async (req, res) => {
  const { items, cardNumber } = req.body

  // People type card numbers with spaces, so keep only the digits
  const digits = String(cardNumber ?? '').replace(/\D/g, '')
  const outcome = testCards[digits]
  if (!outcome) {
    return res
      .status(400)
      .json({ error: 'This is a demo shop. Use test card 4242 4242 4242 4242.' })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' })
  }

  // Prices come from the database, not from the browser,
  // so nobody can change what they pay by editing the request.
  const { rows: books } = await pool.query('SELECT id, price FROM books WHERE id = ANY($1)', [
    items.map((item) => item.bookId),
  ])
  const prices = Object.fromEntries(books.map((book) => [book.id, Number(book.price)]))
  for (const item of items) {
    if (!(item.bookId in prices) || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return res.status(400).json({ error: 'Something in your cart is not in the shop any more' })
    }
  }
  const total = items.reduce((sum, item) => sum + prices[item.bookId] * item.quantity, 0)

  // Wait a moment, as a real payment would, so the demo shows "Processing..."
  await new Promise((resolve) => setTimeout(resolve, 1500))
  if (outcome === 'declined') {
    return res.status(402).json({ error: 'Your card was declined. Try the other test card.' })
  }

  // A transaction: the order and all of its items are saved together, or,
  // if anything fails halfway, none of them are. It needs one connection
  // for every query, so we borrow one from the pool and give it back after.
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      'INSERT INTO orders (user_id, total, card_last4) VALUES ($1, $2, $3) RETURNING id',
      [req.user.id, total, digits.slice(-4)],
    )
    const orderId = rows[0].id
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, book_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.bookId, item.quantity, prices[item.bookId]],
      )
    }
    await client.query('COMMIT')
    res.status(201).json({ id: orderId, total })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// GET /api/orders: the signed-in person's orders, newest first, each with
// its books. myRating is their review of that book, or null if none yet.
orders.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT orders.id, orders.total, orders.card_last4, orders.created_at,
            order_items.book_id, order_items.quantity, order_items.price,
            books.title, books.author, books.image, reviews.rating AS my_rating
     FROM orders
     JOIN order_items ON order_items.order_id = orders.id
     JOIN books ON books.id = order_items.book_id
     LEFT JOIN reviews ON reviews.book_id = books.id AND reviews.user_id = orders.user_id
     WHERE orders.user_id = $1
     ORDER BY orders.created_at DESC, books.title`,
    [req.user.id],
  )

  // The query gives one row per book. Group them back into orders.
  const list = []
  for (const row of rows) {
    let order = list.find((o) => o.id === row.id)
    if (!order) {
      order = {
        id: row.id,
        total: Number(row.total),
        cardLast4: row.card_last4,
        createdAt: row.created_at,
        items: [],
      }
      list.push(order)
    }
    order.items.push({
      bookId: row.book_id,
      title: row.title,
      author: row.author,
      image: row.image,
      quantity: row.quantity,
      price: Number(row.price),
      myRating: row.my_rating,
    })
  }
  res.json(list)
})
