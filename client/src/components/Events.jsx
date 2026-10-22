import { useEffect, useState } from 'react'
import { getJson } from '../api'

export function Events() {
  // Starts empty and fills in when /api/events answers
  const [events, setEvents] = useState([])

  useEffect(() => {
    getJson('/api/events').then(setEvents, () => {})
  }, [])

  return (
    <section id="events" className="mx-auto max-w-page scroll-mt-8 px-4 py-8">
      <h2 className="mb-4 text-2xl font-bold">Events</h2>
      <ul>
        {events.map((event) => (
          // Stacked on phones, date beside the text from sm
          <li key={event.id} className="flex flex-col gap-2 border-t border-line py-4 sm:flex-row sm:gap-8">
            <time dateTime={event.datetime} className="font-bold text-accent sm:w-40 sm:shrink-0">
              {event.label}
            </time>
            <div>
              <h3 className="mb-2 text-lg leading-tight font-bold">{event.title}</h3>
              <p className="text-muted">{event.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
