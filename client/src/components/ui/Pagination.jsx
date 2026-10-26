// Previous, the page numbers, Next, and "Showing 9–16 of 24 books".
// Shows nothing at all when everything fits on one page.
// page counts from 1. total is how many items there are in all, noun what
// they are ("books"). onChange(number) switches page; then we scroll up to
// the element with the id scrollTo, so the new page starts at its top.
export function Pagination({ page, perPage, total, noun, onChange, scrollTo }) {
  const pageCount = Math.ceil(total / perPage)
  if (pageCount <= 1) return null

  const first = (page - 1) * perPage
  const last = Math.min(first + perPage, total)
  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1)

  function goToPage(number) {
    onChange(number)
    document.getElementById(scrollTo)?.scrollIntoView()
  }

  const arrowButton =
    'cursor-pointer rounded-full px-4 py-2 text-sm font-medium hover:bg-accent-soft hover:text-accent disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit'

  return (
    <nav aria-label="Pages" className="mt-10 flex flex-col items-center gap-3">
      <p className="text-sm text-muted">
        Showing {first + 1}–{last} of {total} {noun}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => goToPage(page - 1)}
          disabled={page === 1}
          className={arrowButton}
        >
          &larr; Previous
        </button>
        {pageNumbers.map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => goToPage(number)}
            aria-label={`Page ${number}`}
            aria-current={number === page ? 'page' : undefined}
            className={`size-10 cursor-pointer rounded-full text-sm font-medium ${
              number === page ? 'bg-accent text-on-accent' : 'hover:bg-accent-soft hover:text-accent'
            }`}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={page === pageCount}
          className={arrowButton}
        >
          Next &rarr;
        </button>
      </div>
    </nav>
  )
}
