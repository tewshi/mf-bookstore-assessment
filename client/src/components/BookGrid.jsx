import { useState } from 'react'
import { BookCard } from './BookCard'
import { Stars } from './StarRating'
import { CartIcon, SearchIcon } from './Icons'

const sections = ['All', 'Fiction', 'Nonfiction']

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

// onAdd(bookId) puts one copy of a book in the cart
export function BookGrid({ books, onAdd }) {
  // Which section button is selected. Clicking a button calls
  // setSection, React re-renders, and filtered is worked out again.
  const [section, setSection] = useState('All')
  // What is typed in the search box, and the chosen sort
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('featured')

  // Section first, then the search (title or author, upper/lower case
  // doesn't matter), then the order
  const search = query.trim().toLowerCase()
  const filtered = books.filter(
    (book) =>
      (section === 'All' || book.section === section) &&
      (book.title.toLowerCase().includes(search) || book.author.toLowerCase().includes(search)),
  )
  const shown = sortBooks(filtered, sort)

  return (
    <section id="books" className="mx-auto max-w-page scroll-mt-16 px-4 py-16">
      <h2 className="text-3xl font-bold">Books</h2>
      <p className="mb-6 text-muted">Everything on our shelves right now.</p>

      {/* Search, sort and section filter: stacked on phones, one row from md */}
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search by title or author</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or author"
            className="w-full rounded-full border border-line bg-surface py-2.5 pr-4 pl-11 outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
          />
        </label>
        <label>
          <span className="sr-only">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
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
              onClick={() => setSection(name)}
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
          No books match "{query}". Try another title or author.
        </p>
      )}

      {/* 2 columns on phones, 3 from sm, 4 from lg */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {shown.map((book) => (
          <li key={book.id}>
            <BookCard book={book}>
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
                  aria-label={`Add ${book.title} to cart`}
                  className="relative z-10 flex cursor-pointer items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
                >
                  <CartIcon className="size-4" />
                  Add
                </button>
              </div>
            </BookCard>
          </li>
        ))}
      </ul>
    </section>
  )
}
