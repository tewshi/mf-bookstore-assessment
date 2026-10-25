import { useEffect, useState } from 'react'
import { getJson } from '../../api'

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

      {orders.length === 0 ? (
        <p className="text-muted">No orders yet.</p>
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
              {orders.map((order) => (
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
