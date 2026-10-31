import { beforeEach, describe, expect, test, vi } from 'vitest'

// What the emails say (lib/emails.js). sendEmail is swapped for a fake
// (vi.fn) that only records what it was given, so nothing is sent.
vi.mock('../src/lib/mail.js', () => ({ sendEmail: vi.fn() }))

const { sendEmail } = await import('../src/lib/mail.js')
const { sendPasswordReset, sendReceipt, sendRefundEmail } = await import('../src/lib/emails.js')

// The email the last call handed to sendEmail
const lastEmail = () => sendEmail.mock.calls.at(-1)[0]

beforeEach(() => sendEmail.mockClear())

describe('emails', () => {
  const user = { name: 'Ada', email: 'ada@example.com' }

  test('the receipt lists each book, the total and a link to the receipt page', () => {
    sendReceipt({
      user,
      order: { id: 12, total: '26.50' },
      items: [
        { title: 'Slow Maps', quantity: 1, price: '14.00' },
        { title: 'Borrowed Summers', quantity: 1, price: '12.50' },
      ],
    })
    const email = lastEmail()
    expect(email.to).toBe('ada@example.com')
    expect(email.subject).toBe('Your receipt for order #12')
    expect(email.text).toContain('Slow Maps × 1: €14.00')
    expect(email.text).toContain('Total: €26.50')
    expect(email.text).toContain('/order/12')
    expect(email.html).toContain('Borrowed Summers × 1')
  })

  test('the refund email says how much goes back', () => {
    sendRefundEmail({ user, order: { id: 12, total: '26.50' } })
    expect(lastEmail().subject).toBe('Order #12 has been refunded')
    expect(lastEmail().text).toContain('€26.50 is on its way back')
  })

  test('the reset email holds the link Better Auth made', () => {
    sendPasswordReset({ user, url: 'http://localhost:5173/api/auth/reset-password/abc' })
    expect(lastEmail().text).toContain('http://localhost:5173/api/auth/reset-password/abc')
    expect(lastEmail().html).toContain('href="http://localhost:5173/api/auth/reset-password/abc"')
  })

  test('names and titles cannot add HTML of their own', () => {
    sendReceipt({
      user: { name: '<b>Ada</b>', email: 'ada@example.com' },
      order: { id: 1, total: '5' },
      items: [{ title: '<script>alert(1)</script>', quantity: 1, price: '5' }],
    })
    const { html, text } = lastEmail()
    expect(html).not.toContain('<b>Ada</b>')
    expect(html).toContain('&lt;b&gt;Ada&lt;/b&gt;')
    expect(html).not.toContain('<script>')
    // Plain text isn't HTML, so it keeps the name as typed
    expect(text).toContain('Hi <b>Ada</b>,')
  })
})
