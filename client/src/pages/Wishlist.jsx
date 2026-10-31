import { usePages } from '../lib/usePages'
import { BookCard } from '../components/books/BookCard'
import { CartIcon, HeartIcon } from '../components/ui/Icons'
import { Pagination } from '../components/ui/Pagination'

// The same as the book grid on the home page: 3 rows of 4 on a laptop
const perPage = 12

// The /wishlist page: the books the signed-in person saved for later.
// savedIds is newest first, so the list is too.
export function Wishlist({ books, signedIn, savedIds, onToggleSave, onAdd }) {
  // Look each saved id up in books, skipping any that no longer exist.
  // Before the early returns below, because usePages is a hook.
  const savedBooks = savedIds
    .map((id) => books?.find((book) => book.id === id))
    .filter(Boolean)
  // Un-saving the last book on a page moves back a page by itself (usePages)
  const { page, setPage, pageItems } = usePages(savedBooks, perPage)

  if (!signedIn) {
    return (
      <section id="wishlist" className="mx-auto max-w-md scroll-mt-16 px-4 py-24 text-center">
        <h1 className="mb-2 text-3xl font-bold">Sign in to see your wishlist</h1>
        <p className="mb-8 text-muted">Tap the heart on any book to keep it for later.</p>
        <a
          href="/signin/wishlist"
          className="inline-block rounded-full bg-accent px-6 py-3 font-medium text-on-accent hover:bg-accent-dark"
        >
          Sign in
        </a>
      </section>
    )
  }

  if (!books) {
    return <p className="mx-auto max-w-page px-4 py-16 text-muted">Loading…</p>
  }

  return (
    <section id="wishlist" className="mx-auto max-w-page scroll-mt-16 px-4 py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">Wishlist</h1>
      <p className="mb-8 text-muted">Books you liked the look of. Tap a heart to remove one.</p>

      {savedBooks.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <HeartIcon className="size-7" />
          </div>
          <p className="mb-6 text-muted">Nothing saved yet.</p>
          <a
            href="/#books"
            className="inline-block rounded-full bg-accent px-6 py-3 font-medium text-on-accent hover:bg-accent-dark"
          >
            Browse books
          </a>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {pageItems.map((book) => (
            <li key={book.id}>
              <BookCard book={book} saved onToggleSave={() => onToggleSave(book.id)}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-accent">€{book.price.toFixed(2)}</p>
                  <button
                    type="button"
                    onClick={() => onAdd(book.id)}
                    disabled={book.stock === 0}
                    aria-label={`Add ${book.title} to cart`}
                    className="relative z-10 flex cursor-pointer items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:bg-accent-dark disabled:cursor-default disabled:bg-line disabled:text-muted"
                  >
                    <CartIcon className="size-4" />
                    {book.stock === 0 ? 'Sold out' : 'Add'}
                  </button>
                </div>
              </BookCard>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        perPage={perPage}
        total={savedBooks.length}
        noun="saved books"
        onChange={setPage}
        scrollTo="wishlist"
      />
    </section>
  )
}
