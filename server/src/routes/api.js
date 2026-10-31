import { Router } from 'express'
import { books } from './books.js'
import { reviews } from './reviews.js'
import { orders } from './orders.js'
import { wishlist } from './wishlist.js'
import { events } from './events.js'
import { admin } from './admin.js'
import { live } from './live.js'
import { notifications } from './notifications.js'

// Everything under /api (index.js mounts this). Each part of the API
// lives in its own file in this folder.
export const api = Router()

// GET /api/_/health: answers 200 as long as the server is running, so a
// person (or a monitor) can check the API is up without loading any data
api.get('/_/health', (req, res) => {
  res.json({ status: 'ok' })
})

api.use('/books', books)
api.use('/books/:id/reviews', reviews)
api.use('/orders', orders)
api.use('/wishlist', wishlist)
api.use('/events', events)
api.use('/admin', admin)
api.use('/notifications', notifications)
api.use('/live', live)
