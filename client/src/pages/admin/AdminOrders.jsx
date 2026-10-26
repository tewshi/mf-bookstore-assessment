import { useEffect, useState } from 'react'
import { getJson } from '../../lib/api'

// The badge colour for each order status
const statusColors = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  cancelled: 'bg-bg text-muted',
}

// Every order in the shop, newest first, with a few totals on top.
// The totals count paid orders only; pending and cancelled ones are listed
// with their status, but no money came in for them.
export function AdminOrders() {
  const [orders, setOrders] = useState(null)
  // What the list shows: one status (or 'all'), and a name or email search
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    getJson('/api/admin/orders').then(setOrders, () => setOrders([]))
  }, [])

  if (!orders) return <p className="text-muted">Loading orders…</p>

  const paid = orders.filter((order) => order.status === 'paid')
  const revenue = paid.reduce((sum, order) => sum + order.total, 0)
  const booksSold = paid.reduce((sum, order) => sum + order.bookCount, 0)
  const stats = [
    ['Paid orders', paid.length],
    ['Books sold', booksSold],
    ['Revenue', `€${revenue.toFixed(2)}`],
  ]

  // The totals above are for the whole shop; only the table is filtered.
  // Worked out here from the orders we already have, so no new request.
  const needle = search.trim().toLowerCase()
  const shown = orders.filter(
    (order) =>
      (status === 'all' || order.status === status) &&
      (order.name.toLowerCase().includes(needle) || order.email.toLowerCase().includes(needle)),
  )

  return (
    <div>
      <dl className="mb-8 grid gap-4 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-5">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-full border border-line bg-surface px-3 py-2"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or email"
          aria-label="Search orders by customer name or email"
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm sm:max-w-xs"
        />
        <p className="text-sm text-muted">
          {shown.length} of {orders.length} orders
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="text-muted">No orders yet.</p>
      ) : shown.length === 0 ? (
        <p className="text-muted">No orders match.</p>
      ) : (
        // overflow-x-auto: on phones the table scrolls sideways inside its box
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-bg text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Books</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 font-medium">#{order.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">
                    {new Date(order.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.name}</p>
                    <p className="text-muted">{order.email}</p>
                  </td>
                  <td className="px-4 py-3">{order.summary}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">€{order.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
