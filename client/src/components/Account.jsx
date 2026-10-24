import { useState } from 'react'
import { authClient } from '../auth'
import { resizeImage } from '../resizeImage'
import { Avatar } from './UserMenu'

const input =
  'mt-1 w-full rounded-xl border border-line bg-bg px-4 py-3 font-normal outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft'
const button =
  'cursor-pointer rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent-dark disabled:opacity-50'

// The #account page: picture, name and password. Better Auth does the
// saving; after each change it refreshes the session, so the header's
// avatar and name update by themselves.
export function Account() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return <p className="mx-auto max-w-page px-4 py-16 text-muted">Loading…</p>
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-2 text-3xl font-bold">Sign in to see your account</h1>
        <a
          href="#signin/account"
          className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent-dark"
        >
          Sign in
        </a>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold sm:text-4xl">Your account</h1>
      <div className="flex flex-col gap-6">
        {/* key: start the form again if a different person signs in */}
        <ProfileForm key={session.user.id} user={session.user} />
        <PasswordForm />
      </div>
    </section>
  )
}

function ProfileForm({ user }) {
  const [name, setName] = useState(user.name)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Runs a Better Auth call, showing "Saving…" while it works and a
  // message or error after. Used by all three buttons below.
  async function save(changes, doneText) {
    setBusy(true)
    setError(null)
    setMessage(null)
    const { error } = await authClient.updateUser(changes)
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage(doneText)
    }
  }

  async function handlePicture(event) {
    const file = event.target.files[0]
    // Let the same file be picked again later
    event.target.value = ''
    if (!file) return
    try {
      await save({ image: await resizeImage(file) }, 'Picture updated.')
    } catch (err) {
      setError(err.message)
    }
  }

  function handleName(event) {
    event.preventDefault()
    save({ name: name.trim() }, 'Name saved.')
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <h2 className="mb-6 text-xl font-bold">Profile</h2>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar user={user} className="size-20" />
        <div className="flex flex-wrap gap-2">
          {/* The real file input is hidden; the label is styled as a button
              and clicking a label clicks its input */}
          <label className="cursor-pointer rounded-full border border-line px-4 py-2 text-sm font-medium hover:border-accent hover:text-accent">
            {user.image ? 'Change picture' : 'Upload picture'}
            <input type="file" accept="image/*" onChange={handlePicture} className="sr-only" />
          </label>
          {user.image && (
            <button
              type="button"
              onClick={() => save({ image: null }, 'Picture removed.')}
              disabled={busy}
              className="cursor-pointer rounded-full px-4 py-2 text-sm text-muted hover:text-accent"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleName} className="flex flex-col gap-4">
        <label className="text-sm font-medium">
          Name
          <input
            className={input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="text-sm font-medium">
          Email
          {/* Changing the email would need a confirmation email, so it's read-only */}
          <input className={`${input} text-muted`} value={user.email} readOnly />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-dark">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        )}
        <button type="submit" disabled={busy} className={`${button} self-start`}>
          {busy ? 'Saving…' : 'Save name'}
        </button>
      </form>
    </div>
  )
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    // revokeOtherSessions signs out every other browser that was signed in
    // with the old password; this one stays signed in.
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage('Password changed. Other devices have been signed out.')
      setCurrentPassword('')
      setNewPassword('')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 sm:p-8"
    >
      <h2 className="text-xl font-bold">Password</h2>
      <label className="text-sm font-medium">
        Current password
        <input
          className={input}
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </label>
      <label className="text-sm font-medium">
        New password
        <input
          className={input}
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-dark">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      )}
      <button type="submit" disabled={busy} className={`${button} self-start`}>
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  )
}
