import { useState } from 'react'
import { authClient } from '../auth'

// One form for both #signin and #signup. Sign up also asks for a name.
export function AuthForm({ mode }) {
  const isSignUp = mode === 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    // Both calls set the session cookie on success, so the person is
    // signed in straight away, then we send them back to the home page.
    const { error } = isSignUp
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password })
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      window.location.hash = ''
    }
  }

  const input = 'w-full rounded-md border border-line bg-surface px-4 py-2'

  return (
    <section className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold">{isSignUp ? 'Create an account' : 'Sign in'}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isSignUp && (
          <label>
            Name
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label>
          Email
          <input
            className={input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            className={input}
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-accent">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer rounded-full bg-accent px-8 py-4 font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSignUp ? 'Sign up' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-muted">
        {isSignUp ? 'Already have an account? ' : 'New here? '}
        <a href={isSignUp ? '#signin' : '#signup'} className="text-accent underline">
          {isSignUp ? 'Sign in' : 'Create an account'}
        </a>
      </p>
    </section>
  )
}
