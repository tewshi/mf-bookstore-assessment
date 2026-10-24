import { BookIcon, HeartIcon } from './components/Icons'

// The links in the account menu (header dropdown and phone drawer).
// page is the hash's first part when that link is open, for the highlight.
export const accountLinks = [
  { href: '#my-books', page: 'my-books', label: 'My books', Icon: BookIcon },
  { href: '#saved', page: 'saved', label: 'Saved', Icon: HeartIcon },
]
