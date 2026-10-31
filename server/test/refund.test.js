import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import express from 'express'

// POST /api/admin/orders/:id/refund (routes/admin/orders.js). The router
// runs in a small Express app of its own, on a free port, and the test
// calls it with fetch(), like the browser would. The database, Stripe and
// refundOrder are fakes. (requireAdmin is in admin.js, which isn't used
// here: these tests are about the refund itself.)
vi.mock('../src/lib/db.js', () => ({ pool: { query: vi.fn() } }))
vi.mock('../src/lib/stripe.js', () => ({
  stripe: {
    checkout: { sessions: { retrieve: vi.fn() } },
    refunds: { create: vi.fn() },
  },
}))
vi.mock('../src/routes/webhook.js', () => ({ refundOrder: vi.fn() }))

const { pool } = await import('../src/lib/db.js')
const { stripe } = await import('../src/lib/stripe.js')
const { refundOrder } = await import('../src/routes/webhook.js')
const { adminOrders } = await import('../src/routes/admin/orders.js')

let server
let baseUrl

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/orders', adminOrders)
  // Port 0: the system picks a free one
  await new Promise((resolve) => {
    server = app.listen(0, resolve)
  })
  baseUrl = `http://localhost:${server.address().port}`
})

afterAll(() => server.close())

beforeEach(() => {
  vi.clearAllMocks()
  stripe.checkout.sessions.retrieve.mockResolvedValue({ payment_intent: 'pi_1' })
  stripe.refunds.create.mockResolvedValue({ status: 'succeeded' })
})

// Answers { status, body } for a refund of this order id
async function refund(id) {
  const response = await fetch(`${baseUrl}/orders/${id}/refund`, { method: 'POST' })
  return { status: response.status, body: await response.json() }
}

// The order the SELECT finds
const orderIs = (order) => pool.query.mockResolvedValue({ rows: order ? [order] : [] })

describe('refund route', () => {
  test('refunds a paid Stripe order in full, then marks it refunded', async () => {
    orderIs({ status: 'paid', stripe_session_id: 'cs_test_1' })
    expect(await refund(12)).toEqual({ status: 200, body: { ok: true } })
    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1' })
    expect(refundOrder).toHaveBeenCalledWith('cs_test_1')
  })

  test('an order id that is not a number is not found (and never reaches Postgres)', async () => {
    expect((await refund('abc')).status).toBe(404)
    expect(pool.query).not.toHaveBeenCalled()
  })

  test('an order that does not exist is not found', async () => {
    orderIs(null)
    expect((await refund(999)).status).toBe(404)
  })

  test('only paid orders can be refunded', async () => {
    orderIs({ status: 'refunded', stripe_session_id: 'cs_test_1' })
    const { status, body } = await refund(12)
    expect(status).toBe(409)
    expect(body.error).toContain('this one is refunded')
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  test('old demo orders, not paid through Stripe, cannot be refunded', async () => {
    orderIs({ status: 'paid', stripe_session_id: null })
    expect((await refund(5)).status).toBe(409)
    expect(stripe.refunds.create).not.toHaveBeenCalled()
  })

  test('already refunded in the Stripe dashboard: marked refunded here too', async () => {
    orderIs({ status: 'paid', stripe_session_id: 'cs_test_1' })
    stripe.refunds.create.mockRejectedValue(
      Object.assign(new Error('Charge has already been refunded.'), {
        code: 'charge_already_refunded',
      }),
    )
    expect((await refund(12)).status).toBe(200)
    expect(refundOrder).toHaveBeenCalledWith('cs_test_1')
  })

  test('Stripe says no: the admin sees why, and the order stays paid', async () => {
    orderIs({ status: 'paid', stripe_session_id: 'cs_test_1' })
    stripe.refunds.create.mockRejectedValue(new Error('Your card balance is too low'))
    const { status, body } = await refund(12)
    expect(status).toBe(502)
    expect(body.error).toBe('Stripe refused the refund: Your card balance is too low')
    expect(refundOrder).not.toHaveBeenCalled()
  })
})
