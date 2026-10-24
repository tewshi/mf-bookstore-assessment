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

// The message when someone wants more copies than we have
function outOfStock(book) {
  return book.stock === 0
    ? `Sorry, "${book.title}" just sold out. Remove it from your cart to continue.`
    : `Sorry, only ${book.stock} of "${book.title}" left. Lower the quantity to continue.`
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
  const { rows: books } = await pool.query(
    'SELECT id, title, price, stock FROM books WHERE id = ANY($1)',
    [items.map((item) => item.bookId)],
  )
  const byId = Object.fromEntries(books.map((book) => [book.id, book]))
  const prices = Object.fromEntries(books.map((book) => [book.id, Number(book.price)]))
  for (const item of items) {
    const book = byId[item.bookId]
    if (!book || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return res.status(400).json({ error: 'Something in your cart is not in the shop any more' })
    }
    // Checked before "charging" the card, so nobody pays for books we don't have
    if (item.quantity > book.stock) {
      return res.status(409).json({ error: outOfStock(book) })
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

    // Take the books off the shelf. "AND stock >= $1" makes the update do
    // nothing if someone else bought the last copies a moment ago; then
    // rowCount is 0 and we undo everything with ROLLBACK.
    for (const item of items) {
      const { rowCount } = await client.query(
        'UPDATE books SET stock = stock - $1 WHERE id = $2 AND stock >= $1',
        [item.quantity, item.bookId],
      )
      if (rowCount === 0) {
        await client.query('ROLLBACK')
        return res.status(409).json({ error: outOfStock(byId[item.bookId]) })
      }
    }

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

// One person's orders, newest first, each with its books. With orderId,
// just that one order (still only if it is theirs). myRating is their
// review of each book, or null if none yet.
async function findOrders(userId, orderId = null) {
  const { rows } = await pool.query(
    `SELECT orders.id, orders.total, orders.card_last4, orders.created_at,
            order_items.book_id, order_items.quantity, order_items.price,
            books.title, books.author, books.image, reviews.rating AS my_rating
     FROM orders
     JOIN order_items ON order_items.order_id = orders.id
     JOIN books ON books.id = order_items.book_id
     LEFT JOIN reviews ON reviews.book_id = books.id AND reviews.user_id = orders.user_id
     WHERE orders.user_id = $1 AND ($2::int IS NULL OR orders.id = $2)
     ORDER BY orders.created_at DESC, books.title`,
    [userId, orderId],
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
  return list
}

// GET /api/orders: all of the signed-in person's orders
orders.get('/', async (req, res) => {
  res.json(await findOrders(req.user.id))
})

// GET /api/orders/12: one order, for the receipt. 404 if it doesn't exist
// or belongs to someone else (we don't say which).
orders.get('/:id', async (req, res) => {
  const orderId = Number.parseInt(req.params.id)
  const [order] = Number.isInteger(orderId) ? await findOrders(req.user.id, orderId) : []
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json(order)
})
