import { useEffect, useState } from 'react'
import { authClient } from '../lib/auth'
import { getJson } from '../lib/api'
import { AlertIcon, CheckIcon } from '../components/ui/Icons'

// How often to ask again while the order is still pending, and how many times
const retryDelay = 2000
const maxTries = 6

// The /paid/<id> page, where Stripe sends the customer after paying.
// Being sent here doesn't prove anything (anyone can type the address),
// so it asks our API for the order's status, which only the webhook
// changes. The webhook can arrive a moment after the customer does, so
// while the order is still 'pending' it asks again every 2 seconds.
// onPaid empties the cart once the order really is paid.
export function Paid({ orderId, onPaid }) {
  const { data: session, isPending } = authClient.useSession()
  const userId = session?.user.id
  // The order from the API, or 'missing' if it isn't there (or isn't ours)
  const [order, setOrder] = useState(null)
  // True after the last try, if the order was still pending
  const [gaveUp, setGaveUp] = useState(false)

  useEffect(() => {
    if (!userId) return
    // Set when we leave the page, so a late answer or timer does nothing
    let stopped = false
    let timer

    async function check(triesLeft) {
      try {
        const found = await getJson(`/api/orders/${orderId}`)
        if (stopped) return
        setOrder(found)
        if (found.status === 'paid') {
          onPaid()
        } else if (found.status === 'pending' && triesLeft > 1) {
          timer = setTimeout(() => check(triesLeft - 1), retryDelay)
        } else if (found.status === 'pending') {
          setGaveUp(true)
        }
      } catch {
        if (!stopped) setOrder('missing')
      }
    }

    check(maxTries)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [orderId, userId, onPaid])

  const button =
    'rounded-full bg-accent px-6 py-3 font-medium text-on-accent hover:bg-accent-dark'
  const secondButton =
    'rounded-full border border-line bg-surface px-6 py-3 font-medium hover:border-accent hover:text-accent'

  if (isPending || (userId && !order)) {
    return <p className="mx-auto max-w-page px-4 py-16 text-muted">Loading…</p>
  }

  if (!session || order === 'missing') {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-2 text-3xl font-bold">Order not found</h1>
        <p className="mb-8 text-muted">
          {session
            ? 'There is no order with that number in your account.'
            : 'Sign in to see your order.'}
        </p>
        <a href={session ? '/orders' : '/signin/orders'} className={button}>
          {session ? 'Go to Orders' : 'Sign in'}
        </a>
      </section>
    )
  }

  if (order.status === 'paid') {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400">
          <CheckIcon className="size-8" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">Payment successful</h1>
        <p className="mb-8 text-muted">
          Order #{order.id}, €{order.total.toFixed(2)}, is paid. It's saved under Orders,
          where you can review what you bought.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="/orders" className={button}>
            Go to Orders
          </a>
          <a href={`/order/${order.id}`} className={secondButton}>
            View receipt
          </a>
          <a href="/#books" className={secondButton}>
            Keep shopping
          </a>
        </div>
      </section>
    )
  }

  if (order.status === 'cancelled') {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
          <AlertIcon className="size-8" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">Payment didn't go through</h1>
        <p className="mb-8 text-muted">
          Order #{order.id} was cancelled and nothing was charged. Your cart is still here.
        </p>
        <a href="/checkout" className={button}>
          Try again
        </a>
      </section>
    )
  }

  // Still pending: waiting for Stripe's webhook
  return (
    <section className="mx-auto max-w-md px-4 py-24 text-center">
      {gaveUp ? (
        <>
          <h1 className="mb-2 text-3xl font-bold">Still waiting for Stripe</h1>
          <p className="mb-8 text-muted">
            We haven't heard from Stripe about order #{order.id} yet. Refresh this page in a
            minute; it will show here once the payment is confirmed.
          </p>
        </>
      ) : (
        <>
          {/* The same spinning ring as the checkout button, bigger */}
          <span className="mx-auto mb-6 block size-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <h1 className="mb-2 text-3xl font-bold">Confirming your payment…</h1>
          <p className="text-muted">Waiting for Stripe to confirm order #{order.id}.</p>
        </>
      )}
    </section>
  )
}
