import { useEffect, useState } from 'react'
import { getJson } from '../../api'

// Every order in the shop, newest first, with a few totals on top
export function AdminOrders() {
  const [orders, setOrders] = useState(null)

  useEffect(() => {
    getJson('/api/admin/orders').then(setOrders, () => setOrders([]))
  }, [])

  if (!orders) return <p className="text-muted">Loading orders…</p>

  const revenue = orders.reduce((sum, order) => sum + order.total, 0)
  const booksSold = orders.reduce((sum, order) => sum + order.bookCount, 0)
  const stats = [
    ['Orders', orders.length],
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
