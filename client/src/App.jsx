import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import NoteList from './components/NoteList'
import NoteEditor from './components/NoteEditor'
import * as api from './api'

export default function App() {
  const [notebooks, setNotebooks] = useState([])
  const [notes, setNotes] = useState([])
  const [selectedNotebookId, setSelectedNotebookId] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState('all')

  useEffect(() => {
    api.getNotebooks().then(setNotebooks)
  }, [])

  useEffect(() => {
    const params = {}
    if (view === 'notebook' && selectedNotebookId) params.notebookId = selectedNotebookId
    if (searchQuery) params.q = searchQuery

    api.getNotes(params).then(loaded => {
      setNotes(loaded)
      setSelectedNote(prev => {
        if (!prev) return loaded[0] || null
        return loaded.find(n => n.id === prev.id) || loaded[0] || null
      })
    })
  }, [selectedNotebookId, searchQuery, view])

  const refreshNotebooks = useCallback(() => {
    api.getNotebooks().then(setNotebooks)
  }, [])

  const createNote = useCallback(async () => {
    const notebookId =
      view === 'notebook' && selectedNotebookId
        ? selectedNotebookId
        : notebooks[0]?.id || 'default'

    const note = await api.createNote({
      notebookId,
      title: '제목 없는 노트',
      content: '',
      contentText: ''
    })
    setNotes(prev => [note, ...prev])
    setSelectedNote(note)
    refreshNotebooks()
  }, [view, selectedNotebookId, notebooks, refreshNotebooks])

  const updateNote = useCallback(async (id, updates) => {
    try {
      const updated = await api.updateNote(id, updates)
      setNotes(prev =>
        [...prev.map(n => n.id === id ? updated : n)]
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      )
      setSelectedNote(prev => prev?.id === id ? updated : prev)
    } catch (err) {
      console.error('자동저장 실패:', err)
    }
  }, [])

  const deleteNote = useCallback(async (id) => {
    await api.deleteNote(id)
    setNotes(prev => {
      const filtered = prev.filter(n => n.id !== id)
      setSelectedNote(cur => cur?.id === id ? filtered[0] || null : cur)
      return filtered
    })
    refreshNotebooks()
  }, [refreshNotebooks])

  const totalNotes = notes.length

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        notebooks={notebooks}
        setNotebooks={setNotebooks}
        selectedNotebookId={selectedNotebookId}
        setSelectedNotebookId={setSelectedNotebookId}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        view={view}
        setView={setView}
        refreshNotebooks={refreshNotebooks}
        totalNotes={totalNotes}
      />
      <NoteList
        notes={notes}
        notebooks={notebooks}
        selectedNote={selectedNote}
        setSelectedNote={setSelectedNote}
        createNote={createNote}
        deleteNote={deleteNote}
        view={view}
        selectedNotebookId={selectedNotebookId}
      />
      {selectedNote ? (
        <NoteEditor
          key={selectedNote.id}
          note={selectedNote}
          notebooks={notebooks}
          updateNote={updateNote}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-white">
          <div className="text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            </svg>
            <p className="text-base font-medium text-gray-500">노트를 선택하세요</p>
            <p className="text-sm mt-1 text-gray-400">왼쪽에서 노트를 선택하거나 새 노트를 만드세요</p>
          </div>
        </div>
      )}
    </div>
  )
}
