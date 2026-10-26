import { Router } from 'express'
import { pool } from '../lib/db.js'
import { currentUser, requireUser } from '../lib/session.js'

// Mounted at /api/events
export const events = Router()

// GET /api/events: upcoming events, soonest first, with how many seats are
// left. going says whether the signed-in person has a seat (false for
// visitors). to_char gives back the "2026-10-15T19:00" text <time> expects.
events.get('/', async (req, res) => {
  const user = await currentUser(req)
  const { rows } = await pool.query(
    `SELECT events.id, to_char(events.starts_at, 'YYYY-MM-DD"T"HH24:MI') AS datetime,
            events.label, events.title, events.text,
            events.seats - count(event_signups.user_id)::int AS seats_left,
            coalesce(bool_or(event_signups.user_id = $1), false) AS going
     FROM events
     LEFT JOIN event_signups ON event_signups.event_id = events.id
     WHERE events.starts_at >= localtimestamp
     GROUP BY events.id
     ORDER BY events.starts_at`,
    [user?.id ?? null],
  )
  res.json(
    rows.map((row) => ({
      id: row.id,
      datetime: row.datetime,
      label: row.label,
      title: row.title,
      text: row.text,
      seatsLeft: row.seats_left,
      going: row.going,
    })),
  )
})

// POST /api/events/poetry-night/signup: reserve a seat.
// A transaction, so two people can't both take the last seat: FOR UPDATE
// locks this event's row until COMMIT, so a second sign-up for the same
// event waits at the SELECT, then counts the seat the first one took.
events.post('/:id/signup', requireUser, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT events.seats, events.starts_at < localtimestamp AS past,
              (SELECT count(*)::int FROM event_signups WHERE event_id = events.id) AS taken
       FROM events WHERE events.id = $1
       FOR UPDATE`,
      [req.params.id],
    )
    const event = rows[0]
    // Each "no" ends the transaction with ROLLBACK, which also unlocks the row
    if (!event) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Event not found' })
    }
    if (event.past) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'This event has already happened' })
    }
    if (event.taken >= event.seats) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Sorry, this event is fully booked' })
    }

    // ON CONFLICT DO NOTHING: reserving twice still means one seat
    await client.query(
      'INSERT INTO event_signups (user_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id],
    )
    await client.query('COMMIT')
    res.status(201).json({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
})

// DELETE /api/events/poetry-night/signup: give the seat back
events.delete('/:id/signup', requireUser, async (req, res) => {
  await pool.query('DELETE FROM event_signups WHERE user_id = $1 AND event_id = $2', [
    req.user.id,
    req.params.id,
  ])
  res.json({ ok: true })
})
