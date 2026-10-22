import { books } from '../data/books'
import { BookCard } from './BookCard'

const picks = books.filter((book) => book.staffPick)

export function StaffPicks() {
  return (
    <section id="staff-picks" className="mx-auto max-w-page scroll-mt-8 px-4 py-8">
      <h2 className="mb-4 text-2xl font-bold">Staff Picks</h2>
      {/* Longer text, so one per row on phones, 3 from sm */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {picks.map((book) => (
          <li key={book.id}>
            <BookCard book={book}>
              <p className="mt-2 text-sm text-muted italic">
                "{book.staffPick.quote}"
                <span className="block text-ink not-italic">Picked by {book.staffPick.by}</span>
              </p>
            </BookCard>
          </li>
        ))}
      </ul>
    </section>
  )
}
