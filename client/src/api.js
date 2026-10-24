// GET a path on our API, e.g. getJson('/api/books'), and return the parsed JSON.
export async function getJson(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`${path} answered ${response.status}`)
  return response.json()
}

// Send a request with a JSON body (POST, PUT, DELETE) and return the parsed
// answer. When the server says no, it answers { error: '...' }, and that
// message is what we throw. The session cookie goes along by itself,
// because it is the same site.
export async function sendJson(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? `${path} answered ${response.status}`)
  return data
}

// The most common case, e.g. postJson('/api/orders', { ... })
export function postJson(path, body) {
  return sendJson('POST', path, body)
}
