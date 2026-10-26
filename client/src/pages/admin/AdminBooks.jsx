import { useState } from 'react'
import { sendJson } from '../../lib/api'

// What a new book's form starts with
const emptyBook = {
  id: '',
  title: '',
  author: '',
  section: 'Fiction',
  isbn: '',
  price: '',
  image: '/images/',
  description: '',
  format: 'Paperback',
  pages: '',
  published: String(new Date().getFullYear()),
  stock: '10',
  staffPickQuote: '',
  staffPickBy: '',
}

// "The Glass Harbour" -> "the-glass-harbour", the suggested id for links
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// The book list, with a form to add or edit one book at a time
export function AdminBooks({ books, onChanged }) {
  // null: no form open; 'new': adding; otherwise the book being edited
  const [editing, setEditing] = useState(null)
  const [message, setMessage] = useState(null)

  function closeForm(text) {
    setEditing(null)
    setMessage(text)
    onChanged()
  }

  if (!books) return <p className="text-muted">Loading books…</p>

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted">{books.length} books</p>
        <button
          type="button"
          onClick={() => {
            setEditing('new')
            setMessage(null)
          }}
          className="cursor-pointer rounded-full bg-accent px-5 py-2 text-sm font-medium text-on-accent hover:bg-accent-dark"
        >
          Add a book
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

      {/* key: a fresh form each time a different book is opened */}
      {editing && (
        <BookForm
          key={editing === 'new' ? 'new' : editing.id}
          book={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onDone={closeForm}
        />
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-bg text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Book</th>
              <th className="px-4 py-3 font-medium">Section</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">Stock</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {books.map((book) => (
              <tr key={book.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={book.image}
                      alt=""
                      className="aspect-[2/3] w-8 shrink-0 rounded object-cover"
                    />
                    <div>
                      <p className="font-medium">{book.title}</p>
                      <p className="text-muted">
                        {book.author}
                        {book.staffPick && ' · Staff pick'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{book.section}</td>
                <td className="px-4 py-3 text-right">€{book.price.toFixed(2)}</td>
                <td
                  className={`px-4 py-3 text-right font-medium ${book.stock <= 3 ? 'text-amber-700 dark:text-amber-400' : ''}`}
                >
                  {book.stock}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(book)
                      setMessage(null)
                      window.scrollTo(0, 0)
                    }}
                    className="cursor-pointer rounded-full border border-line px-3 py-1 hover:border-accent hover:text-accent"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Add (book is null) or edit one book
function BookForm({ book, onCancel, onDone }) {
  const isNew = !book
  // All the fields in one object, as text, the way the inputs give them
  const [form, setForm] = useState(
    isNew
      ? emptyBook
      : {
          ...book,
          price: String(book.price),
          pages: String(book.pages),
          published: String(book.published),
          stock: String(book.stock),
          staffPickQuote: book.staffPick?.quote ?? '',
          staffPickBy: book.staffPick?.by ?? '',
        },
  )
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  // Deleting takes two clicks: "Delete", then "Really delete?"
  const [confirmDelete, setConfirmDelete] = useState(false)

  // The props an input needs to show and change one field of form
  function field(name) {
    return { value: form[name], onChange: (e) => setForm({ ...form, [name]: e.target.value }) }
  }

  // A new book's id is suggested from its title until one is typed
  const id = isNew ? form.id || slugify(form.title) : book.id

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (isNew) {
        await sendJson('POST', '/api/admin/books', { ...form, id })
        onDone(`Added "${form.title}".`)
      } else {
        await sendJson('PUT', `/api/admin/books/${book.id}`, form)
        onDone(`Saved "${form.title}".`)
      }
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setError(null)
    try {
      await sendJson('DELETE', `/api/admin/books/${book.id}`)
      onDone(`Deleted "${book.title}".`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
      setConfirmDelete(false)
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
        {isNew ? 'Add a book' : `Edit "${book.title}"`}
      </h2>
      <label className={label}>
        Title
        <input className={input} {...field('title')} required />
      </label>
      <label className={label}>
        Author
        <input className={input} {...field('author')} required />
      </label>
      <label className={label}>
        Id (used in links)
        <input
          className={`${input} ${isNew ? '' : 'text-muted'}`}
          value={id}
          onChange={(e) => setForm({ ...form, id: e.target.value })}
          readOnly={!isNew}
          required
        />
      </label>
      <label className={label}>
        ISBN
        <input className={input} {...field('isbn')} required />
      </label>
      <label className={label}>
        Section
        <select className={input} {...field('section')}>
          <option>Fiction</option>
          <option>Nonfiction</option>
        </select>
      </label>
      <label className={label}>
        Format
        <input className={input} {...field('format')} required />
      </label>
      {/* Four small number fields side by side */}
      <div className="grid grid-cols-2 gap-4 sm:col-span-2 sm:grid-cols-4">
        <label className={label}>
          Price (€)
          <input
            className={input}
            type="number"
            min="0.01"
            step="0.01"
            {...field('price')}
            required
          />
        </label>
        <label className={label}>
          Stock
          <input className={input} type="number" min="0" step="1" {...field('stock')} required />
        </label>
        <label className={label}>
          Pages
          <input className={input} type="number" min="1" step="1" {...field('pages')} required />
        </label>
        <label className={label}>
          Published
          <input className={input} type="number" step="1" {...field('published')} required />
        </label>
      </div>
      <label className={`${label} sm:col-span-2`}>
        Cover image (a path like /images/slow-maps.jpg, or a full URL)
        <input className={input} {...field('image')} required />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Description
        <textarea className={`${input} min-h-24`} {...field('description')} required />
      </label>
      <label className={label}>
        Staff pick quote (leave empty if not a pick)
        <input className={input} {...field('staffPickQuote')} />
      </label>
      <label className={label}>
        Picked by
        <input className={input} {...field('staffPickBy')} />
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
          {isNew ? 'Add book' : 'Save changes'}
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
            {confirmDelete ? 'Really delete?' : 'Delete'}
          </button>
        )}
      </div>
    </form>
  )
}
