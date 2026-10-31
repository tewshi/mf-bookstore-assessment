import { Router } from 'express'
import { pool } from '../lib/db.js'
import { notifyUser } from '../lib/live.js'
import { requireUser } from '../lib/session.js'

// Mounted at /api/notifications: the messages under the bell. They are
// made by lib/notifications.js; here people only read them.
export const notifications = Router()
notifications.use(requireUser)

// GET /api/notifications: { unread, notifications }, the newest 20, and
// how many of all of them are still unread (for the number on the bell)
notifications.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, text, link, read_at, created_at FROM notifications
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [req.user.id],
  )
  const { rows: counted } = await pool.query(
    'SELECT count(*)::int AS unread FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [req.user.id],
  )
  res.json({
    unread: counted[0].unread,
    notifications: rows.map((row) => ({
      id: row.id,
      text: row.text,
      link: row.link,
      read: row.read_at !== null,
      createdAt: row.created_at,
    })),
  })
})

// POST /api/notifications/read: mark all of them read ("Mark all as read").
// Then this person's other devices update their bell too.
notifications.post('/read', async (req, res) => {
  await pool.query(
    'UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL',
    [req.user.id],
  )
  notifyUser('notifications', req.user.id)
  res.json({ ok: true })
})

// POST /api/notifications/7/read: mark one read, when it is clicked.
// "AND user_id": nobody can mark someone else's.
notifications.post('/:id/read', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ error: 'Not found' })
  await pool.query(
    'UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL',
    [req.params.id, req.user.id],
  )
  notifyUser('notifications', req.user.id)
  res.json({ ok: true })
})
