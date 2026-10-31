import { Router } from 'express'
import { pool } from '../../lib/db.js'
import { notifyEveryone } from '../../lib/live.js'
import { sendNotification } from '../../lib/notifications.js'

// Mounted at /api/admin/events (see ../admin.js, which checks for an admin first)
export const adminEvents = Router()

// Postgres error code: "that would break a UNIQUE rule" (same id)
const UNIQUE_VIOLATION = '23505'

// GET /api/admin/events: every event, past ones too, newest first, with
// how many seats are taken
adminEvents.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT events.id, to_char(events.starts_at, 'YYYY-MM-DD"T"HH24:MI') AS datetime,
            events.label, events.title, events.text, events.seats,
            count(event_signups.user_id)::int AS taken,
            events.starts_at < localtimestamp AS past
     FROM events LEFT JOIN event_signups ON event_signups.event_id = events.id
     GROUP BY events.id
     ORDER BY events.starts_at DESC`,
  )
  res.json(rows)
})

// Checks an event from the admin form, like readBook. Exported for the tests.
export function readEvent(body) {
  const event = {
    datetime: String(body.datetime ?? ''),
    title: String(body.title ?? '').trim(),
    text: String(body.text ?? '').trim(),
    seats: Number(body.seats),
  }
  // <input type="datetime-local"> sends e.g. "2026-11-07T19:00"
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(event.datetime)) {
    return { error: 'Pick a date and time' }
  }
  if (!event.title || !event.text) return { error: 'Please fill in every field' }
  if (!Number.isInteger(event.seats) || event.seats < 1) return { error: 'Seats must be 1 or more' }
  return { event }
}

// The label shown on the site, e.g. "Sat 7 Nov, 19:00", made by Postgres
// from the date. Dy = short day name, FMDD = day without a leading zero.
const labelSql = `to_char($1::timestamp, 'Dy FMDD Mon, HH24:MI')`

// POST /api/admin/events: add an event
adminEvents.post('/', async (req, res) => {
  const { event, error } = readEvent(req.body)
  if (error) return res.status(400).json({ error })
  const id = String(req.body.id ?? '').trim()
  if (!/^[a-z0-9-]+$/.test(id)) {
    return res.status(400).json({ error: 'The id may only use a-z, 0-9 and dashes' })
  }
  try {
    await pool.query(
      `INSERT INTO events (starts_at, label, title, text, seats, id)
       VALUES ($1, ${labelSql}, $2, $3, $4, $5)`,
      [event.datetime, event.title, event.text, event.seats, id],
    )
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: 'An event with that id already exists' })
    }
    throw err
  }
  // The home page events and the admin tab fetch again
  notifyEveryone('events')
  res.status(201).json({ id })
})

// PUT /api/admin/events/poetry-night: change an event. Seats can't go
// below the number already reserved.
adminEvents.put('/:id', async (req, res) => {
  const { event, error } = readEvent(req.body)
  if (error) return res.status(400).json({ error })
  const { rows } = await pool.query(
    'SELECT count(*)::int AS taken FROM event_signups WHERE event_id = $1',
    [req.params.id],
  )
  if (event.seats < rows[0].taken) {
    return res.status(400).json({ error: `${rows[0].taken} people already have seats` })
  }
  // RETURNING label: the date as the database wrote it, for the message
  const { rows: updated } = await pool.query(
    `UPDATE events SET starts_at = $1, label = ${labelSql}, title = $2, text = $3, seats = $4
     WHERE id = $5 RETURNING title, label`,
    [event.datetime, event.title, event.text, event.seats, req.params.id],
  )
  if (updated.length === 0) return res.status(404).json({ error: 'Event not found' })
  notifyEveryone('events')
  await sendNotification(
    await seatHolders(req.params.id),
    `"${updated[0].title}" was changed by the shop. It is now on ${updated[0].label}.`,
    '/#events',
  )
  res.json({ ok: true })
})

// DELETE /api/admin/events/test-event: remove an event. Its seat
// reservations go with it (ON DELETE CASCADE in schema.sql).
adminEvents.delete('/:id', async (req, res) => {
  // Who had a seat, asked first: the DELETE removes their seats too
  const people = await seatHolders(req.params.id)
  const { rows } = await pool.query('DELETE FROM events WHERE id = $1 RETURNING title', [
    req.params.id,
  ])
  if (rows.length === 0) return res.status(404).json({ error: 'Event not found' })
  notifyEveryone('events')
  await sendNotification(
    people,
    `"${rows[0].title}" was cancelled, so your seat is gone. Sorry!`,
    '/#events',
  )
  res.json({ ok: true })
})

// The ids of everyone with a seat at this event
async function seatHolders(eventId) {
  const { rows } = await pool.query('SELECT user_id FROM event_signups WHERE event_id = $1', [
    eventId,
  ])
  return rows.map((row) => row.user_id)
}
