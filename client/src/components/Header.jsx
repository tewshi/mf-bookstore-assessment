import { useCallback, useState } from 'react'
import { authClient } from '../auth'
import { UserMenu } from './UserMenu'
import { MobileMenu } from './MobileMenu'
import { CartIcon, MenuIcon } from './Icons'

const links = [
  { href: '#books', label: 'Books' },
  { href: '#staff-picks', label: 'Staff Picks' },
  { href: '#events', label: 'Events' },
  { href: '#visit', label: 'Visit' },
]

export function Header({ cartCount }) {
  // Asks the server who is signed in (by the session cookie), and
  // re-renders the header when someone signs in or out.
  const { data: session, isPending } = authClient.useSession()

  // Whether the phone drawer is open. useCallback keeps closeMenu the same
  // function between renders, so MobileMenu's effect doesn't re-run for nothing.
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  return (
    // The drawer sits next to the header, not inside it: backdrop-blur
    // would otherwise trap the drawer's position: fixed inside the header.
    <>
      {/* sticky: the header stays at the top while the page scrolls */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-4">
          <a href="#top" className="font-serif text-2xl font-bold text-ink">
            Mayerfeld<span className="text-accent">Books</span>
          </a>

          {/* Links in the header from md; phones get them in the drawer */}
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="rounded-full px-3 py-2 text-sm font-medium text-muted hover:bg-accent-soft hover:text-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <a
              href="#cart"
              aria-label={`Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
              className="relative rounded-full p-2 hover:bg-accent-soft hover:text-accent"
            >
              <CartIcon />
              {/* The little number on the icon, only when something is in the cart */}
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                  {cartCount}
                </span>
              )}
            </a>

            {/* Nothing until we know, so "Sign in" does not flash for signed-in people */}
            {!isPending && (
              <div className="hidden md:block">
                {session ? (
                  <UserMenu user={session.user} />
                ) : (
                  <a
                    href="#signin"
                    className="ml-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
                  >
                    Sign in
                  </a>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="cursor-pointer rounded-full p-2 hover:bg-accent-soft md:hidden"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={menuOpen} onClose={closeMenu} links={links} session={session} />
    </>
  )
}
