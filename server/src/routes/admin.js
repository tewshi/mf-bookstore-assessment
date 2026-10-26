import { Router } from 'express'
import { requireAdmin } from '../lib/session.js'
import { adminOrders } from './admin/orders.js'
import { adminBooks } from './admin/books.js'
import { adminEvents } from './admin/events.js'

// Mounted at /api/admin. requireAdmin runs first, so every route in the
// admin/ folder is for admins only. One file per tab of the admin page.
export const admin = Router()
admin.use(requireAdmin)

admin.use('/orders', adminOrders)
admin.use('/books', adminBooks)
admin.use('/events', adminEvents)
