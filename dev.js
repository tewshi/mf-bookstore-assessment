// `npm run dev`: starts the API (Express on PORT from server/.env, or
// 3000) and the React dev server (Vite on :5173) together, using only
// what comes with Node.
// `make dev` runs `node dev.js --stripe`, which also starts the Stripe
// listener (`make stripe`), so payments turn 'paid' without a second terminal.
// Ctrl+C stops them all. If one stops on its own (a crash, a port
// already in use), the others are stopped too, so nothing is left running.
import { spawn } from 'node:child_process'

// The same as typing `npm run dev -w server` and `npm run dev -w client`
// in two terminals
const commands = [
  ['npm', 'run', 'dev', '-w', 'server'],
  ['npm', 'run', 'dev', '-w', 'client'],
]

// -s: make doesn't print the commands it runs, only their output
if (process.argv.includes('--stripe')) commands.push(['make', '-s', 'stripe'])

const children = commands.map(([command, ...args]) =>
  spawn(command, args, {
    // Their output goes straight into this terminal
    stdio: 'inherit',
    // Windows calls npm "npm.cmd", which only a shell can find
    shell: process.platform === 'win32',
  }),
)

let stopping = false

function stopAll() {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill()
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    // One stopped on its own (we didn't stop it) and not cleanly: exit with
    // an error code, so the terminal shows that something went wrong
    if (!stopping && (code || signal)) process.exitCode = code || 1
    stopAll()
  })
}

// Ctrl+C sends SIGINT; `kill` (and some editors) send SIGTERM
process.on('SIGINT', stopAll)
process.on('SIGTERM', stopAll)
