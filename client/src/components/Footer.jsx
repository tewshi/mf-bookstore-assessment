export function Footer() {
  return (
    <footer className="bg-ink text-bg">
      {/* One column on phones, three from sm */}
      <div className="mx-auto grid max-w-page gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <p className="mb-2 font-serif text-2xl font-bold">
            Mayerfeld<span className="text-accent-soft">Books</span>
          </p>
          <p className="text-sm opacity-70">
            A small, careful selection, chosen by people who read.
          </p>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold">Visit</h2>
          <address className="text-sm not-italic opacity-80">
            MayerfeldBooks
            <br />
            Example Street 12
            <br />
            10999 Berlin
          </address>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold">Hours</h2>
          <p className="text-sm opacity-80">
            Mon to Sat, 10:00 to 19:00
            <br />
            Closed Sunday
          </p>
        </div>
        {/* col-span-full puts the copyright on its own row */}
        <p className="col-span-full border-t border-bg/15 pt-6 text-sm opacity-60">
          &copy; 2026 MayerfeldBooks
        </p>
      </div>
    </footer>
  )
}
