import { CartIcon, HeartIcon } from '../components/ui/Icons'
import { Stars } from '../components/books/StarRating'
import { StockNote } from '../components/books/BookCard'
import { Reviews } from '../components/books/Reviews'
import { Recommendations } from '../components/books/Recommendations'

// quantity is how many of this book are already in the cart.
// books is every book, for the recommendations' fallback.
// saved and onToggleSave are for the Save (wishlist) button.
export function BookDetails({ book, books, quantity, onAdd, onReviewed, saved, onToggleSave }) {
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
        <a href="/#books" className="text-sm font-medium text-muted hover:text-accent">
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
          <p className="mb-2 text-lg text-muted">by {book.author}</p>
          {book.reviewCount > 0 && (
            <a
              href={`/book/${book.id}#reviews`}
              className="mb-2 flex w-fit items-center gap-2 text-sm text-muted hover:text-accent"
            >
              <Stars rating={book.rating} className="text-lg" />
              {book.rating.toFixed(1)} ({book.reviewCount})
            </a>
          )}
          <p className="mt-4 text-2xl font-semibold">€{book.price.toFixed(2)}</p>
          {/* "In stock" when there's plenty; StockNote covers low and sold out */}
          {book.stock > 3 ? (
            <p className="mb-6 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              In stock
            </p>
          ) : (
            <StockNote stock={book.stock} className="mb-6" />
          )}

          <div className="mb-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={onAdd}
              disabled={book.stock === 0}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-accent px-8 py-3 font-medium text-on-accent shadow-sm hover:bg-accent-dark disabled:cursor-default disabled:bg-line disabled:text-muted disabled:shadow-none"
            >
              <CartIcon className="size-5" />
              {book.stock === 0 ? 'Sold out' : 'Add to cart'}
            </button>
            <button
              type="button"
              onClick={onToggleSave}
              aria-pressed={saved}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-6 py-3 font-medium hover:border-accent hover:text-accent ${
                saved ? 'border-accent text-accent' : 'border-line'
              }`}
            >
              <HeartIcon className="size-5" filled={saved} />
              {saved ? 'Saved' : 'Save'}
            </button>
            {quantity > 0 && (
              <a href="/cart" className="text-sm text-muted hover:text-accent">
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

      {/* key: start fresh for each book, so nothing from the last book shows */}
      <Recommendations key={`also-${book.id}`} book={book} books={books} />
      <Reviews key={book.id} book={book} onReviewed={onReviewed} />
    </section>
  )
}
