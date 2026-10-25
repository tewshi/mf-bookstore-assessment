import { pool } from './db.js'
import { stripe } from './stripe.js'

// POST /api/webhooks/stripe: Stripe calls this when something happens to
// a checkout session. It is the only code that marks an order paid.
// index.js mounts it with express.raw(), before express.json(), because
// the signature check needs the body exactly as Stripe sent it.
export async function stripeWebhook(req, res) {
  // Anyone could POST to this URL. The stripe-signature header proves the
  // request came from Stripe: it is signed with STRIPE_WEBHOOK_SECRET_KEY,
  // which only we and Stripe know. constructEvent throws if it doesn't match.
  let event
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET_KEY,
    )
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature check failed: ${err.message}` })
  }

  // For all four events, data.object is the checkout session
  const session = event.data.object

  // A card payment is 'paid' as soon as the session completes. Slower
  // methods (bank debits) complete as 'unpaid' and send
  // async_payment_succeeded later, when the money arrives.
  if (
    (event.type === 'checkout.session.completed' && session.payment_status === 'paid') ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    await markPaid(session.id)
  }

  // The payment failed, or the customer left and the session ran out
  if (
    event.type === 'checkout.session.async_payment_failed' ||
    event.type === 'checkout.session.expired'
  ) {
    await cancelOrder(session.id)
  }

  // Any 2xx answer tells Stripe we got it. Otherwise it retries for days.
  res.json({ received: true })
}

// "AND status = 'pending'" in both functions: Stripe can send the same
// event more than once, and the second time this changes nothing.

async function markPaid(sessionId) {
  await pool.query(
    `UPDATE orders SET status = 'paid', paid_at = now()
     WHERE stripe_session_id = $1 AND status = 'pending'`,
    [sessionId],
  )
}

// Cancels the order and puts its books back on the shelf, in one transaction
async function cancelOrder(sessionId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE orders SET status = 'cancelled'
       WHERE stripe_session_id = $1 AND status = 'pending' RETURNING id`,
      [sessionId],
    )
    if (rows.length > 0) {
      // UPDATE ... FROM: add each order item's quantity back to its book
      await client.query(
        `UPDATE books SET stock = books.stock + order_items.quantity
         FROM order_items
         WHERE order_items.order_id = $1 AND order_items.book_id = books.id`,
        [rows[0].id],
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
