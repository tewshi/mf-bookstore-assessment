import { useEffect, useState } from 'react'
import { authClient } from '../lib/auth'
import { getJson } from '../lib/api'
import { PrintIcon } from '../components/ui/Icons'

// The /order/<id> page: a receipt for one order, with a Print button.
// The header and footer have print:hidden, so only the receipt is printed.
export function Receipt({ orderId }) {
  const { data: session, isPending } = authClient.useSession()
  const userId = session?.user.id
  // The order from the API, or 'missing' if it isn't there (or isn't ours)
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (!userId) return
    getJson(`/api/orders/${orderId}`).then(setOrder, () => setOrder('missing'))
  }, [orderId, userId])

  if (isPending || (userId && !order)) {
    return <p className="mx-auto max-w-page px-4 py-16 text-muted">Loading…</p>
  }

  // Only paid orders have a receipt. A pending or cancelled one is
  // treated like a missing one.
  if (!session || order === 'missing' || order.status !== 'paid') {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-2 text-3xl font-bold">Receipt not found</h1>
        <p className="mb-8 text-muted">
          {session
            ? 'There is no order with that number in your account.'
            : 'Sign in to see your receipts.'}
        </p>
        <a
          href={session ? '/my-books' : '/signin/my-books'}
          className="inline-block rounded-full bg-accent px-6 py-3 font-medium text-on-accent hover:bg-accent-dark"
        >
          {session ? 'Go to My books' : 'Sign in'}
        </a>
      </section>
    )
  }

  // Older demo orders have no paidAt, so fall back to when they were placed
  const paidAt = new Date(order.paidAt ?? order.createdAt).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <a href="/my-books" className="text-sm font-medium text-muted hover:text-accent">
          &larr; Back to My books
        </a>
        {/* window.print() opens the browser's print dialog (or "Save as PDF") */}
        <button
          type="button"
          onClick={() => window.print()}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
        >
          <PrintIcon className="size-4" />
          Print receipt
        </button>
      </div>

      <article className="rounded-2xl border border-line bg-surface p-8 print:border-0 print:p-0">
        <div className="mb-8 flex flex-wrap justify-between gap-6">
          <div>
            <p className="font-serif text-2xl font-bold">
              Mayerfeld<span className="text-accent">Books</span>
            </p>
            <p className="text-sm text-muted">Example Street 12, 10999 Berlin</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold">Receipt</h1>
            <p className="text-sm text-muted">Order #{order.id}</p>
          </div>
        </div>

        <dl className="mb-8 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted">Billed to</dt>
            <dd className="font-medium">{session.user.name}</dd>
            <dd className="text-muted">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-muted">Paid on</dt>
            <dd className="font-medium">{paidAt}</dd>
          </div>
          <div>
            <dt className="text-muted">Paid with</dt>
            {/* Stripe keeps the card, so only the old demo orders have its last 4 digits */}
            <dd className="font-medium">
              {order.cardLast4 ? `Test card •••• ${order.cardLast4}` : 'Card, via Stripe'}
            </dd>
          </div>
        </dl>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="pb-2 font-medium">Book</th>
              <th className="pb-2 text-right font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Price</th>
              <th className="pb-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.bookId} className="border-b border-line">
                <td className="py-3">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted">{item.author}</p>
                </td>
                <td className="py-3 text-right">{item.quantity}</td>
                <td className="py-3 text-right">€{item.price.toFixed(2)}</td>
                <td className="py-3 text-right">€{(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-base font-semibold">
              <td colSpan="3" className="pt-4">
                Total paid
              </td>
              <td className="pt-4 text-right">€{order.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-8 text-center text-xs text-muted">
          Paid in Stripe test mode: no real money was taken. Thank you for shopping with us!
        </p>
      </article>
    </section>
  )
}
