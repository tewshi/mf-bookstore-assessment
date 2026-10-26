import { BookIcon, HeartIcon, ShieldIcon, UserIcon } from '../ui/Icons'

// The links in the account menu (header dropdown and phone drawer).
// page is the hash's first part when that link is open, for the highlight.
const links = [
  { href: '#my-books', page: 'my-books', label: 'My books', Icon: BookIcon },
  { href: '#saved', page: 'saved', label: 'Saved', Icon: HeartIcon },
  { href: '#account', page: 'account', label: 'Account', Icon: UserIcon },
]

// The links for this person: admins also get Admin. (The server checks the
// role again on every admin request; hiding the link is only for looks.)
export function accountLinksFor(user) {
  if (user.role === 'admin') {
    return [...links, { href: '#admin', page: 'admin', label: 'Admin', Icon: ShieldIcon }]
  }
  return links
}
