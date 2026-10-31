import { useEffect, useState } from 'react'
import { getJson } from '../../lib/api'
import { BookCard } from './BookCard'
import { useLive } from '../../lib/useLive'

// "Readers who bought this also bought", under a book. books is the full
// list from App, used when nobody has bought this book yet: then we show
// other books from the same section instead, so the space is never empty.
export function Recommendations({ book, books }) {
  // null until the API answers
  const [alsoBought, setAlsoBought] = useState(null)

  function load() {
    getJson(`/api/books/${book.id}/recommendations`).then(setAlsoBought, () => setAlsoBought([]))
  }

  useEffect(load, [book.id])
  // Live: they come from paid orders, and the server sends 'books' to
  // everyone when an order is paid ('orders' only goes to the buyer)
  useLive('books', load)

  if (!alsoBought) return null

  const fromBuyers = alsoBought.length > 0
  const picks = fromBuyers
    ? alsoBought
    : books.filter((other) => other.section === book.section && other.id !== book.id).slice(0, 4)

  if (picks.length === 0) return null

  return (
    <section className="mt-16 border-t border-line pt-12">
      <h2 className="text-3xl font-bold">
        {fromBuyers ? 'Readers who bought this also bought' : `More in ${book.section}`}
      </h2>
      <p className="mb-8 text-muted">
        {fromBuyers
          ? 'Based on what other customers ordered.'
          : 'Nobody has bought this one yet. You could be the first!'}
      </p>
      {/* 2 columns on phones, 4 from lg, like the main book grid */}
      <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {picks.map((pick) => (
          <li key={pick.id}>
            <BookCard book={pick}>
              <p className="font-semibold text-accent">€{pick.price.toFixed(2)}</p>
            </BookCard>
          </li>
        ))}
      </ul>
    </section>
  )
}
