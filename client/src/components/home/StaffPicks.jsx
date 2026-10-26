import { usePages } from '../../lib/usePages'
import { BookCard } from '../books/BookCard'
import { Pagination } from '../ui/Pagination'

// One row of the 3-column grid at a time
const perPage = 3

export function StaffPicks({ books }) {
  const picks = books.filter((book) => book.staffPick)
  const { page, setPage, pageItems } = usePages(picks, perPage)

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
          {pageItems.map((book) => (
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

        <Pagination
          page={page}
          perPage={perPage}
          total={picks.length}
          noun="staff picks"
          onChange={setPage}
          scrollTo="staff-picks"
        />
      </div>
    </section>
  )
}
