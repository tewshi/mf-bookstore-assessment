import { useEffect, useState } from 'react'
import { getJson } from '../../lib/api'
import { BookCard, StockNote } from './BookCard'
import { Stars } from './StarRating'
import { CartIcon } from '../ui/Icons'
import { Select } from '../ui/Select'
import { SearchBox } from '../ui/SearchBox'
import { Pagination } from '../ui/Pagination'

const sections = ['All', 'Fiction', 'Nonfiction']

// The values are the sort names the API understands (see server/src/api.js)
const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
]

// The searchable, sortable book grid. The server does the searching,
// sorting and paging: we ask for one page at a time.
// books (App's full list) is only used to know when to fetch again: App
// reloads it after a payment or a review, when stock or ratings change.
// onAdd(bookId) puts one copy of a book in the cart. savedIds and
// onToggleSave(bookId) are the wishlist, for the heart on each card.
export function BookGrid({ books, onAdd, savedIds, onToggleSave }) {
  const [section, setSection] = useState('All')
  const [sort, setSort] = useState('featured')
  const [pageNumber, setPageNumber] = useState(1)
  // query is what is in the search box right now; search is what we last
  // searched for, which catches up once typing pauses (see below)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  // The API's answer: { books, total, page, perPage, pageCount }
  const [result, setResult] = useState(null)

  // Wait until typing pauses for 300ms before searching, instead of
  // sending a request for every letter. Each new letter cancels the timer.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query)
      setPageNumber(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Fetch the page whenever the search, section, sort or page changes.
  // ignore: if the user moves on before the answer arrives, a newer
  // request is already on its way, so the old answer is thrown away.
  useEffect(() => {
    const params = new URLSearchParams({ page: pageNumber, q: search, sort })
    if (section !== 'All') params.set('section', section)
    let ignore = false
    getJson(`/api/books?${params}`).then(
      (data) => {
        if (!ignore) setResult(data)
      },
      () => {},
    )
    return () => {
      ignore = true
    }
  }, [search, section, sort, pageNumber, books])

  // A new sort or section starts again at page 1
  function changeSort(value) {
    setSort(value)
    setPageNumber(1)
  }
  function changeSection(value) {
    setSection(value)
    setPageNumber(1)
  }

  // Before the first answer, pretend it's an empty first page
  const {
    books: pageBooks,
    total,
    page,
    perPage,
  } = result ?? {
    books: [],
    total: 0,
    page: 1,
    perPage: 12,
  }

  return (
    <section id="books" className="mx-auto max-w-page scroll-mt-16 px-4 py-16">
      <h2 className="text-3xl font-bold">Books</h2>
      <p className="mb-6 text-muted">Everything on our shelves right now.</p>

      {/* Search, sort and section filter: stacked on phones, one row from md */}
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center">
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Search by title, author or ISBN"
        />
        <Select label="Sort by" value={sort} onChange={changeSort} options={sortOptions} />
        <div className="flex w-fit gap-1 rounded-full border border-line bg-surface p-1">
          {sections.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => changeSection(name)}
              aria-pressed={section === name}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition ${
                section === name
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-muted hover:text-accent'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      {result && total === 0 && (
        <p className="rounded-2xl border border-line bg-surface px-6 py-12 text-center text-muted">
          No books match "{query}". Try another title, author or ISBN.
        </p>
      )}

      {/* 2 columns on phones, 3 from sm, 4 from lg */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {pageBooks.map((book) => (
          <li key={book.id}>
            <BookCard
              book={book}
              saved={savedIds.includes(book.id)}
              onToggleSave={() => onToggleSave(book.id)}
            >
              {/* The average of the reviews; people rate on the book's page now */}
              <p className="flex items-center gap-1 text-sm text-muted">
                {book.reviewCount > 0 ? (
                  <>
                    <Stars rating={book.rating} />
                    {book.rating.toFixed(1)} ({book.reviewCount})
                  </>
                ) : (
                  'No reviews yet'
                )}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="font-semibold text-accent">€{book.price.toFixed(2)}</p>
                {/* relative z-10 lifts the button above the card's stretched link */}
                <button
                  type="button"
                  onClick={() => onAdd(book.id)}
                  disabled={book.stock === 0}
                  aria-label={`Add ${book.title} to cart`}
                  className="relative z-10 flex cursor-pointer items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:bg-accent-dark disabled:cursor-default disabled:bg-line disabled:text-muted"
                >
                  <CartIcon className="size-4" />
                  Add
                </button>
              </div>
              <StockNote stock={book.stock} className="mt-2" />
            </BookCard>
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        perPage={perPage}
        total={total}
        noun="books"
        onChange={setPageNumber}
        scrollTo="books"
      />
    </section>
  )
}

// Grey placeholder cards shown while the books load, so the page has its
// shape straight away instead of a gap. animate-pulse fades them in and out.
export function BookGridSkeleton() {
  // One per book on the first page (the server sends 12 at a time)
  const placeholders = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  return (
    <section aria-busy="true" aria-label="Loading books" className="mx-auto max-w-page px-4 py-16">
      <div className="mb-2 h-9 w-32 animate-pulse rounded-lg bg-line" />
      <div className="mb-8 h-5 w-64 animate-pulse rounded bg-line" />
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {placeholders.map((n) => (
          <li
            key={n}
            className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface"
          >
            <div className="aspect-[4/5] bg-accent-soft/60" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-4 w-3/4 rounded bg-line" />
              <div className="h-3 w-1/2 rounded bg-line" />
              <div className="mt-4 h-8 rounded-full bg-line" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
