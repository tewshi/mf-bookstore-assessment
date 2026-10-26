import Stripe from 'stripe'

for (const name of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET_KEY']) {
  if (!process.env[name]) {
    throw new Error(`${name} is not set. Add it to server/.env, or as a Railway variable.`)
  }
}

// One Stripe client for the whole server. The secret key (sk_test_...)
// is test mode, so payments use test cards and no real money moves.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
