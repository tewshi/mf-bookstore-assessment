import { beforeEach, describe, expect, test, vi } from 'vitest'

// The Stripe webhook (routes/webhook.js), without Stripe or a database.
// Each vi.mock swaps a module for a fake whose answers each test sets up,
// and whose calls the test can check afterwards.
vi.mock('../src/lib/stripe.js', () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    checkout: { sessions: { list: vi.fn() } },
  },
}))
// client is what pool.connect() hands out, for the transactions
const client = { query: vi.fn(), release: vi.fn() }
vi.mock('../src/lib/db.js', () => ({
  pool: { query: vi.fn(), connect: async () => client },
}))
vi.mock('../src/lib/notifications.js', () => ({
  sendNotification: vi.fn(),
  sendToAdmins: vi.fn(),
  sendBackInStock: vi.fn(),
}))
vi.mock('../src/lib/emails.js', () => ({ sendReceipt: vi.fn(), sendRefundEmail: vi.fn() }))
vi.mock('../src/lib/live.js', () => ({ notifyEveryone: vi.fn(), notifyUserAndAdmins: vi.fn() }))

const { stripe } = await import('../src/lib/stripe.js')
const { pool } = await import('../src/lib/db.js')
const { sendNotification, sendToAdmins } = await import('../src/lib/notifications.js')
const { sendReceipt, sendRefundEmail } = await import('../src/lib/emails.js')
const { stripeWebhook } = await import('../src/routes/webhook.js')

// Calls the webhook with this Stripe event, as if it arrived signed.
// Returns what it answered: { status, body }.
async function deliver(event) {
  stripe.webhooks.constructEvent.mockReturnValue(event)
  const answer = { status: 200 }
  const res = {
    status(code) {
      answer.status = code
      return res
    },
    json(body) {
      answer.body = body
    },
  }
  await stripeWebhook({ body: Buffer.from('{}'), headers: { 'stripe-signature': 't=1' } }, res)
  return answer
}

// Every SQL statement a test ran, from both the pool and the transaction
const sqlRun = () => [...pool.query.mock.calls, ...client.query.mock.calls].map((call) => call[0])

const paidOrder = { id: 12, user_id: 'ada', total: '26.50', name: 'Ada', email: 'ada@example.com' }

beforeEach(() => {
  vi.clearAllMocks()
  pool.query.mockResolvedValue({ rows: [] })
  client.query.mockResolvedValue({ rows: [] })
})

describe('Stripe webhook', () => {
  test('refuses a request without a valid signature, before touching the database', async () => {
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('No signatures found')
    })
    const res = { status: vi.fn(() => res), json: vi.fn() }
    await stripeWebhook({ body: Buffer.from('{}'), headers: {} }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(pool.query).not.toHaveBeenCalled()
  })

  test('a completed card payment marks the order paid, notifies and emails a receipt', async () => {
    // First query: the UPDATE that marks it paid. Second: its books.
    pool.query
      .mockResolvedValueOnce({ rows: [paidOrder] })
      .mockResolvedValueOnce({ rows: [{ title: 'Slow Maps', quantity: 1, price: '14.00' }] })

    const answer = await deliver({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'paid' } },
    })

    expect(answer).toEqual({ status: 200, body: { received: true } })
    expect(pool.query.mock.calls[0][0]).toContain("status = 'paid'")
    expect(pool.query.mock.calls[0][1]).toEqual(['cs_test_1'])
    expect(sendNotification).toHaveBeenCalledWith(
      ['ada'],
      expect.stringContaining('Payment received for order #12'),
      '/order/12',
    )
    expect(sendToAdmins).toHaveBeenCalledWith('New order #12 from Ada, €26.50.', '/admin/orders')
    expect(sendReceipt).toHaveBeenCalledOnce()
  })

  test('a completed session that is not paid yet (bank debit) changes nothing', async () => {
    await deliver({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'unpaid' } },
    })
    expect(pool.query).not.toHaveBeenCalled()
  })

  test('the same event twice: the second finds nothing pending, so nobody is told again', async () => {
    // The UPDATE ... AND status = 'pending' matches no rows
    await deliver({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'paid' } },
    })
    expect(sendNotification).not.toHaveBeenCalled()
    expect(sendReceipt).not.toHaveBeenCalled()
  })

  test('a partial refund from the dashboard is ignored', async () => {
    await deliver({ type: 'charge.refunded', data: { object: { refunded: false } } })
    expect(stripe.checkout.sessions.list).not.toHaveBeenCalled()
    expect(sqlRun()).toEqual([])
  })

  test('a full refund finds the order through its checkout session and refunds it', async () => {
    stripe.checkout.sessions.list.mockResolvedValue({ data: [{ id: 'cs_test_1' }] })
    // The transaction: BEGIN, the UPDATE to 'refunded', putting books back, COMMIT
    client.query.mockImplementation(async (sql) =>
      sql.includes("status = 'refunded'") ? { rows: [paidOrder] } : { rows: [] },
    )

    await deliver({
      type: 'charge.refunded',
      data: { object: { refunded: true, payment_intent: 'pi_1' } },
    })

    expect(stripe.checkout.sessions.list).toHaveBeenCalledWith({
      payment_intent: 'pi_1',
      limit: 1,
    })
    const sql = sqlRun()
    expect(sql[0]).toBe('BEGIN')
    expect(sql.some((s) => s.includes('UPDATE books SET stock = books.stock +'))).toBe(true)
    expect(sql).toContain('COMMIT')
    expect(sendRefundEmail).toHaveBeenCalledWith({ user: paidOrder, order: paidOrder })
  })
})
