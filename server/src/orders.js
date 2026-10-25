import { Router } from 'express'
import { pool } from './db.js'
import { requireUser } from './session.js'
import { stripe } from './stripe.js'

// Mounted at /api/orders. Every route here needs someone signed in,
// so every order belongs to a real user.
export const orders = Router()
orders.use(requireUser)

// The address of the site, for Stripe's links back to us
const siteUrl = process.env.BETTER_AUTH_URL

// The message when someone wants more copies than we have
function outOfStock(book) {
  return book.stock === 0
    ? `Sorry, "${book.title}" just sold out. Remove it from your cart to continue.`
    : `Sorry, only ${book.stock} of "${book.title}" left. Lower the quantity to continue.`
}

// POST /api/orders with { items: [{ bookId, quantity }] }
// Saves a 'pending' order, takes its books off the shelf, and starts a
// Stripe Checkout Session for it. Answers { id, url }: url is Stripe's
// payment page, where the browser goes next. Nothing here marks the order
// paid; only the webhook (webhook.js) does that, once Stripe confirms it.
orders.post('/', async (req, res) => {
  const { items } = req.body
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
    // Checked before sending anyone to pay, so nobody pays for books we don't have
    if (item.quantity > book.stock) {
      return res.status(409).json({ error: outOfStock(book) })
    }
  }
  const total = items.reduce((sum, item) => sum + prices[item.bookId] * item.quantity, 0)

  // A transaction: the stock change, the order and its items are saved
  // together, or, if anything fails halfway (Stripe too), none of them are.
  // It needs one connection for every query, so we borrow one from the
  // pool and give it back after.
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Take the books off the shelf now, so they are kept for this customer
    // while they pay. If the payment fails or they never finish, the
    // webhook puts them back. "AND stock >= $1" makes the update do
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

    // status is 'pending' by default (see schema.sql)
    const { rows } = await client.query(
      'INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING id',
      [req.user.id, total],
    )
    const orderId = rows[0].id
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, book_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.bookId, item.quantity, prices[item.bookId]],
      )
    }

    // Ask Stripe for a payment page. Stripe counts money in cents, so
    // €14.00 is 1400; Math.round avoids 14.000000001-style float errors.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: req.user.email,
      line_items: items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(prices[item.bookId] * 100),
          product_data: { name: byId[item.bookId].title },
        },
      })),
      // Where Stripe sends the browser afterwards. BETTER_AUTH_URL is the
      // address of the site (Vite in dev, the Railway URL in production).
      success_url: `${siteUrl}/#paid/${orderId}`,
      cancel_url: `${siteUrl}/#checkout`,
      // Unpaid sessions expire after 30 minutes (the shortest Stripe allows).
      // Stripe then sends checkout.session.expired and the books go back.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    })

    // The webhook finds the order again by this id
    await client.query('UPDATE orders SET stripe_session_id = $1 WHERE id = $2', [
      session.id,
      orderId,
    ])
    await client.query('COMMIT')
    res.status(201).json({ id: orderId, url: session.url })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Checkout failed:', err.message)
    res.status(500).json({ error: 'Could not start the payment. Please try again.' })
  } finally {
    client.release()
  }
})

// One person's orders, newest first, each with its books: paid ones and
// pending ones (still waiting for Stripe), but not cancelled ones. With
// orderId, just that one order (still only if it is theirs), whatever its
// status, so the success page can watch a pending order turn paid.
// myRating is their review of each book, or null if none yet.
async function findOrders(userId, orderId = null) {
  const { rows } = await pool.query(
    `SELECT orders.id, orders.total, orders.status, orders.card_last4, orders.created_at, orders.paid_at,
            order_items.book_id, order_items.quantity, order_items.price,
            books.title, books.author, books.image, reviews.rating AS my_rating
     FROM orders
     JOIN order_items ON order_items.order_id = orders.id
     JOIN books ON books.id = order_items.book_id
     LEFT JOIN reviews ON reviews.book_id = books.id AND reviews.user_id = orders.user_id
     WHERE orders.user_id = $1
       AND (orders.id = $2 OR ($2::int IS NULL AND orders.status <> 'cancelled'))
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
        status: row.status,
        cardLast4: row.card_last4,
        createdAt: row.created_at,
        paidAt: row.paid_at,
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

// GET /api/orders: the signed-in person's paid and pending orders
orders.get('/', async (req, res) => {
  res.json(await findOrders(req.user.id))
})

// GET /api/orders/12: one order, for the receipt and the success page
// (which reads its status). 404 if it doesn't exist
// or belongs to someone else (we don't say which).
orders.get('/:id', async (req, res) => {
  const orderId = Number.parseInt(req.params.id)
  const [order] = Number.isInteger(orderId) ? await findOrders(req.user.id, orderId) : []
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json(order)
})
