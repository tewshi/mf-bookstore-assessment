import { cartItems, cartTotal } from '../lib/cart'
import { CartIcon, TrashIcon } from './Icons'

// The #cart page. cart only holds ids and quantities, so we look each
// id up in books to get the title, cover and price.
export function Cart({ books, cart, onChangeQuantity }) {
  if (!books) {
    return <p className="mx-auto max-w-page px-4 py-16 text-muted">Loading your cart…</p>
  }

  const items = cartItems(books, cart)
  const total = cartTotal(items)

  if (items.length === 0) {
    return (
      <section id="cart" className="scroll-mt-16 mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CartIcon className="size-8" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">Your cart is empty</h1>
        <p className="mb-8 text-muted">Find something good to read and add it here.</p>
        <a
          href="#books"
          className="inline-block rounded-full bg-accent px-6 py-3 font-medium text-on-accent hover:bg-accent-dark"
        >
          Browse books
        </a>
      </section>
    )
  }

  const stepButton =
    'flex size-8 cursor-pointer items-center justify-center rounded-full text-lg hover:bg-accent-soft hover:text-accent disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit'

  return (
    <section id="cart" className="scroll-mt-16 mx-auto max-w-page px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Your cart</h1>

      {/* Items and summary stacked on phones, side by side from lg */}
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {items.map(({ book, quantity }) => (
            <li key={book.id} className="flex gap-4 p-4">
              <img
                src={book.image}
                alt=""
                width="600"
                height="900"
                className="aspect-[2/3] w-16 shrink-0 rounded-md object-cover shadow-sm sm:w-20"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="leading-snug font-semibold">
                      <a href={`#book/${book.id}`} className="hover:text-accent">
                        {book.title}
                      </a>
                    </h2>
                    <p className="text-sm text-muted">{book.author}</p>
                    {/* The stock went down since this was added (someone else bought it) */}
                    {quantity > book.stock && (
                      <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-400">
                        {book.stock === 0 ? 'Sold out' : `Only ${book.stock} left`}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold whitespace-nowrap">
                    €{(book.price * quantity).toFixed(2)}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-full border border-line">
                    <button
                      type="button"
                      onClick={() => onChangeQuantity(book.id, quantity - 1)}
                      aria-label={`One fewer ${book.title}`}
                      className={stepButton}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => onChangeQuantity(book.id, quantity + 1)}
                      disabled={quantity >= book.stock}
                      aria-label={`One more ${book.title}`}
                      className={stepButton}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChangeQuantity(book.id, 0)}
                    className="flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-sm text-muted hover:bg-accent-soft hover:text-accent"
                  >
                    <TrashIcon className="size-4" />
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* lg:sticky keeps the total in view while a long list scrolls */}
        <aside className="rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-xl font-bold">Summary</h2>
          <div className="flex justify-between border-b border-line pb-4 text-muted">
            <span>Books</span>
            <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>
          <div className="flex justify-between py-4 text-lg font-semibold">
            <span>Total</span>
            <span>€{total.toFixed(2)}</span>
          </div>
          <a
            href="#checkout"
            className="block rounded-full bg-accent px-6 py-3 text-center font-medium text-on-accent hover:bg-accent-dark"
          >
            Checkout
          </a>
          <a href="#books" className="mt-3 block text-center text-sm text-muted hover:text-accent">
            Continue shopping
          </a>
        </aside>
      </div>
    </section>
  )
}
