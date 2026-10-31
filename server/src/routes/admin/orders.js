import { Router } from 'express'
import { pool } from '../../lib/db.js'
import { stripe } from '../../lib/stripe.js'
import { refundOrder } from '../webhook.js'

// Mounted at /api/admin/orders (see ../admin.js, which checks for an admin first)
export const adminOrders = Router()

// GET /api/admin/orders: every order from everyone, newest first, with who
// placed it and a one-line summary of the books
adminOrders.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT orders.id, orders.total, orders.status, orders.card_last4, orders.created_at,
            orders.refunded_at, orders.stripe_session_id IS NOT NULL AS via_stripe,
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
      refundedAt: row.refunded_at,
      // The old demo orders weren't paid through Stripe: nothing to refund
      refundable: row.status === 'paid' && row.via_stripe,
      name: row.name,
      email: row.email,
      bookCount: row.book_count,
      summary: row.summary,
    })),
  )
})

// POST /api/admin/orders/12/refund: give a paid order's money back, in
// full, and put its books back on the shelf. Stripe makes the refund;
// refundOrder (in webhook.js, with the other status changes) then marks
// the order refunded. Stripe also sends charge.refunded for it, which
// finds the order already refunded and changes nothing.
adminOrders.post('/:id/refund', async (req, res) => {
  // Order ids are numbers; anything else can't be one (and would make
  // Postgres complain about the type)
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Order not found' })
  const { rows } = await pool.query('SELECT status, stripe_session_id FROM orders WHERE id = $1', [
    req.params.id,
  ])
  const order = rows[0]
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.status !== 'paid') {
    return res
      .status(409)
      .json({ error: `Only paid orders can be refunded (this one is ${order.status})` })
  }
  if (!order.stripe_session_id) {
    return res
      .status(409)
      .json({ error: "This demo order wasn't paid through Stripe, so there is nothing to refund" })
  }

  // The refund is made on the payment (payment_intent), which the
  // checkout session knows
  const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
  try {
    await stripe.refunds.create({ payment_intent: session.payment_intent })
  } catch (err) {
    // Already refunded in the Stripe dashboard: fine, mark it refunded here
    // too. Anything else: tell the admin what Stripe said.
    if (err.code !== 'charge_already_refunded') {
      return res.status(502).json({ error: `Stripe refused the refund: ${err.message}` })
    }
  }
  await refundOrder(order.stripe_session_id)
  res.json({ ok: true })
})
