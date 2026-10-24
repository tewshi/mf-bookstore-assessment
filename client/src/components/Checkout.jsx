import { useState } from 'react'
import { authClient } from '../auth'
import { postJson } from '../api'
import { cartItems, cartTotal } from '../cart'
import { CheckIcon, LockIcon } from './Icons'

// The two test cards the server accepts (see server/src/orders.js)
const testCards = [
  { number: '4242 4242 4242 4242', result: 'Payment goes through' },
  { number: '4000 0000 0000 0002', result: 'Card is declined' },
]

// The #checkout page: a pretend card payment. No money moves; the server
// only accepts the test cards above. onPaid empties the cart afterwards.
export function Checkout({ books, cart, onPaid }) {
  const { data: session, isPending } = authClient.useSession()
  const [nameOnCard, setNameOnCard] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // The finished order, { id, total }, once the payment went through
  const [order, setOrder] = useState(null)

  // Checked first: after paying, the cart is empty, but we still want
  // to show the thank-you message rather than "your cart is empty".
  if (order) {
    return (
      <section id="checkout" className="mx-auto max-w-md scroll-mt-16 px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400">
          <CheckIcon className="size-8" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">Payment successful</h1>
        <p className="mb-8 text-muted">
          Order #{order.id}, €{order.total.toFixed(2)}. It's saved under My books, where you can
          review what you bought.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="#my-books"
            className="rounded-full bg-accent px-6 py-3 font-medium text-on-accent hover:bg-accent-dark"
          >
            Go to My books
          </a>
          <a
            href={`#order/${order.id}`}
            className="rounded-full border border-line bg-surface px-6 py-3 font-medium hover:border-accent hover:text-accent"
          >
            View receipt
          </a>
          <a
            href="#books"
            className="rounded-full border border-line bg-surface px-6 py-3 font-medium hover:border-accent hover:text-accent"
          >
            Keep shopping
          </a>
        </div>
      </section>
    )
  }

  if (isPending || !books) {
    return <p className="mx-auto max-w-page px-4 py-16 text-muted">Loading…</p>
  }

  // Orders belong to an account, so ask visitors to sign in first.
  // #signin/checkout brings them straight back here afterwards.
  if (!session) {
    return (
      <section id="checkout" className="mx-auto max-w-md scroll-mt-16 px-4 py-24 text-center">
        <h1 className="mb-2 text-3xl font-bold">Sign in to check out</h1>
        <p className="mb-8 text-muted">Your cart is kept while you sign in.</p>
        <a
          href="#signin/checkout"
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
          href="#books"
          className="inline-block rounded-full bg-accent px-6 py-3 font-medium text-on-accent hover:bg-accent-dark"
        >
          Browse books
        </a>
      </section>
    )
  }

  // Fills the form with a test card, so a demo takes one click
  function fillTestCard(number) {
    setNameOnCard(session.user.name)
    setCardNumber(number)
    setExpiry('12/30')
    setCvc('123')
    setError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    // Only ids and quantities go to the server; it looks up the prices
    // itself. Name, expiry and CVC are only checked by the form here.
    try {
      const result = await postJson('/api/orders', {
        items: items.map(({ book, quantity }) => ({ bookId: book.id, quantity })),
        cardNumber,
      })
      setOrder(result)
      onPaid()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const input =
    'mt-1 w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft'

  return (
    <section id="checkout" className="mx-auto max-w-page scroll-mt-16 px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Checkout</h1>

      {/* Form and summary stacked on phones, side by side from lg */}
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <div className="mb-6 rounded-xl bg-accent-soft p-4 text-sm text-accent-dark">
            <p className="mb-3 font-medium">
              Demo payment: no money moves. Click a test card to fill in the form.
            </p>
            <div className="flex flex-wrap gap-2">
              {testCards.map((card) => (
                <button
                  key={card.number}
                  type="button"
                  onClick={() => fillTestCard(card.number)}
                  className="cursor-pointer rounded-lg border border-accent/30 bg-surface px-3 py-2 text-left hover:border-accent"
                >
                  <span className="block font-mono">{card.number}</span>
                  <span className="text-xs text-muted">{card.result}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="text-sm font-medium">
              Name on card
              <input
                className={input}
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value)}
                required
              />
            </label>
            {/* autoComplete="off": we don't want the browser offering a real saved card */}
            <label className="text-sm font-medium">
              Card number
              <input
                className={`${input} font-mono`}
                inputMode="numeric"
                autoComplete="off"
                placeholder="4242 4242 4242 4242"
                maxLength={19}
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="text-sm font-medium">
                Expiry
                <input
                  className={input}
                  autoComplete="off"
                  placeholder="MM/YY"
                  pattern="\d{2}/\d{2}"
                  title="Month and year, e.g. 12/30"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  required
                />
              </label>
              <label className="text-sm font-medium">
                CVC
                <input
                  className={input}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="123"
                  pattern="\d{3,4}"
                  title="3 or 4 digits"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  required
                />
              </label>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-dark"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-full bg-accent px-8 py-3 font-medium text-on-accent hover:bg-accent-dark disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? (
                <>
                  {/* A ring with one see-through side, spinning */}
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing payment…
                </>
              ) : (
                <>
                  <LockIcon className="size-4" />
                  Pay €{total.toFixed(2)}
                </>
              )}
            </button>
          </form>
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
          <a href="#cart" className="mt-4 block text-center text-sm text-muted hover:text-accent">
            Edit cart
          </a>
        </aside>
      </div>
    </section>
  )
}
