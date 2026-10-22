import { authClient } from '../auth'

const links = [
  { href: '#books', label: 'Books' },
  { href: '#staff-picks', label: 'Staff Picks' },
  { href: '#events', label: 'Events' },
  { href: '#visit', label: 'Visit' },
]

export function Header() {
  // Asks the server who is signed in (by the session cookie), and
  // re-renders the header when someone signs in or out.
  const { data: session, isPending } = authClient.useSession()

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
            {/* Nothing until we know, so "Sign in" does not flash for signed-in people */}
            {!isPending && (
              <li>
                {session ? (
                  <>
                    <span className="text-muted">Hi, {session.user.name} · </span>
                    <button
                      type="button"
                      onClick={() => authClient.signOut()}
                      className="cursor-pointer text-accent hover:underline"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <a href="#signin" className="text-accent hover:underline">
                    Sign in
                  </a>
                )}
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  )
}
