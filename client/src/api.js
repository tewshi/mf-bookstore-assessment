// GET a path on our API, e.g. getJson('/api/books'), and return the parsed JSON.
export async function getJson(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`${path} answered ${response.status}`)
  return response.json()
}
