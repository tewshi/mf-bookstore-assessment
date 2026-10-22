export function BookDetails({ book }) {
  const specs = [
    ['ISBN', book.isbn],
    ['Section', book.section],
    ['Format', book.format],
    ['Pages', book.pages],
    ['Published', book.published],
  ]

  return (
    <section className="mx-auto max-w-page px-4 py-8">
      <p className="mb-4">
        <a href="#books" className="text-accent underline">
          &larr; Back to all books
        </a>
      </p>
      {/* Stacked on phones, cover beside the text from sm */}
      <article className="grid gap-8 border-t border-line py-8 sm:grid-cols-[16rem_1fr]">
        <img
          src={book.image}
          alt={`Cover of ${book.title}`}
          width="600"
          height="900"
          className="h-auto w-full max-w-64 rounded-md"
        />
        <div>
          <h1 className="mb-2 text-3xl leading-tight font-bold">{book.title}</h1>
          <p className="text-muted">{book.author}</p>
          <p className="mb-4 text-xl font-bold text-accent">€{book.price.toFixed(2)}</p>
          <p className="mb-4">{book.description}</p>
          <dl className="mb-4 grid grid-cols-[max-content_1fr] gap-x-8 gap-y-2">
            {specs.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <a
            href="#visit"
            className="mt-4 inline-block rounded-full bg-accent px-8 py-4 font-bold text-white hover:opacity-90"
          >
            Buy it in the shop
          </a>
        </div>
      </article>
    </section>
  )
}
