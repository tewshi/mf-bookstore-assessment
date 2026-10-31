import { Router } from 'express'
import { addClient, removeClient } from '../lib/live.js'

// Mounted at /api/live
export const live = Router()

// GET /api/live: an answer that never ends. The browser's EventSource
// opens it once per tab and reads each "data: <topic>" line as it comes
// (see lib/live.js). Open to everyone: it only says what changed, never
// the data, so signed-out visitors get live stock and events too.
live.get('/', (req, res) => {
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

  addClient(res)
  // The tab was closed or moved to another site
  req.on('close', () => removeClient(res))
})
