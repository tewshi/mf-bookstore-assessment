// One book in a grid. children is shown under the ISBN, so each
// grid decides what goes there (a price, a staff quote, ...).
export function BookCard({ book, children }) {
  return (
    // No padding on the card, so the cover touches the edges.
    // overflow-hidden clips the cover to the rounded corners.
    <article className="relative h-full overflow-hidden rounded-md border border-line bg-surface hover:border-accent">
      <img
        src={book.image}
        alt={`Cover of ${book.title}`}
        width="600"
        height="900"
        loading="lazy"
        className="block h-48 w-full bg-bg object-contain"
      />
      <div className="p-4">
        <h3 className="mb-2 leading-tight font-bold">
          {/* after:inset-0 stretches the link over the whole card */}
          <a href={`#book/${book.id}`} className="after:absolute after:inset-0">
            {book.title}
          </a>
        </h3>
        <p className="text-sm text-muted">{book.author}</p>
        <p className="text-xs text-muted">ISBN {book.isbn}</p>
        {children}
      </div>
    </article>
  )
}
