import { Hero } from '../components/home/Hero'
import { BookGrid, BookGridSkeleton } from '../components/books/BookGrid'
import { StaffPicks } from '../components/home/StaffPicks'
import { Events } from '../components/home/Events'
import { Reveal } from '../components/ui/Reveal'

// The home page (no hash, or a section link like #events). books is null
// while they load; error is set if they couldn't be loaded.
export function Home({ books, error, savedIds, onAdd, onToggleSave }) {
  return (
    <>
      <Hero />
      {error && (
        <p role="alert" className="mx-auto max-w-page px-4 py-8 text-accent">
          Could not load the books. Please try again later.
        </p>
      )}
      {!books && !error && <BookGridSkeleton />}
      {books && (
        <>
          <Reveal>
            <BookGrid books={books} onAdd={onAdd} savedIds={savedIds} onToggleSave={onToggleSave} />
          </Reveal>
          <Reveal>
            <StaffPicks books={books} />
          </Reveal>
        </>
      )}
      <Reveal>
        <Events />
      </Reveal>
    </>
  )
}
