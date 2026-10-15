export function Hero() {
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto max-w-page px-4 py-16 sm:text-center">
        <p className="mb-4 text-xs tracking-[0.15em] text-accent uppercase">
          Independent bookstore &middot; Readings every week
        </p>
        <h1 className="mb-2 text-4xl leading-tight font-bold sm:text-5xl">
          Books chosen by people who <span className="text-accent">read them</span>.
        </h1>
        <p className="max-w-xl text-muted sm:mx-auto">
          An independent bookstore with a small, careful selection and a full calendar of
          readings and book clubs.
        </p>
        <a
          href="#staff-picks"
          className="mt-4 inline-block rounded-full bg-accent px-8 py-4 font-bold text-white hover:opacity-90"
        >
          See this month's staff picks
        </a>
      </div>
    </section>
  )
}
