import { useEffect, useState } from 'react'
import { getJson } from '../../lib/api'
import { usePages } from '../../lib/usePages'
import { Avatar } from '../../components/ui/Avatar'
import { Select } from '../../components/ui/Select'
import { SearchBox } from '../../components/ui/SearchBox'
import { Pagination } from '../../components/ui/Pagination'
import { RefreshButton } from '../../components/ui/RefreshButton'
import { useLive } from '../../lib/useLive'

const roleOptions = [
  { value: 'all', label: 'All roles' },
  { value: 'customer', label: 'Customers' },
  { value: 'admin', label: 'Admins' },
]

const perPage = 10

// Everyone with an account, newest first. Only a list: people sign up
// themselves, and db/make-admin.js changes roles.
export function AdminUsers() {
  const [users, setUsers] = useState(null)
  // What the list shows: one role (or 'all'), and a name or email search
  const [role, setRole] = useState('all')
  const [search, setSearch] = useState('')

  // Returns the promise, so the Refresh button can wait for it
  function load() {
    return getJson('/api/admin/users').then(setUsers, () => setUsers([]))
  }

  useEffect(() => {
    load()
  }, [])
  // Live: a sign-up or profile change, and orders for the spent column
  useLive('users', load)
  useLive('orders', load)

  // Filtered here from the users we already have, like the orders tab
  const needle = search.trim().toLowerCase()
  const shown = (users ?? []).filter(
    (user) =>
      (role === 'all' || user.role === role) &&
      (user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle)),
  )
  const { page, setPage, pageItems } = usePages(shown, perPage)

  // A new filter or search starts again at page 1
  function changeRole(value) {
    setRole(value)
    setPage(1)
  }
  function changeSearch(value) {
    setSearch(value)
    setPage(1)
  }

  if (!users) return <p className="text-muted">Loading users…</p>

  return (
    // id: where the page buttons scroll back to
    <div id="admin-users" className="scroll-mt-24">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <SearchBox value={search} onChange={changeSearch} placeholder="Search name or email" />
        <Select label="Role" value={role} onChange={changeRole} options={roleOptions} />
        <RefreshButton onRefresh={load} />
      </div>

      {shown.length === 0 ? (
        <p className="text-muted">No users match.</p>
      ) : (
        // overflow-x-auto: on phones the table scrolls sideways inside its box
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-bg text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 text-right font-medium">Paid orders</th>
                <th className="px-4 py-3 text-right font-medium">Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageItems.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar user={user} />
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-muted">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {new Date(user.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        user.role === 'admin' ? 'bg-accent-soft text-accent' : 'bg-bg text-muted'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{user.orderCount}</td>
                  <td className="px-4 py-3 text-right font-semibold">€{user.spent.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        perPage={perPage}
        total={shown.length}
        noun="users"
        onChange={setPage}
        scrollTo="admin-users"
      />
    </div>
  )
}
