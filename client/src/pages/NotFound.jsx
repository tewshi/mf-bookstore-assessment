// Any address we have no page for (/nonsense), or a book id that doesn't
// exist (/book/no-such-book). The server sends index.html for every
// address, so React is the one that has to say "not found".
export function NotFound() {
  return (
    <section className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="mb-2 text-sm font-semibold text-accent">404</p>
      <h1 className="mb-2 text-3xl font-bold">Page not found</h1>
      <p className="mb-8 text-muted">
        There's nothing at this address. The link may be old, or the book is no longer in the
        shop.
      </p>
      <a
        href="/#books"
        className="inline-block rounded-full bg-accent px-6 py-3 font-medium text-on-accent hover:bg-accent-dark"
      >
        Browse books
      </a>
    </section>
  )
}
