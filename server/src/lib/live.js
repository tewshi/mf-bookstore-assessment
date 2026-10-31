// Live updates with Server-Sent Events (SSE). Every open tab keeps one
// request to /api/live open (routes/live.js), and we keep its response
// here. When a route changes something, it calls notify('books') and each
// tab gets the line "data: books". The tab then fetches the books again
// through the normal API, so this never sends anyone's data itself, and
// the usual sign-in checks still decide who sees what.
//
// The topics: books, orders, events, wishlist, reviews, users.
//
// The list is in this process's memory, which works because the site runs
// as one server. Changes made outside it (npm run seed, make-admin) aren't
// announced; the lists catch up on their next fetch or Refresh.

// The open responses, one per tab
const clients = new Set()

export function addClient(res) {
  clients.add(res)
}

export function removeClient(res) {
  clients.delete(res)
}

// Tell every open tab that one kind of data changed
export function notify(topic) {
  for (const res of clients) {
    res.write(`data: ${topic}\n\n`)
  }
}

// "ping" every 25 seconds, to every tab. It stops proxies (Railway's,
// Vite's) from closing a connection that has been quiet for a while, and
// it lets the page notice a dead connection: no ping for a minute means
// it should connect again (see client/src/lib/useLive.js). unref(): this
// timer alone doesn't keep Node running, so scripts that import this can
// still exit.
setInterval(() => notify('ping'), 25_000).unref()
