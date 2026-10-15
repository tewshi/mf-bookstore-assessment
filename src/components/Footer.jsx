export function Footer() {
  return (
    <footer id="visit" className="bg-ink text-bg">
      <div className="mx-auto flex max-w-page flex-wrap gap-x-16 gap-y-4 px-4 py-8">
        <div>
          <h2 className="mb-2 text-lg font-bold">Visit</h2>
          <address className="not-italic">
            MayerfeldBooks
            <br />
            Example Street 12
            <br />
            10999 Berlin
          </address>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-bold">Hours</h2>
          <p>
            Mon to Sat, 10:00 to 19:00
            <br />
            Closed Sunday
          </p>
        </div>
        {/* basis-full puts the copyright on its own row */}
        <p className="basis-full text-sm opacity-80">&copy; 2026 MayerfeldBooks</p>
      </div>
    </footer>
  )
}
