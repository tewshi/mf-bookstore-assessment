import { useState } from 'react'
import { authClient } from '../auth'

// One form for both #signin and #signup. Sign up also asks for a name.
// next is where to go afterwards, e.g. "checkout" for #signin/checkout.
export function AuthForm({ mode, next }) {
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
    // signed in straight away, then we send them on (home by default).
    const { error } = isSignUp
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password })
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      window.location.hash = next ?? ''
    }
  }

  const input =
    'mt-1 w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft'

  return (
    // The form sits in a white card in the middle of the page
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <h1 className="mb-1 text-3xl font-bold">
          {isSignUp ? 'Create an account' : 'Welcome back'}
        </h1>
        <p className="mb-6 text-muted">
          {isSignUp
            ? 'Join to keep your details for next time.'
            : 'Sign in to your MayerfeldBooks account.'}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <label className="text-sm font-medium">
              Name
              <input
                className={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}
          <label className="text-sm font-medium">
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
          <label className="text-sm font-medium">
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
            <p
              role="alert"
              className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-dark"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="mt-2 cursor-pointer rounded-full bg-accent px-8 py-3 font-medium text-white hover:bg-accent-dark disabled:opacity-50"
          >
            {isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          {isSignUp ? 'Already have an account? ' : 'New here? '}
          <a
            // Keep next when switching between sign in and sign up
            href={`${isSignUp ? '#signin' : '#signup'}${next ? `/${next}` : ''}`}
            className="font-medium text-accent hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Create an account'}
          </a>
        </p>
      </div>
    </section>
  )
}
