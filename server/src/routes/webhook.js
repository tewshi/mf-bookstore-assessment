import { pool } from '../lib/db.js'
import { stripe } from '../lib/stripe.js'
import { notifyEveryone, notifyUserAndAdmins } from '../lib/live.js'
import { sendBackInStock, sendNotification, sendToAdmins } from '../lib/notifications.js'
import { sendReceipt, sendRefundEmail } from '../lib/emails.js'

// POST /api/webhooks/stripe: Stripe calls this when something happens to
// a checkout session or a payment. Every change of an order's status after
// checkout is in this file: paid, cancelled and refunded. (The admin's
// Refund button asks Stripe for the refund, then calls refundOrder below.)
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

  // For the checkout.session events, data.object is the checkout session
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

  // A refund, from our admin page or straight from the Stripe dashboard.
  // Here data.object is the charge (the card payment), not the session.
  // charge.refunded is true only once all of it is refunded; we only do
  // full refunds, so a partial one from the dashboard changes nothing here.
  if (event.type === 'charge.refunded' && event.data.object.refunded) {
    // We save the session's id, not the payment's, so ask Stripe which
    // checkout session this payment belongs to
    const { data } = await stripe.checkout.sessions.list({
      payment_intent: event.data.object.payment_intent,
      limit: 1,
    })
    if (data.length > 0) await refundOrder(data[0].id)
  }

  // Any 2xx answer tells Stripe we got it. Otherwise it retries for days.
  res.json({ received: true })
}

// "AND status = 'pending'" (or 'paid' for refunds) in every function:
// Stripe can send the same event more than once, and the second time this
// changes nothing. The admin's Refund button and the charge.refunded
// event both call refundOrder, and only the first one counts.

async function markPaid(sessionId) {
  // UPDATE ... FROM "user": RETURNING can then also give the buyer's name
  // (for the admins' notification) and email (for the receipt)
  const { rows } = await pool.query(
    `UPDATE orders SET status = 'paid', paid_at = now()
     FROM "user"
     WHERE orders.stripe_session_id = $1 AND orders.status = 'pending'
       AND "user".id = orders.user_id
     RETURNING orders.id, orders.user_id, orders.total, "user".name, "user".email`,
    [sessionId],
  )
  // Only when something changed (not for a repeated event)
  if (rows.length === 0) return
  const order = rows[0]
  const total = `€${Number(order.total).toFixed(2)}`

  // Live: the buyer's tabs and the admins. 'books' to everyone too: the
  // recommendations under each book count paid orders.
  notifyUserAndAdmins('orders', order.user_id)
  notifyEveryone('books')

  await sendNotification(
    [order.user_id],
    `Payment received for order #${order.id} (${total}). Thank you!`,
    `/order/${order.id}`,
  )
  await sendToAdmins(`New order #${order.id} from ${order.name}, ${total}.`, '/admin/orders')

  // The receipt by email, with the books in it. Not awaited: Stripe waits
  // for our answer, and an email can take a few seconds. sendEmail logs
  // it if it fails.
  const { rows: items } = await pool.query(
    `SELECT books.title, order_items.quantity, order_items.price
     FROM order_items JOIN books ON books.id = order_items.book_id
     WHERE order_items.order_id = $1 ORDER BY books.title`,
    [order.id],
  )
  void sendReceipt({ user: order, order, items })
}

// Adds an order's books back to the shelf, inside the caller's
// transaction (client). Returns the books that were sold out before, so
// the people who wished for them can be told.
async function putBooksBack(client, orderId) {
  // UPDATE ... FROM: add each order item's quantity back to its book.
  // RETURNING gives the new stock; minus the quantity is the old one.
  const { rows } = await client.query(
    `UPDATE books SET stock = books.stock + order_items.quantity
     FROM order_items
     WHERE order_items.order_id = $1 AND order_items.book_id = books.id
     RETURNING books.id, books.title, books.stock - order_items.quantity AS stock_before`,
    [orderId],
  )
  return rows.filter((book) => book.stock_before === 0)
}

// Cancels the order and puts its books back on the shelf, in one transaction
async function cancelOrder(sessionId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE orders SET status = 'cancelled'
       WHERE stripe_session_id = $1 AND status = 'pending' RETURNING id, user_id`,
      [sessionId],
    )
    const backInStock = rows.length > 0 ? await putBooksBack(client, rows[0].id) : []
    await client.query('COMMIT')
    if (rows.length === 0) return
    const order = rows[0]

    // After COMMIT, so the tabs that fetch again see the new rows
    notifyUserAndAdmins('orders', order.user_id)
    notifyEveryone('books')
    await sendNotification(
      [order.user_id],
      `Order #${order.id} was cancelled: it wasn't paid in time, or the payment failed.`,
      '/orders',
    )
    await sendBackInStock(backInStock)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// Marks a paid order refunded and puts its books back, in one transaction.
// Only call it once Stripe has made the refund. Exported for the admin's
// Refund button (routes/admin/orders.js).
export async function refundOrder(sessionId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // FROM "user": the buyer's name and email too, for the email below
    const { rows } = await client.query(
      `UPDATE orders SET status = 'refunded', refunded_at = now()
       FROM "user"
       WHERE orders.stripe_session_id = $1 AND orders.status = 'paid'
         AND "user".id = orders.user_id
       RETURNING orders.id, orders.user_id, orders.total, "user".name, "user".email`,
      [sessionId],
    )
    const backInStock = rows.length > 0 ? await putBooksBack(client, rows[0].id) : []
    await client.query('COMMIT')
    if (rows.length === 0) return
    const order = rows[0]

    notifyUserAndAdmins('orders', order.user_id)
    notifyEveryone('books')
    await sendNotification(
      [order.user_id],
      `Order #${order.id} was refunded: €${Number(order.total).toFixed(2)} is on its way back to your card.`,
      '/orders',
    )
    await sendBackInStock(backInStock)
    // Not awaited, like the receipt
    void sendRefundEmail({ user: order, order })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
