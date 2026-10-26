import { useEffect, useState } from 'react'
import { getJson, sendJson } from '../../lib/api'
import { usePages } from '../../lib/usePages'
import { Pagination } from '../../components/ui/Pagination'

const emptyEvent = { id: '', datetime: '', title: '', text: '', seats: '20' }

const perPage = 10

// Every event, past ones too, with a form to add or edit one
export function AdminEvents() {
  const [events, setEvents] = useState(null)
  // null: no form open; 'new': adding; otherwise the event being edited
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState(null)

  function load() {
    getJson('/api/admin/events').then(setEvents, () => setEvents([]))
  }

  useEffect(load, [])

  function closeForm(text) {
    setEditing(null)
    setMessage(text)
    load()
  }

  // Before the early return below: usePages is a hook, so it runs every render
  const { page, setPage, pageItems } = usePages(events ?? [], perPage)

  if (!events) return <p className="text-muted">Loading events…</p>

  return (
    // id: where the page buttons scroll back to
    <div id="admin-events" className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">{events.length} events</p>
        <button
          type="button"
          onClick={() => {
            setEditing('new')
            setMessage(null)
          }}
          className="cursor-pointer rounded-full bg-accent px-5 py-2 text-sm font-medium text-on-accent hover:bg-accent-dark"
        >
          Add an event
        </button>
      </div>

      {message && (
        <p
          role="status"
          className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
        >
          {message}
        </p>
      )}

      {editing && (
        <EventForm
          key={editing === 'new' ? 'new' : editing.id}
          event={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onDone={closeForm}
        />
      )}

      <ul className="flex flex-col gap-3">
        {pageItems.map((event) => (
          <li
            key={event.id}
            className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface p-4 ${
              event.past ? 'opacity-60' : ''
            }`}
          >
            <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
              {event.label}
            </span>
            <span className="font-medium">{event.title}</span>
            {event.past && <span className="text-xs text-muted uppercase">Past</span>}
            <span className="ml-auto text-sm text-muted">
              {event.taken} / {event.seats} seats taken
            </span>
            <button
              type="button"
              onClick={() => {
                setEditing(event)
                setMessage(null)
                window.scrollTo(0, 0)
              }}
              className="cursor-pointer rounded-full border border-line px-3 py-1 text-sm hover:border-accent hover:text-accent"
            >
              Edit
            </button>
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        perPage={perPage}
        total={events.length}
        noun="events"
        onChange={setPage}
        scrollTo="admin-events"
      />
    </div>
  )
}

// Add (event is null) or edit one event. The label ("Sat 7 Nov, 19:00")
// is made by the server from the date, so there's no box for it.
function EventForm({ event, onCancel, onDone }) {
  const isNew = !event
  const [form, setForm] = useState(isNew ? emptyEvent : { ...event, seats: String(event.seats) })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function field(name) {
    return { value: form[name], onChange: (e) => setForm({ ...form, [name]: e.target.value }) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (isNew) {
        await sendJson('POST', '/api/admin/events', form)
        onDone(`Added "${form.title}".`)
      } else {
        await sendJson('PUT', `/api/admin/events/${event.id}`, form)
        onDone(`Saved "${form.title}".`)
      }
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    try {
      await sendJson('DELETE', `/api/admin/events/${event.id}`)
      onDone(`Deleted "${event.title}".`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const input =
    'mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2 font-normal outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft'
  const label = 'text-sm font-medium'

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 grid gap-4 rounded-2xl border border-accent/40 bg-surface p-6 sm:grid-cols-2"
    >
      <h2 className="text-xl font-bold sm:col-span-2">
        {isNew ? 'Add an event' : `Edit "${event.title}"`}
      </h2>
      <label className={`${label} sm:col-span-2`}>
        Title
        <input className={input} {...field('title')} required />
      </label>
      {isNew && (
        <label className={label}>
          Id (letters, numbers and dashes)
          <input className={input} {...field('id')} placeholder="e.g. poetry-night" required />
        </label>
      )}
      <label className={label}>
        Date and time
        <input className={input} type="datetime-local" {...field('datetime')} required />
      </label>
      <label className={label}>
        Seats
        <input className={input} type="number" min="1" step="1" {...field('seats')} required />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Description
        <textarea className={`${input} min-h-20`} {...field('text')} required />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-dark sm:col-span-2"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer rounded-full bg-accent px-6 py-2.5 font-medium text-on-accent hover:bg-accent-dark disabled:opacity-50"
        >
          {isNew ? 'Add event' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-full border border-line px-6 py-2.5 font-medium hover:border-accent hover:text-accent"
        >
          Cancel
        </button>
        {!isNew && (
          <button
            type="button"
            onClick={confirmDelete ? handleDelete : () => setConfirmDelete(true)}
            disabled={busy}
            className={`ml-auto cursor-pointer rounded-full px-6 py-2.5 font-medium disabled:opacity-50 ${
              confirmDelete ? 'bg-accent-dark text-on-accent' : 'text-accent hover:bg-accent-soft'
            }`}
          >
            {confirmDelete ? 'Really delete? Seats are cancelled too' : 'Delete'}
          </button>
        )}
      </div>
    </form>
  )
}
