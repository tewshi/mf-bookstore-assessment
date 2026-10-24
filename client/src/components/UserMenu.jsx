import { useEffect, useRef, useState } from 'react'
import { authClient } from '../auth'
import { BookIcon, ChevronDownIcon, SignOutIcon } from './Icons'

// The person's picture, or our default one. Better Auth has an `image`
// field on the user, but email sign up leaves it empty for now.
export function Avatar({ user, className = 'size-8' }) {
  return (
    <img
      src={user.image || '/avatar.svg'}
      alt=""
      className={`${className} shrink-0 rounded-full object-cover ring-2 ring-accent-soft`}
    />
  )
}

// Avatar and name in the header. Clicking opens a small dropdown
// with the email address, a link to My books and the sign out button.
// page (from App) lets us highlight My books while it is open
export function UserMenu({ user, page }) {
  const [open, setOpen] = useState(false)
  // A ref points at the menu's element, so we can tell whether a
  // click landed inside it or somewhere else on the page.
  const menuRef = useRef(null)

  // While open, a click outside the menu or the Escape key closes it.
  // The listeners are removed again when it closes.
  useEffect(() => {
    if (!open) return
    function onClick(event) {
      if (!menuRef.current.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="user-menu"
        className="flex cursor-pointer items-center gap-2 rounded-full py-1 pr-2 pl-1 hover:bg-accent-soft"
      >
        <Avatar user={user} />
        <span className="max-w-32 truncate text-sm font-medium">{user.name}</span>
        <ChevronDownIcon
          className={`size-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          id="user-menu"
          className="absolute right-0 mt-2 w-60 rounded-xl border border-line bg-surface p-2 shadow-lg"
        >
          <div className="mb-2 border-b border-line px-3 pt-1 pb-3">
            <p className="font-medium">{user.name}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
          {/* Close the menu when the link is followed */}
          <a
            href="#my-books"
            onClick={() => setOpen(false)}
            aria-current={page === 'my-books' ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent-soft hover:text-accent ${
              page === 'my-books' ? 'bg-accent-soft text-accent' : ''
            }`}
          >
            <BookIcon className="size-4" />
            My books
          </a>
          <button
            type="button"
            onClick={() => authClient.signOut()}
            className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-accent hover:bg-accent-soft"
          >
            <SignOutIcon className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
