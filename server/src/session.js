import { fromNodeHeaders } from 'better-auth/node'
import { auth } from './auth.js'

// Who is signed in, worked out by Better Auth from the session cookie.
// Returns the user row ({ id, name, email, ... }), or null for nobody.
export async function currentUser(req) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  return session?.user ?? null
}

// Put this in front of a route that needs someone signed in. It answers
// 401 for visitors; otherwise the route finds the person in req.user.
export async function requireUser(req, res, next) {
  req.user = await currentUser(req)
  if (!req.user) return res.status(401).json({ error: 'Please sign in first' })
  next()
}
