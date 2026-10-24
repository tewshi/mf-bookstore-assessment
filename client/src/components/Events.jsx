import { useEffect, useState } from 'react'
import { authClient } from '../auth'
import { getJson, sendJson } from '../api'
import { CheckIcon } from './Icons'

export function Events() {
  // Fetched again when someone signs in or out: "going" depends on who asks
  const { data: session } = authClient.useSession()
  const userId = session?.user.id

  // Starts empty and fills in when /api/events answers
  const [events, setEvents] = useState([])
  // The id of the event whose button is busy, and the last error
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    getJson('/api/events').then(setEvents, () => {})
  }

  useEffect(load, [userId])

  // Reserve a seat (POST) or give it back (DELETE), then reload the list
  // so the seat counts are right
  async function toggleSeat(event) {
    setBusyId(event.id)
    setError(null)
    try {
      await sendJson(event.going ? 'DELETE' : 'POST', `/api/events/${event.id}/signup`)
      load()
    } catch (err) {
      setError({ eventId: event.id, message: err.message })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section id="events" className="mx-auto max-w-page scroll-mt-16 px-4 py-16">
      <h2 className="text-3xl font-bold">Events</h2>
      <p className="mb-8 text-muted">
        Readings and book clubs in the shop. Reserve a seat, it's free.
      </p>
      {events.length === 0 && <p className="text-muted">No events planned right now.</p>}
      {/* One card per row on phones, 2 from md, 3 from lg */}
      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-sm"
          >
            <time
              dateTime={event.datetime}
              className="mb-4 w-fit rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent"
            >
              {event.label}
            </time>
            <h3 className="mb-2 text-xl leading-tight font-bold">{event.title}</h3>
            <p className="mb-6 text-muted">{event.text}</p>

            {/* mt-auto keeps the buttons at the bottom of every card */}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
              {event.going ? (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckIcon className="size-4" />
                  You're going
                </span>
              ) : (
                <span className="text-sm text-muted">
                  {event.seatsLeft === 0
                    ? 'Fully booked'
                    : `${event.seatsLeft} ${event.seatsLeft === 1 ? 'seat' : 'seats'} left`}
                </span>
              )}
              {/* Visitors are sent to sign in first; seats belong to an account */}
              {userId ? (
                <button
                  type="button"
                  onClick={() => toggleSeat(event)}
                  disabled={busyId === event.id || (!event.going && event.seatsLeft === 0)}
                  className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium disabled:cursor-default disabled:opacity-50 ${
                    event.going
                      ? 'border border-line hover:border-accent hover:text-accent'
                      : 'bg-accent text-on-accent hover:bg-accent-dark'
                  }`}
                >
                  {event.going ? 'Cancel' : 'Reserve a seat'}
                </button>
              ) : (
                <a
                  href="#signin"
                  className="rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent"
                >
                  Sign in to reserve
                </a>
              )}
            </div>
            {error?.eventId === event.id && (
              <p role="alert" className="mt-3 text-sm text-accent">
                {error.message}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
