const links = [
  { href: '#books', label: 'Books' },
  { href: '#staff-picks', label: 'Staff Picks' },
  { href: '#events', label: 'Events' },
  { href: '#visit', label: 'Visit' },
]

export function Header() {
  return (
    <header className="border-b border-line bg-surface">
      {/* Phones: logo on top, nav centred underneath. sm and up: one row. */}
      <div className="mx-auto flex max-w-page flex-col items-center gap-2 px-4 py-4 sm:flex-row sm:justify-between">
        <a href="#top" className="text-2xl font-bold text-ink no-underline">
          Mayerfeld<span className="text-accent">Books</span>
        </a>
        <nav aria-label="Main">
          <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-muted hover:text-accent hover:underline">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
