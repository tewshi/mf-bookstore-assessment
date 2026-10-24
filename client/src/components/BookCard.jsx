import { HeartIcon } from './Icons'

// One book in a grid. children is shown under the ISBN, so each
// grid decides what goes there (a price, a staff quote, ...).
// With onToggleSave, a heart in the corner saves the book for later.
export function BookCard({ book, children, saved, onToggleSave }) {
  return (
    // group lets the cover react when the whole card is hovered.
    // overflow-hidden clips the cover area to the rounded corners.
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative bg-accent-soft/60 px-6 pt-6 pb-4">
        {/* z-10 lifts the heart above the card's stretched link */}
        {onToggleSave && (
          <button
            type="button"
            onClick={onToggleSave}
            aria-label={saved ? `Remove ${book.title} from saved` : `Save ${book.title}`}
            aria-pressed={saved}
            className={`absolute top-3 right-3 z-10 cursor-pointer rounded-full bg-surface/90 p-2 shadow-sm hover:text-accent ${
              saved ? 'text-accent' : 'text-muted'
            }`}
          >
            <HeartIcon className="size-5" filled={saved} />
          </button>
        )}
        <img
          src={book.image}
          alt={`Cover of ${book.title}`}
          width="600"
          height="900"
          loading="lazy"
          className="mx-auto aspect-[2/3] w-full max-w-40 rounded-md object-cover shadow-md transition group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 leading-snug font-semibold">
          {/* after:inset-0 stretches the link over the whole card */}
          <a
            href={`#book/${book.id}`}
            className="after:absolute after:inset-0 group-hover:text-accent"
          >
            {book.title}
          </a>
        </h3>
        <p className="text-sm text-muted">{book.author}</p>
        <p className="text-xs text-muted">ISBN {book.isbn}</p>
        {/* mt-auto pushes the extras to the bottom, so prices line up across a row */}
        <div className="mt-auto pt-2">{children}</div>
      </div>
    </article>
  )
}

// "Sold out" or "Only 2 left" under a book, or nothing when there's plenty
export function StockNote({ stock, className = '' }) {
  if (stock === 0) {
    return <p className={`text-sm font-medium text-muted ${className}`}>Sold out</p>
  }
  if (stock <= 3) {
    return (
      <p className={`text-sm font-medium text-amber-700 dark:text-amber-400 ${className}`}>
        Only {stock} left
      </p>
    )
  }
  return null
}
