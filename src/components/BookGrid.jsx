import { useState } from 'react'
import { books } from '../data/books'
import { BookCard } from './BookCard'

const sections = ['All', 'Fiction', 'Nonfiction']

export function BookGrid() {
  // Which section button is selected. Clicking a button calls
  // setSection, React re-renders, and filtered is worked out again.
  const [section, setSection] = useState('All')

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
            </BookCard>
          </li>
        ))}
      </ul>
    </section>
  )
}
