import { CartIcon } from './Icons'

// quantity is how many of this book are already in the cart
export function BookDetails({ book, quantity, onAdd }) {
  const specs = [
    ['ISBN', book.isbn],
    ['Section', book.section],
    ['Format', book.format],
    ['Pages', book.pages],
    ['Published', book.published],
  ]

  return (
    <section className="mx-auto max-w-page px-4 py-8 sm:py-12">
      <p className="mb-6">
        <a href="#books" className="text-sm font-medium text-muted hover:text-accent">
          &larr; Back to all books
        </a>
      </p>
      {/* Stacked on phones, cover beside the text from md */}
      <article className="grid gap-8 md:grid-cols-[20rem_1fr] md:gap-12">
        <div className="rounded-2xl bg-accent-soft/60 p-8">
          <img
            src={book.image}
            alt={`Cover of ${book.title}`}
            width="600"
            height="900"
            className="mx-auto h-auto w-full max-w-64 rounded-md shadow-xl"
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.15em] text-accent uppercase">
            {book.section}
          </p>
          <h1 className="mb-2 text-3xl leading-tight font-bold sm:text-4xl">{book.title}</h1>
          <p className="mb-6 text-lg text-muted">by {book.author}</p>
          <p className="mb-6 text-2xl font-semibold">€{book.price.toFixed(2)}</p>

          <div className="mb-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onAdd}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-accent px-8 py-3 font-medium text-white shadow-sm hover:bg-accent-dark"
            >
              <CartIcon className="size-5" />
              Add to cart
            </button>
            {quantity > 0 && (
              <a href="#cart" className="text-sm text-muted hover:text-accent">
                {quantity} in your cart &middot; <span className="underline">View cart</span>
              </a>
            )}
          </div>

          <p className="mb-8 max-w-prose">{book.description}</p>
          <dl className="grid max-w-md grid-cols-[max-content_1fr] gap-x-8 gap-y-2 rounded-2xl border border-line bg-surface p-6 text-sm">
            {specs.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>
    </section>
  )
}
