import { BookCard } from './BookCard'

export function StaffPicks({ books }) {
  const picks = books.filter((book) => book.staffPick)

  return (
    // A white band, so this section stands apart from the book grid above
    <section id="staff-picks" className="scroll-mt-16 border-y border-line bg-surface">
      <div className="mx-auto max-w-page px-4 py-16">
        <h2 className="text-3xl font-bold">Staff Picks</h2>
        <p className="mb-8 text-muted">
          What the people behind the counter are reading this month.
        </p>
        {/* Longer text, so one per row on phones, 3 from sm */}
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {picks.map((book) => (
            <li key={book.id}>
              <BookCard book={book}>
                <blockquote className="mt-2 border-l-2 border-accent pl-3 text-sm text-muted italic">
                  "{book.staffPick.quote}"
                </blockquote>
                <p className="mt-2 text-sm font-medium">Picked by {book.staffPick.by}</p>
              </BookCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
