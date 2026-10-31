// Live updates with Server-Sent Events (SSE). Every open tab keeps one
// request to /api/live open (routes/live.js), and we keep its response
// here, with who opened it. When a route changes something, it calls one
// of the notify functions below, e.g. notifyEveryone('books'), and each
// tab it picks gets the line "data: books". The tab then fetches the
// books again through the normal API, so this never sends anyone's data
// itself, and the usual sign-in checks still decide who sees what.
//
// The topics: books, orders, events, wishlist, reviews, users.
//
// The list is in this process's memory, which works because the site runs
// as one server. Changes made outside it (npm run seed, make-admin) aren't
// announced; the lists catch up on their next fetch or Refresh.

// The open tabs: { res, userId, isAdmin }. userId is null for visitors.
// Who it is was decided when the tab connected; signing in or out makes
// the tab connect again (client/src/lib/useLive.js).
const clients = new Set()

export function addClient(client) {
  clients.add(client)
}

export function removeClient(client) {
  clients.delete(client)
}

// Write the topic to every tab that shouldGet(tab) says yes to
function send(topic, shouldGet) {
  for (const client of clients) {
    if (shouldGet(client)) client.res.write(`data: ${topic}\n\n`)
  }
}

// Public data (books, stock, events, reviews): every tab, signed in or not
export function notifyEveryone(topic) {
  send(topic, () => true)
}

// One person's own data (their wishlist): only their tabs and devices
export function notifyUser(topic, userId) {
  send(topic, (client) => client.userId === userId)
}

// Data only staff see (the users list): every admin's tabs
export function notifyAdmins(topic) {
  send(topic, (client) => client.isAdmin)
}

// An order: the person it belongs to, and the admins (the orders tab)
export function notifyUserAndAdmins(topic, userId) {
  send(topic, (client) => client.userId === userId || client.isAdmin)
}

// "ping" every 25 seconds, to every tab. It stops proxies (Railway's,
// Vite's) from closing a connection that has been quiet for a while, and
// it lets the page notice a dead connection: no ping for a minute means
// it should connect again (see client/src/lib/useLive.js). unref(): this
// timer alone doesn't keep Node running, so scripts that import this can
// still exit.
setInterval(() => notifyEveryone('ping'), 25_000).unref()
