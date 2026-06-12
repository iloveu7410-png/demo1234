const BASE = '/api'

async function req(url, opts = {}) {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

export const getNotebooks = () => req('/notebooks')
export const createNotebook = (name) => req('/notebooks', { method: 'POST', body: JSON.stringify({ name }) })
export const updateNotebook = (id, name) => req(`/notebooks/${id}`, { method: 'PUT', body: JSON.stringify({ name }) })
export const deleteNotebook = (id) => req(`/notebooks/${id}`, { method: 'DELETE' })

export const getNotes = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return req(`/notes${qs ? '?' + qs : ''}`)
}
export const createNote = (data) => req('/notes', { method: 'POST', body: JSON.stringify(data) })
export const updateNote = (id, data) => req(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteNote = (id) => req(`/notes/${id}`, { method: 'DELETE' })
