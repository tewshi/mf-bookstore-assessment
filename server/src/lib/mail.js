import nodemailer from 'nodemailer'

// Sending email over SMTP with nodemailer. The four SMTP_ variables come
// from Mailtrap: its sandbox catches every email in an inbox on
// mailtrap.io instead of delivering it, so nothing reaches real people
// while we test.
//
// Unlike Stripe (lib/stripe.js), missing settings don't stop the server:
// emails are an extra, so without them we log what would have been sent.
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
const configured = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)

if (!configured) {
  console.warn('SMTP_HOST, SMTP_PORT, SMTP_USER or SMTP_PASS is not set: emails are only logged.')
}

// One connection setup, shared by every email (like the pg pool)
const transport = configured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      // Mailtrap starts every connection unencrypted and then switches to
      // TLS (STARTTLS), on every port, 465 too. nodemailer would expect TLS
      // from the first byte on 465, so we say which: secure only when
      // SMTP_SECURE=true (for providers that do want that). requireTLS
      // refuses to log in if the switch to TLS doesn't happen, so the
      // password is never sent unencrypted.
      secure: process.env.SMTP_SECURE === 'true',
      requireTLS: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null

// Who the emails are from. Mailtrap's sandbox accepts any address.
const from = 'MayerfeldBooks <shop@mayerfeld-books.test>'

// Send one email: { to, subject, text, html }. text is for mail apps that
// don't show HTML. A failed email is logged, never thrown: the payment,
// refund or reset request that caused it has already happened.
export async function sendEmail({ to, subject, text, html }) {
  if (!transport) {
    console.log(`Email not sent (no SMTP settings): "${subject}" to ${to}`)
    return
  }
  try {
    await transport.sendMail({ from, to, subject, text, html })
  } catch (err) {
    console.error(`Could not send "${subject}" to ${to}:`, err.message)
  }
}
