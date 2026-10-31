import { pool } from './db.js'
import { notifyUser } from './live.js'

// In-app notifications: the messages under the bell in the header. Each
// one is a row in the notifications table (schema.sql). After saving,
// the people it is for get the live topic 'notifications' (live.js), so
// their bell updates without a reload, on every device they're signed in.

// Save one message for each of these people, e.g.
//   sendNotification([order.user_id], 'Payment received for order #12', '/order/12')
export async function sendNotification(userIds, text, link = null) {
  if (userIds.length === 0) return
  // The routes call this after their own work is saved. A notification is
  // a nice extra, so if it fails we log it instead of failing the payment
  // or the edit that caused it.
  try {
    // unnest turns the array of ids into one row per id, so this is one
    // INSERT however many people it is for
    await pool.query(
      `INSERT INTO notifications (user_id, text, link)
       SELECT unnest($1::text[]), $2, $3`,
      [userIds, text, link],
    )
  } catch (err) {
    console.error('Could not save a notification:', err.message)
    return
  }
  for (const userId of new Set(userIds)) {
    notifyUser('notifications', userId)
  }
}

// The same message for every admin
export async function sendToAdmins(text, link = null) {
  const { rows } = await pool.query(`SELECT id FROM "user" WHERE role = 'admin'`)
  await sendNotification(
    rows.map((row) => row.id),
    text,
    link,
  )
}

// Books that were sold out and now have copies again: tell everyone who
// has them on their wishlist. books is [{ id, title }].
export async function sendBackInStock(books) {
  for (const book of books) {
    const { rows } = await pool.query('SELECT user_id FROM wishlist WHERE book_id = $1', [book.id])
    await sendNotification(
      rows.map((row) => row.user_id),
      `"${book.title}" from your wishlist is back in stock.`,
      `/book/${book.id}`,
    )
  }
}
