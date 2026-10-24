import { useEffect, useState } from 'react'
import { authClient } from '../auth'
import { getJson } from '../api'
import { Stars } from './StarRating'
import { BookIcon } from './Icons'

// The #my-books page: everything the signed-in person has bought,
// one card per order, with a link to review each book.
export function MyBooks() {
  const { data: session, isPending } = authClient.useSession()
  const userId = session?.user.id

  // null until /api/orders answers
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)

  // Fetch again if a different person signs in
  useEffect(() => {
    if (!userId) return
    getJson('/api/orders').then(setOrders, setError)
  }, [userId])

  if (isPending) {
    return <p className="mx-auto max-w-page px-4 py-16 text-muted">Loading…</p>
  }

  if (!session) {
    return (
      <section id="my-books" className="mx-auto max-w-md scroll-mt-16 px-4 py-24 text-center">
        <h1 className="mb-2 text-3xl font-bold">Sign in to see your books</h1>
        <p className="mb-8 text-muted">Your orders and reviews are kept in your account.</p>
        <a
          href="#signin/my-books"
          className="inline-block rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent-dark"
        >
          Sign in
        </a>
      </section>
    )
  }

  return (
    <section id="my-books" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">My books</h1>
      <p className="mb-8 text-muted">Your orders, newest first. Tell other readers what you thought.</p>

      {error && (
        <p role="alert" className="text-accent">
          Could not load your orders. Please try again later.
        </p>
      )}
      {!orders && !error && <p className="text-muted">Loading your orders…</p>}

      {orders?.length === 0 && (
        <div className="rounded-2xl border border-line bg-surface px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <BookIcon className="size-7" />
          </div>
          <p className="mb-6 text-muted">You haven't bought any books yet.</p>
          <a
            href="#books"
            className="inline-block rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent-dark"
          >
            Browse books
          </a>
        </div>
      )}

      <ul className="flex flex-col gap-6">
        {orders?.map((order) => (
          <li key={order.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
            {/* The order's details in a tinted strip across the top */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 bg-bg px-6 py-4 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span className="font-semibold">Order #{order.id}</span>
                <span className="text-muted">
                  {new Date(order.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-muted">Card •••• {order.cardLast4}</span>
              </div>
              <span className="font-semibold">€{order.total.toFixed(2)}</span>
            </div>

            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.bookId} className="flex gap-4 px-6 py-4">
                  <img
                    src={item.image}
                    alt=""
                    width="600"
                    height="900"
                    className="aspect-[2/3] w-14 shrink-0 rounded-md object-cover shadow-sm"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="leading-snug font-semibold">
                        <a href={`#book/${item.bookId}`} className="hover:text-accent">
                          {item.title}
                        </a>
                      </h2>
                      <p className="text-sm text-muted">
                        {item.author} &middot; {item.quantity} &times; €{item.price.toFixed(2)}
                      </p>
                    </div>
                    {/* #book/<id>/reviews opens the book and jumps to its reviews */}
                    {item.myRating ? (
                      <a
                        href={`#book/${item.bookId}/reviews`}
                        className="flex shrink-0 items-center gap-2 text-sm text-muted hover:text-accent"
                      >
                        <Stars rating={item.myRating} />
                        Edit your review
                      </a>
                    ) : (
                      <a
                        href={`#book/${item.bookId}/reviews`}
                        className="w-fit shrink-0 rounded-full border border-accent px-4 py-1.5 text-sm font-medium text-accent hover:bg-accent hover:text-white"
                      >
                        Write a review
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}
