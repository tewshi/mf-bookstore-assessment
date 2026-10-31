import { useEffect, useRef } from 'react'

// Live updates: the server sends a topic ("books", "orders", "events",
// "wishlist", "reviews", "users") over /api/live whenever that kind of
// data changes (see server/src/lib/live.js), and each list that shows it
// fetches again. Only the topic arrives this way, never the data.

// One connection for the whole tab, opened the first time a list asks.
// Browsers allow about 6 open requests per site, so one per list would
// soon leave none for anything else.
let source = null
// topic -> the set of functions to call when it changes
const listeners = new Map()
// Whether a connection was open before, so the next one is a reconnect
let openedBefore = false
// When the server last said anything. It sends "ping" every 25 seconds.
let lastHeard = 0

function connect() {
  source = new EventSource('/api/live')
  lastHeard = Date.now()

  source.onmessage = (message) => {
    lastHeard = Date.now()
    listeners.get(message.data)?.forEach((onChange) => onChange())
  }

  // After a reconnect: anything could have changed while we were away,
  // so every list fetches again, as if each topic had changed
  source.onopen = () => {
    lastHeard = Date.now()
    if (openedBefore) {
      listeners.forEach((set) => set.forEach((onChange) => onChange()))
    }
    openedBefore = true
  }

  // When the connection drops, EventSource tries again by itself, but
  // only after a network error. If the server answers with an error page
  // instead (Vite while Express restarts, Railway during a deploy), it
  // gives up for good (CLOSED). Then we start a new one in 5 seconds.
  source.onerror = () => {
    if (source.readyState === EventSource.CLOSED) {
      setTimeout(connect, 5000)
    }
  }
}

// A connection can also die without the browser noticing: when Express
// stops, a proxy in between (Vite's in dev) can keep our side open with
// nothing behind it. So every 10 seconds: if there was no ping for a
// minute, close this one and connect again.
setInterval(() => {
  if (source && Date.now() - lastHeard > 60_000) {
    source.close()
    connect()
  }
}, 10_000)

// Calls onChange whenever the server says topic changed, while the
// component is on the page, e.g. useLive('orders', load)
export function useLive(topic, onChange) {
  // onChange is a new function on every render (it sees the latest props
  // and state). The ref always holds the newest one, so the listener
  // below doesn't have to be swapped on every render.
  const latest = useRef(onChange)
  useEffect(() => {
    latest.current = onChange
  })

  useEffect(() => {
    if (!source) connect()
    const listener = () => latest.current()
    if (!listeners.has(topic)) listeners.set(topic, new Set())
    listeners.get(topic).add(listener)
    // Leaving the page: stop listening (the connection stays for the others)
    return () => listeners.get(topic).delete(listener)
  }, [topic])
}
