import { createAuthClient } from 'better-auth/react'

// Talks to Better Auth on our server at /api/auth. The session lives in a
// cookie the server sets, so it survives a page refresh.
export const authClient = createAuthClient()
