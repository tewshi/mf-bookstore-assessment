import { sendEmail } from './mail.js'

// The emails the shop sends, each as plain text and as simple HTML.
// They are sent from webhook.js (receipt, refund) and lib/auth.js
// (password reset).

// The address of the site, for links in the emails
const siteUrl = process.env.BETTER_AUTH_URL

// Names and titles come from people, so in HTML they must not be able to
// add tags of their own: "<" becomes "&lt;" and so on
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const euros = (amount) => `€${Number(amount).toFixed(2)}`

// The same frame around every email: the shop's name, the message, a button
function layout(body, buttonText, buttonUrl) {
  return `<div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #2b2522">
  <p style="font-size: 22px; font-weight: bold">Mayerfeld<span style="color: #c2410c">Books</span></p>
  ${body}
  <p style="margin: 28px 0">
    <a href="${buttonUrl}" style="background: #c2410c; color: #fff; padding: 12px 22px; border-radius: 999px; text-decoration: none">${buttonText}</a>
  </p>
  <p style="color: #6b625c; font-size: 13px">MayerfeldBooks, Example Street 12, 10999 Berlin</p>
</div>`
}

// After the webhook marks an order paid. items: [{ title, quantity, price }]
export function sendReceipt({ user, order, items }) {
  const receiptUrl = `${siteUrl}/order/${order.id}`
  const lines = items.map(
    (item) => `${item.title} × ${item.quantity}: ${euros(item.price * item.quantity)}`,
  )
  const rows = items
    .map(
      (item) => `<tr>
      <td style="padding: 6px 0">${escapeHtml(item.title)} × ${item.quantity}</td>
      <td style="padding: 6px 0; text-align: right">${euros(item.price * item.quantity)}</td>
    </tr>`,
    )
    .join('')

  return sendEmail({
    to: user.email,
    subject: `Your receipt for order #${order.id}`,
    text: [
      `Hi ${user.name},`,
      '',
      `Thank you for your order. Payment received for order #${order.id}:`,
      '',
      ...lines,
      `Total: ${euros(order.total)}`,
      '',
      `Your receipt: ${receiptUrl}`,
    ].join('\n'),
    html: layout(
      `<p>Hi ${escapeHtml(user.name)},</p>
  <p>Thank you for your order. Payment received for order #${order.id}:</p>
  <table style="width: 100%; border-collapse: collapse">${rows}
    <tr><td style="padding-top: 10px; border-top: 1px solid #ddd; font-weight: bold">Total</td>
    <td style="padding-top: 10px; border-top: 1px solid #ddd; text-align: right; font-weight: bold">${euros(order.total)}</td></tr>
  </table>`,
      'View your receipt',
      receiptUrl,
    ),
  })
}

// After refundOrder, from the admin page or the Stripe dashboard
export function sendRefundEmail({ user, order }) {
  const ordersUrl = `${siteUrl}/orders`
  const message = `Order #${order.id} has been refunded in full: ${euros(order.total)} is on its way back to your card. It can take 5 to 10 days to show up on your statement.`
  return sendEmail({
    to: user.email,
    subject: `Order #${order.id} has been refunded`,
    text: `Hi ${user.name},\n\n${message}\n\nYour orders: ${ordersUrl}`,
    html: layout(
      `<p>Hi ${escapeHtml(user.name)},</p>\n  <p>${message}</p>`,
      'See your orders',
      ordersUrl,
    ),
  })
}

// Better Auth makes the link (it holds a one-time token, valid for an hour)
export function sendPasswordReset({ user, url }) {
  const message =
    'Someone (hopefully you) asked to reset the password for your MayerfeldBooks account. The link works for one hour. If it wasn’t you, ignore this email: your password stays the same.'
  return sendEmail({
    to: user.email,
    subject: 'Reset your MayerfeldBooks password',
    text: `Hi ${user.name},\n\n${message}\n\nReset your password: ${url}`,
    html: layout(
      `<p>Hi ${escapeHtml(user.name)},</p>\n  <p>${message}</p>`,
      'Choose a new password',
      url,
    ),
  })
}
