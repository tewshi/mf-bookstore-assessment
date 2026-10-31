import { authClient } from '../../lib/auth'
import { AdminOrders } from './AdminOrders'
import { AdminBooks } from './AdminBooks'
import { AdminEvents } from './AdminEvents'
import { AdminUsers } from './AdminUsers'

const tabs = [
  { id: 'orders', label: 'Orders' },
  { id: 'books', label: 'Books' },
  { id: 'events', label: 'Events' },
  { id: 'users', label: 'Users' },
]

// The /admin page, for staff. tab comes from the address: /admin/books, ...
// books is App's list; onBooksChanged reloads it after an edit.
export function Admin({ tab = 'orders', books, onBooksChanged }) {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <p className="mx-auto max-w-page px-4 py-16 text-muted">Loading…</p>
  }

  // The server refuses non-admins anyway; this just explains why
  if (session?.user.role !== 'admin') {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-2 text-3xl font-bold">Staff only</h1>
        <p className="text-muted">This page is for the shop's admins.</p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-page px-4 py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">Admin</h1>
      <p className="mb-6 text-muted">Orders, books, events and users for the whole shop.</p>

      {/* The tabs are plain links to /admin/orders, /admin/books, ... */}
      <nav
        aria-label="Admin"
        className="mb-8 flex w-fit gap-1 rounded-full border border-line bg-surface p-1"
      >
        {tabs.map((t) => (
          <a
            key={t.id}
            href={`/admin/${t.id}`}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === t.id ? 'bg-accent text-on-accent' : 'text-muted hover:text-accent'
            }`}
          >
            {t.label}
          </a>
        ))}
      </nav>

      {tab === 'orders' && <AdminOrders />}
      {tab === 'books' && <AdminBooks books={books} onChanged={onBooksChanged} />}
      {tab === 'events' && <AdminEvents />}
      {tab === 'users' && <AdminUsers />}
    </section>
  )
}
