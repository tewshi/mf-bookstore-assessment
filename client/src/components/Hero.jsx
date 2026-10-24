// Three covers fanned out beside the heading. Only decoration, so alt="".
// Each starts centred, then `place` moves and turns it; z-10 puts the middle one on top.
const covers = [
  { src: '/images/night-ferry.jpg', place: '-translate-x-[110%] -rotate-8' },
  { src: '/images/salt-orchard.jpg', place: '-translate-x-1/2 z-10' },
  { src: '/images/slow-maps.jpg', place: 'translate-x-[10%] rotate-8' },
]

export function Hero() {
  return (
    // A soft gradient from the accent tint into the page background
    <section className="overflow-hidden bg-linear-to-b from-accent-soft to-bg">
      {/* Text only on phones; text and covers side by side from lg */}
      <div className="mx-auto grid max-w-page items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-2">
        <div>
          <p className="mb-4 inline-block rounded-full bg-surface px-4 py-1 text-xs font-semibold tracking-[0.15em] text-accent uppercase shadow-sm">
            Independent bookstore &middot; Readings every week
          </p>
          <h1 className="mb-4 text-4xl leading-tight font-bold sm:text-6xl">
            Books chosen by people who <span className="text-accent italic">read them</span>.
          </h1>
          <p className="mb-8 max-w-xl text-lg text-muted">
            An independent bookstore with a small, careful selection and a full calendar of readings
            and book clubs.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#staff-picks"
              className="rounded-full bg-accent px-6 py-3 font-medium text-on-accent shadow-sm hover:bg-accent-dark"
            >
              See this month's staff picks
            </a>
            <a
              href="#books"
              className="rounded-full border border-line bg-surface px-6 py-3 font-medium hover:border-accent hover:text-accent"
            >
              Browse all books
            </a>
          </div>
        </div>

        {/* hidden below lg: on phones the covers would push the buttons down */}
        <div className="relative hidden h-96 lg:block">
          {covers.map((cover) => (
            <img
              key={cover.src}
              src={cover.src}
              alt=""
              width="600"
              height="900"
              className={`absolute top-1/2 left-1/2 w-44 -translate-y-1/2 rounded-md shadow-2xl ${cover.place}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
