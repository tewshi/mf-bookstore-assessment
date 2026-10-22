import { useState } from 'react'
import { BookCard } from './BookCard'
import { StarRating } from './StarRating'

const sections = ['All', 'Fiction', 'Nonfiction']

export function BookGrid({ books }) {
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
    <section id="books" className="mx-auto max-w-page scroll-mt-8 px-4 py-8">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Books</h2>
        <div className="flex flex-wrap gap-2">
          {sections.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setSection(name)}
              aria-pressed={section === name}
              className={`cursor-pointer rounded-full border px-4 py-1 text-sm ${
                section === name
                  ? 'border-accent bg-accent text-white'
                  : 'border-line bg-surface text-muted hover:border-accent'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      {/* 2 columns on phones, 3 from sm, 4 from lg */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((book) => (
          <li key={book.id}>
            <BookCard book={book}>
              <p className="font-bold text-accent">€{book.price.toFixed(2)}</p>
              <StarRating
                label={book.title}
                value={ratings[book.id] ?? 0}
                onChange={(value) => rate(book.id, value)}
              />
            </BookCard>
          </li>
        ))}
      </ul>
    </section>
  )
}
