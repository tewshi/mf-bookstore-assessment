import { useEffect } from 'react'
import { authClient } from '../../lib/auth'
import { Avatar } from '../ui/Avatar'
import { accountLinksFor } from './accountLinks'
import { CloseIcon, SignOutIcon } from '../ui/Icons'

// The drawer the hamburger button opens on phones. It is always in the
// page, just pushed off the right edge (translate-x-full) while closed,
// so opening it can slide it in with a CSS transition.
// activeHref and page come from Header, to highlight the current link
export function MobileMenu({ open, onClose, links, activeHref, page, session }) {
  // While open: Escape closes it, and the page behind does not scroll.
  useEffect(() => {
    if (!open) return
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  function signOut() {
    authClient.signOut()
    onClose()
  }

  const link = 'rounded-lg px-3 py-3 text-lg hover:bg-accent-soft hover:text-accent'
  const active = 'bg-accent-soft text-accent'

  return (
    // md:hidden: from md up the links are in the header instead
    <div className="md:hidden">
      {/* Dimmed backdrop over the page. Clicking it closes the drawer. */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* inert while closed, so Tab can't reach the hidden links */}
      <aside
        id="mobile-menu"
        aria-label="Menu"
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-surface p-4 shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-serif text-xl font-bold">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="cursor-pointer rounded-full p-2 hover:bg-accent-soft"
          >
            <CloseIcon />
          </button>
        </div>

        {session && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-bg p-3">
            <Avatar user={session.user} className="size-10" />
            <div className="min-w-0">
              <p className="truncate font-medium">{session.user.name}</p>
              <p className="truncate text-sm text-muted">{session.user.email}</p>
            </div>
          </div>
        )}

        <nav aria-label="Mobile">
          <ul>
            {links.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={onClose}
                  aria-current={item.href === activeHref ? 'true' : undefined}
                  className={`block ${link} ${item.href === activeHref ? active : ''}`}
                >
                  {item.label}
                </a>
              </li>
            ))}
            {/* The account links, under a line, for signed-in people */}
            {session &&
              accountLinksFor(session.user).map(({ href, label, Icon, ...item }, i) => (
                <li key={href} className={i === 0 ? 'mt-2 border-t border-line pt-2' : ''}>
                  <a
                    href={href}
                    onClick={onClose}
                    aria-current={page === item.page ? 'page' : undefined}
                    className={`flex items-center gap-3 ${link} ${page === item.page ? active : ''}`}
                  >
                    <Icon className="size-5" />
                    {label}
                  </a>
                </li>
              ))}
          </ul>
        </nav>

        {/* mt-auto pushes the account button to the bottom of the drawer */}
        <div className="mt-auto border-t border-line pt-4">
          {session ? (
            <button
              type="button"
              onClick={signOut}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-line px-4 py-3 font-medium text-accent hover:bg-accent-soft"
            >
              <SignOutIcon className="size-5" />
              Sign out
            </button>
          ) : (
            <a
              href="/signin"
              onClick={onClose}
              className="block rounded-full bg-accent px-4 py-3 text-center font-medium text-on-accent hover:bg-accent-dark"
            >
              Sign in
            </a>
          )}
        </div>
      </aside>
    </div>
  )
}
