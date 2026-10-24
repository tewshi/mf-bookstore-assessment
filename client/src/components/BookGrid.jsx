import { useState } from 'react'
import { BookCard, StockNote } from './BookCard'
import { Stars } from './StarRating'
import { CartIcon, SearchIcon } from './Icons'

const sections = ['All', 'Fiction', 'Nonfiction']

// How many books each page of the grid shows (two rows of four on a laptop)
const perPage = 8

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'newest', label: 'Newest' },
]

// A sorted copy of books. We copy first because sort() changes the array
// it is given, and books belongs to App. 'featured' keeps the API's order.
function sortBooks(books, sort) {
  const sorted = [...books]
  if (sort === 'price-low') sorted.sort((a, b) => a.price - b.price)
  if (sort === 'price-high') sorted.sort((a, b) => b.price - a.price)
  // Books with no reviews count as 0, so they go last
  if (sort === 'rating') sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  if (sort === 'newest') sorted.sort((a, b) => b.published - a.published)
  return sorted
}

// onAdd(bookId) puts one copy of a book in the cart. savedIds and
// onToggleSave(bookId) are the wishlist, for the heart on each card.
export function BookGrid({ books, onAdd, savedIds, onToggleSave }) {
  // Which section button is selected. Clicking a button calls
  // setSection, React re-renders, and filtered is worked out again.
  const [section, setSection] = useState('All')
  // What is typed in the search box, and the chosen sort
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('featured')
  // Which page of results is showing, counting from 1
  const [pageNumber, setPageNumber] = useState(1)

  // Section first, then the search, then the order. The search ignores
  // upper/lower case, and ISBNs match with or without the dashes.
  const search = query.trim().toLowerCase()
  const searchIsbn = search.replaceAll('-', '')
  const filtered = books.filter(
    (book) =>
      (section === 'All' || book.section === section) &&
      (book.title.toLowerCase().includes(search) ||
        book.author.toLowerCase().includes(search) ||
        book.isbn.replaceAll('-', '').includes(searchIsbn)),
  )
  const shown = sortBooks(filtered, sort)

  // Cut the results into pages. slice(8, 16) gives books 9 to 16, and so on.
  const pageCount = Math.ceil(shown.length / perPage)
  const first = (pageNumber - 1) * perPage
  const pageBooks = shown.slice(first, first + perPage)
  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1)

  // A new search, sort or section starts again at page 1
  function changeQuery(value) {
    setQuery(value)
    setPageNumber(1)
  }
  function changeSort(value) {
    setSort(value)
    setPageNumber(1)
  }
  function changeSection(value) {
    setSection(value)
    setPageNumber(1)
  }

  // Switch page, then scroll back up to the top of the grid
  function goToPage(number) {
    setPageNumber(number)
    document.getElementById('books').scrollIntoView()
  }

  return (
    <section id="books" className="mx-auto max-w-page scroll-mt-16 px-4 py-16">
      <h2 className="text-3xl font-bold">Books</h2>
      <p className="mb-6 text-muted">Everything on our shelves right now.</p>

      {/* Search, sort and section filter: stacked on phones, one row from md */}
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search by title, author or ISBN</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder="Search by title, author or ISBN"
            className="w-full rounded-full border border-line bg-surface py-2.5 pr-4 pl-11 outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
          />
        </label>
        <label>
          <span className="sr-only">Sort by</span>
          <select
            value={sort}
            onChange={(e) => changeSort(e.target.value)}
            className="w-full cursor-pointer rounded-full border border-line bg-surface px-4 py-2.5 outline-none focus:border-accent md:w-auto"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex w-fit gap-1 rounded-full border border-line bg-surface p-1">
          {sections.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => changeSection(name)}
              aria-pressed={section === name}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition ${
                section === name ? 'bg-accent text-white shadow-sm' : 'text-muted hover:text-accent'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 && (
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
                  className="relative z-10 flex cursor-pointer items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:cursor-default disabled:bg-line disabled:text-muted"
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

      {/* Only when there is more than one page */}
      {pageCount > 1 && (
        <nav aria-label="Pages" className="mt-10 flex flex-col items-center gap-3">
          <p className="text-sm text-muted">
            Showing {first + 1}–{first + pageBooks.length} of {shown.length} books
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber === 1}
              className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium hover:bg-accent-soft hover:text-accent disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit"
            >
              &larr; Previous
            </button>
            {pageNumbers.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => goToPage(number)}
                aria-label={`Page ${number}`}
                aria-current={number === pageNumber ? 'page' : undefined}
                className={`size-10 cursor-pointer rounded-full text-sm font-medium ${
                  number === pageNumber
                    ? 'bg-accent text-white'
                    : 'hover:bg-accent-soft hover:text-accent'
                }`}
              >
                {number}
              </button>
            ))}
            <button
              type="button"
              onClick={() => goToPage(pageNumber + 1)}
              disabled={pageNumber === pageCount}
              className="cursor-pointer rounded-full px-4 py-2 text-sm font-medium hover:bg-accent-soft hover:text-accent disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit"
            >
              Next &rarr;
            </button>
          </div>
        </nav>
      )}
    </section>
  )
}

// Grey placeholder cards shown while the books load, so the page has its
// shape straight away instead of a gap. animate-pulse fades them in and out.
export function BookGridSkeleton() {
  const placeholders = [1, 2, 3, 4, 5, 6, 7, 8]

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
