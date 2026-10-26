import { useState } from 'react'
import { authClient } from '../lib/auth'
import { postJson } from '../lib/api'
import { cartItems, cartTotal } from '../lib/cart'
import { LockIcon } from '../components/ui/Icons'

// The /checkout page: the order summary and a button that sends the
// customer to Stripe's payment page. Stripe sends them back to /paid/<id>
// (Paid) afterwards, or to /my-books if they press Back.
// orderId comes from /checkout/<id>: an unpaid order to reuse, if any.
export function Checkout({ books, cart, orderId }) {
  const { data: session, isPending } = authClient.useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  if (isPending || !books) {
    return <p className="mx-auto max-w-page px-4 py-16 text-muted">Loading…</p>
  }

  // Orders belong to an account, so ask visitors to sign in first.
  // /signin/checkout brings them straight back here afterwards.
  if (!session) {
    return (
      <section id="checkout" className="mx-auto max-w-md scroll-mt-16 px-4 py-24 text-center">
        <h1 className="mb-2 text-3xl font-bold">Sign in to check out</h1>
        <p className="mb-8 text-muted">Your cart is kept while you sign in.</p>
        <a
          href="/signin/checkout"
          className="inline-block rounded-full bg-accent px-6 py-3 font-medium text-on-accent hover:bg-accent-dark"
        >
          Sign in
        </a>
      </section>
    )
  }

  const items = cartItems(books, cart)
  const total = cartTotal(items)

  if (items.length === 0) {
    return (
      <section id="checkout" className="mx-auto max-w-md scroll-mt-16 px-4 py-24 text-center">
        <h1 className="mb-2 text-3xl font-bold">Nothing to pay for</h1>
        <p className="mb-8 text-muted">Your cart is empty.</p>
        <a
          href="/#books"
          className="inline-block rounded-full bg-accent px-6 py-3 font-medium text-on-accent hover:bg-accent-dark"
        >
          Browse books
        </a>
      </section>
    )
  }

  async function handleBuy() {
    setBusy(true)
    setError(null)
    // Only ids and quantities go to the server; it looks up the prices
    // itself and answers with Stripe's page. With orderId, the server
    // reuses that order if the cart still matches it, or else makes a new one.
    try {
      const { url } = await postJson('/api/orders', {
        items: items.map(({ book, quantity }) => ({ bookId: book.id, quantity })),
        orderId,
      })
      // Leave our site for Stripe's. busy stays true, so the button
      // can't be pressed twice while the page changes.
      window.location.assign(url)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <section id="checkout" className="mx-auto max-w-page scroll-mt-16 px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Checkout</h1>

      {/* Form and summary stacked on phones, side by side from lg */}
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="mb-2 text-xl font-bold">Pay with Stripe</h2>
          <p className="mb-6 text-muted">
            You'll enter your card on Stripe's secure page, then come straight back here.
          </p>
          <div className="mb-6 rounded-xl bg-accent-soft p-4 text-sm text-accent-dark">
            <p className="font-medium">Test mode: no money moves.</p>
            <p>
              Use card <span className="font-mono">4242 4242 4242 4242</span>, any future
              date and any CVC.
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-dark"
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleBuy}
            disabled={busy}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-8 py-3 font-medium text-on-accent hover:bg-accent-dark disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? (
              <>
                {/* A ring with one see-through side, spinning */}
                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Opening Stripe…
              </>
            ) : (
              <>
                <LockIcon className="size-4" />
                Buy now · €{total.toFixed(2)}
              </>
            )}
          </button>
        </div>

        <aside className="rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-xl font-bold">Your order</h2>
          <ul className="divide-y divide-line">
            {items.map(({ book, quantity }) => (
              <li key={book.id} className="flex items-center gap-3 py-3">
                <img
                  src={book.image}
                  alt=""
                  width="600"
                  height="900"
                  className="aspect-[2/3] w-10 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{book.title}</p>
                  <p className="text-xs text-muted">Qty {quantity}</p>
                </div>
                <p className="text-sm font-medium">€{(book.price * quantity).toFixed(2)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-line pt-4 text-lg font-semibold">
            <span>Total</span>
            <span>€{total.toFixed(2)}</span>
          </div>
          <a href="/cart" className="mt-4 block text-center text-sm text-muted hover:text-accent">
            Edit cart
          </a>
        </aside>
      </div>
    </section>
  )
}
