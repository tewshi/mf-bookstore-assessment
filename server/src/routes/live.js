import { Router } from 'express'
import { addClient, removeClient } from '../lib/live.js'
import { currentUser } from '../lib/session.js'

// Mounted at /api/live
export const live = Router()

// GET /api/live: an answer that never ends. The browser's EventSource
// opens it once per tab and reads each "data: <topic>" line as it comes
// (see lib/live.js). Open to everyone: visitors get the public topics
// (stock, events, reviews). Signed in, the tab also hears about its own
// wishlist and orders, and an admin's about everyone's orders and users.
live.get('/', async (req, res) => {
  // Who is asking, from the session cookie, the same as any other route
  const user = await currentUser(req)

  res.writeHead(200, {
    // What makes the browser treat this as an event stream
    'Content-Type': 'text/event-stream',
    // Every line is news: no cache may keep a copy
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  // Send the headers and a first comment line now, so the browser knows
  // the stream is open before anything has changed
  res.write(': connected\n\n')

  const client = { res, userId: user?.id ?? null, isAdmin: user?.role === 'admin' }
  addClient(client)
  // The tab was closed, moved to another site, or is connecting again
  req.on('close', () => removeClient(client))
})
