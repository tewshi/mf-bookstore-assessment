import { useState } from 'react'
import { BookCard } from './BookCard'
import { StarRating } from './StarRating'
import { CartIcon } from './Icons'

const sections = ['All', 'Fiction', 'Nonfiction']

// onAdd(bookId) puts one copy of a book in the cart
export function BookGrid({ books, onAdd }) {
  // Which section button is selected. Clicking a button calls
  // setSection, React re-renders, and filtered is worked out again.
  const [section, setSection] = useState('All')

  // Star rating per book, e.g. { 'slow-maps': 4 }. Kept here rather than
  // in each card, so a rating survives when the filter hides the card.
  const [ratings, setRatings] = useState({})

  function rate(bookId, value) {
    setRatings({ ...ratings, [bookId]: value })
  }

  const filtered = section === 'All' ? books : books.filter((book) => book.section === section)

  return (
    <section id="books" className="mx-auto max-w-page scroll-mt-16 px-4 py-16">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">Books</h2>
          <p className="text-muted">Everything on our shelves right now.</p>
        </div>
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
      {/* 2 columns on phones, 3 from sm, 4 from lg */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {filtered.map((book) => (
          <li key={book.id}>
            <BookCard book={book}>
              <StarRating
                label={book.title}
                value={ratings[book.id] ?? 0}
                onChange={(value) => rate(book.id, value)}
              />
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
