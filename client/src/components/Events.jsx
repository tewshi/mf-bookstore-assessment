import { useEffect, useState } from 'react'
import { getJson } from '../api'

export function Events() {
  // Starts empty and fills in when /api/events answers
  const [events, setEvents] = useState([])

  useEffect(() => {
    getJson('/api/events').then(setEvents, () => {})
  }, [])

  return (
    <section id="events" className="mx-auto max-w-page scroll-mt-16 px-4 py-16">
      <h2 className="text-3xl font-bold">Events</h2>
      <p className="mb-8 text-muted">Readings and book clubs in the shop. Everyone is welcome.</p>
      {/* One card per row on phones, 3 side by side from md */}
      <ul className="grid gap-6 md:grid-cols-3">
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
            <p className="text-muted">{event.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
