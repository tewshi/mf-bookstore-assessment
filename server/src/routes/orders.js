import { Router } from 'express'
import { pool } from '../lib/db.js'
import { requireUser } from '../lib/session.js'
import { stripe } from '../lib/stripe.js'

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

// When Checkout is opened as /checkout/<id>, it sends that unpaid order's
// id along with the cart. If the cart is exactly what
// that unpaid order holds, we send them back to the same Stripe page
// instead of making a second order. Answers { id, url } to reuse it,
// { error } if it was paid in the meantime, or null to make a new order.
async function reuseOrder(userId, orderId, items) {
  const { rows } = await pool.query(
    `SELECT orders.stripe_session_id, order_items.book_id, order_items.quantity
     FROM orders JOIN order_items ON order_items.order_id = orders.id
     WHERE orders.id = $1 AND orders.user_id = $2 AND orders.status = 'pending'`,
    [orderId, userId],
  )
  if (rows.length === 0) return null

  const sessionId = rows[0].stripe_session_id
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  // Paid, and the webhook is on its way: don't let them pay twice
  if (session.status === 'complete') {
    return { error: 'This order is already paid. Stripe is still confirming it.' }
  }

  // The same books in the same quantities means the same order
  const sameCart =
    rows.length === items.length &&
    rows.every((row) =>
      items.some((item) => item.bookId === row.book_id && item.quantity === row.quantity),
    )
  if (sameCart && session.status === 'open') {
    return { id: orderId, url: session.url }
  }

  // The cart changed, so nobody will pay this order. Expire its session now:
  // Stripe then sends checkout.session.expired, and the webhook cancels the
  // order and puts its books back, without waiting the 30 minutes.
  if (session.status === 'open') {
    await stripe.checkout.sessions.expire(sessionId)
  }
  return null
}

// POST /api/orders with { items: [{ bookId, quantity }], orderId? }
// orderId is the unpaid order Checkout came back from, if any (see above).
// Saves a 'pending' order, takes its books off the shelf, and starts a
// Stripe Checkout Session for it. Answers { id, url }: url is Stripe's
// payment page, where the browser goes next. Nothing here marks the order
// paid; only the webhook (webhook.js) does that, once Stripe confirms it.
orders.post('/', async (req, res) => {
  const { items } = req.body
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' })
  }
  // The cart holds each book once, with a quantity. The same book twice
  // would break order_items' primary key (order_id, book_id) further down.
  if (new Set(items.map((item) => item.bookId)).size !== items.length) {
    return res.status(400).json({ error: 'Each book can only be in the order once' })
  }

  // Before the stock check: a reused order already holds its books
  const orderId = Number.parseInt(req.body.orderId)
  if (Number.isInteger(orderId)) {
    const reused = await reuseOrder(req.user.id, orderId, items)
    if (reused?.error) return res.status(409).json(reused)
    if (reused) return res.json(reused)
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
      success_url: `${siteUrl}/paid/${orderId}`,
      // Back (without paying) returns to Orders, where this order shows
      // "Pending payment" and a Pay now button
      cancel_url: `${siteUrl}/my-books`,
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

// POST /api/orders/12/pay: back to Stripe's page for an unpaid order, e.g.
// after the customer pressed Back there. Answers { url }. A Checkout Session
// stays open until it expires (30 minutes), so we ask Stripe for the same
// one again. This only reads from Stripe: the order's status still only
// changes in the webhook, and an expired session still cancels it there.
orders.post('/:id/pay', async (req, res) => {
  const orderId = Number.parseInt(req.params.id)
  const { rows } = await pool.query(
    `SELECT stripe_session_id FROM orders
     WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
    [Number.isInteger(orderId) ? orderId : null, req.user.id],
  )
  if (rows.length === 0) {
    return res.status(404).json({ error: 'There is no unpaid order with that number' })
  }

  const session = await stripe.checkout.sessions.retrieve(rows[0].stripe_session_id)
  if (session.status === 'open') {
    return res.json({ url: session.url })
  }
  // 'complete': paid, but the webhook hasn't arrived yet
  if (session.status === 'complete') {
    return res
      .status(409)
      .json({ error: 'This order is already paid. Stripe is still confirming it.' })
  }
  // 'expired': the webhook will cancel the order and put the books back
  res.status(409).json({ error: 'This payment link has expired. Add the books to your cart again.' })
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
