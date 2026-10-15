import { books } from '../data/books'
import { BookCard } from './BookCard'

export function BookGrid() {
  return (
    <section id="books" className="mx-auto max-w-page scroll-mt-8 px-4 py-8">
      <h2 className="mb-4 text-2xl font-bold">Books</h2>
      {/* 2 columns on phones, 3 from sm, 4 from lg */}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((book) => (
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
