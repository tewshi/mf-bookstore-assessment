// Three covers fanned out beside the heading. Only decoration, so alt="".
// Each starts centred, then `place` moves and turns it; z-10 puts the middle one on top.
// delay: the covers fade in one after another, after the text.
const covers = [
  { src: '/images/night-ferry.jpg', place: '-translate-x-[110%] -rotate-8', delay: '300ms' },
  { src: '/images/salt-orchard.jpg', place: '-translate-x-1/2 z-10', delay: '450ms' },
  { src: '/images/slow-maps.jpg', place: 'translate-x-[10%] rotate-8', delay: '600ms' },
]

// The blurred colour blobs behind the hero, one layer under the text.
// delay: a negative delay starts each one partway through its drift, so they
// don't all move together.
const blobs = [
  { place: '-top-24 -left-24 bg-accent/30', delay: '0s' },
  { place: 'top-1/3 right-0 bg-amber-400/20', delay: '-6s' },
  { place: '-bottom-32 left-1/3 bg-rose-400/20', delay: '-12s' },
]

export function Hero() {
  return (
    // A soft gradient from the accent tint into the page background
    // relative: the background layers below are placed inside it
    <section className="relative overflow-hidden bg-linear-to-b from-accent-soft to-bg">
      {/* Background layers, only decoration: aria-hidden hides them from screen
          readers, pointer-events-none lets clicks pass through to the buttons */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {blobs.map((blob) => (
          <div
            key={blob.place}
            style={{ animationDelay: blob.delay }}
            className={`absolute size-96 rounded-full blur-3xl motion-safe:animate-drift ${blob.place}`}
          />
        ))}
        <div className="hero-dots absolute inset-0" />
        {/* Fades the layers into the page at the bottom, so the hero has no hard edge */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-bg" />
      </div>

      {/* Text only on phones; text and covers side by side from lg.
          relative: drawn above the background layers */}
      <div className="relative mx-auto grid max-w-page items-center gap-12 px-4 py-16 sm:py-24 lg:grid-cols-2">
        {/* motion-safe: only animate for people who haven't asked for less motion */}
        <div className="motion-safe:animate-fade-up">
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
              href="/#staff-picks"
              className="rounded-full bg-accent px-6 py-3 font-medium text-on-accent shadow-sm hover:bg-accent-dark"
            >
              See this month's staff picks
            </a>
            <a
              href="/#books"
              className="rounded-full border border-line bg-surface px-6 py-3 font-medium hover:border-accent hover:text-accent"
            >
              Browse all books
            </a>
          </div>
        </div>

        {/* hidden below lg: on phones the covers would push the buttons down */}
        {/* The whole group of covers floats gently (motion-safe:animate-float) */}
        <div className="relative hidden h-96 motion-safe:animate-float lg:block">
          {covers.map((cover) => (
            <img
              key={cover.src}
              src={cover.src}
              alt=""
              width="600"
              height="900"
              style={{ animationDelay: cover.delay }}
              className={`absolute top-1/2 left-1/2 w-44 -translate-y-1/2 rounded-md shadow-2xl motion-safe:animate-fade-up ${cover.place}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
