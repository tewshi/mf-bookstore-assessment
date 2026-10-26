import { useCallback, useEffect, useState } from 'react'
import { authClient } from '../lib/auth'
import { UserMenu } from './UserMenu'
import { MobileMenu } from './MobileMenu'
import { ThemeToggle } from './ThemeToggle'
import { CartIcon, MenuIcon } from './Icons'

const links = [
  { href: '#books', label: 'Books' },
  { href: '#staff-picks', label: 'Staff Picks' },
  { href: '#events', label: 'Events' },
]

// Which home page section is on screen, as a link href like '#events':
// the last section whose top has scrolled above a line 40% down the screen.
function sectionInView() {
  // At the very bottom, the last section (Events) can't scroll up that far.
  // So if a link was clicked (the hash) and its section is on screen,
  // trust that one.
  const hash = window.location.hash
  const atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 2
  const clicked = links.some((link) => link.href === hash)
    ? document.getElementById(hash.slice(1))
    : null
  if (atBottom && clicked) {
    const { top, bottom } = clicked.getBoundingClientRect()
    if (top < window.innerHeight && bottom > 0) return hash
  }

  let current = null
  for (const link of links) {
    const section = document.getElementById(link.href.slice(1))
    if (section && section.getBoundingClientRect().top < window.innerHeight * 0.4) {
      current = link.href
    }
  }
  return current
}

// page is the first part of the hash (see App.jsx), e.g. 'book' or 'cart'
export function Header({ cartCount, page }) {
  // Asks the server who is signed in (by the session cookie), and
  // re-renders the header when someone signs in or out.
  const { data: session, isPending } = authClient.useSession()

  // Whether the phone drawer is open. useCallback keeps closeMenu the same
  // function between renders, so MobileMenu's effect doesn't re-run for nothing.
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  // Work out the section on screen again every time the page scrolls,
  // and when the hash changes (clicking Events at the bottom doesn't scroll)
  const [inView, setInView] = useState(null)
  useEffect(() => {
    const update = () => setInView(sectionInView())
    update()
    window.addEventListener('scroll', update)
    window.addEventListener('hashchange', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('hashchange', update)
    }
  }, [])

  // The link to highlight: Books on a book's own page, the section on
  // screen on the home page (no hash, or one of the sections), else none.
  const onHomePage = page === '' || page === 'top' || links.some((link) => link.href === `#${page}`)
  const activeHref = page === 'book' ? '#books' : onHomePage ? inView : null
  const cartActive = page === 'cart' || page === 'checkout'

  return (
    // The drawer sits next to the header, not inside it: backdrop-blur
    // would otherwise trap the drawer's position: fixed inside the header.
    <>
      {/* sticky: the header stays at the top while the page scrolls */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-4">
          <a href="#top" className="font-serif text-2xl font-bold text-ink">
            Mayerfeld<span className="text-accent">Books</span>
          </a>

          {/* Links in the header from md; phones get them in the drawer */}
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex gap-1">
              {links.map((link) => (
                <li key={link.href}>
                  {/* aria-current tells screen readers which link is the current one */}
                  <a
                    href={link.href}
                    aria-current={link.href === activeHref ? 'true' : undefined}
                    className={`rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-accent-soft hover:text-accent ${
                      link.href === activeHref ? 'bg-accent-soft text-accent' : 'text-muted'
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <a
              href="#cart"
              aria-label={`Cart, ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
              aria-current={cartActive ? 'page' : undefined}
              className={`relative rounded-full p-2 hover:bg-accent-soft hover:text-accent ${
                cartActive ? 'bg-accent-soft text-accent' : ''
              }`}
            >
              <CartIcon />
              {/* The little number on the icon, only when something is in the cart */}
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-xs font-semibold text-on-accent">
                  {cartCount}
                </span>
              )}
            </a>

            {/* Nothing until we know, so "Sign in" does not flash for signed-in people */}
            {!isPending && (
              <div className="hidden md:block">
                {session ? (
                  <UserMenu user={session.user} page={page} />
                ) : (
                  <a
                    href="#signin"
                    className="ml-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-dark"
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

      <MobileMenu
        open={menuOpen}
        onClose={closeMenu}
        links={links}
        activeHref={activeHref}
        page={page}
        session={session}
      />
    </>
  )
}
