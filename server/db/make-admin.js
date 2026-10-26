// Makes an existing account an admin, e.g.
//   npm run make-admin -w server -- you@example.com
// Add --undo to make them a customer again. The person has to sign out
// and in again (or refresh) to see the Admin link.
import { pool } from '../src/lib/db.js'

const email = process.argv[2]
const role = process.argv.includes('--undo') ? 'customer' : 'admin'

if (!email) {
  console.error('Usage: npm run make-admin -w server -- you@example.com [--undo]')
  process.exit(1)
}

const { rowCount } = await pool.query('UPDATE "user" SET role = $1 WHERE email = $2', [role, email])
console.log(
  rowCount
    ? `${email} is now ${role === 'admin' ? 'an admin' : 'a customer'}`
    : `No account with the email ${email}`,
)
await pool.end()
