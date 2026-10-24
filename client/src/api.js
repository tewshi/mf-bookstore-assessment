// GET a path on our API, e.g. getJson('/api/books'), and return the parsed JSON.
export async function getJson(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`${path} answered ${response.status}`)
  return response.json()
}

// POST a JSON body to our API and return the parsed answer. When the server
// says no, it answers { error: '...' }, and that message is what we throw.
// The session cookie goes along by itself, because it is the same site.
export async function postJson(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? `${path} answered ${response.status}`)
  return data
}
