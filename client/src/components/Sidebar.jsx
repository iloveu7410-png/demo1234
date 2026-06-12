import { useState } from 'react'
import { Search, FileText, BookOpen, Plus, ChevronDown, ChevronRight, X } from 'lucide-react'
import * as api from '../api'

export default function Sidebar({
  notebooks, setNotebooks,
  selectedNotebookId, setSelectedNotebookId,
  searchQuery, setSearchQuery,
  view, setView,
  refreshNotebooks,
  totalNotes
}) {
  const [notebooksExpanded, setNotebooksExpanded] = useState(true)
  const [newNotebookName, setNewNotebookName] = useState('')
  const [showNewNotebook, setShowNewNotebook] = useState(false)
  const [editingNotebookId, setEditingNotebookId] = useState(null)
  const [editingName, setEditingName] = useState('')

  const handleAllNotes = () => {
    setSelectedNotebookId(null)
    setView('all')
    setSearchQuery('')
  }

  const handleSelectNotebook = (id) => {
    setSelectedNotebookId(id)
    setView('notebook')
    setSearchQuery('')
  }

  const handleCreateNotebook = async (e) => {
    e.preventDefault()
    if (!newNotebookName.trim()) return
    const nb = await api.createNotebook(newNotebookName.trim())
    setNotebooks(prev => [...prev, nb])
    setNewNotebookName('')
    setShowNewNotebook(false)
  }

  const handleRenameNotebook = async (e, id) => {
    e.preventDefault()
    if (!editingName.trim()) return
    const updated = await api.updateNotebook(id, editingName.trim())
    setNotebooks(prev => prev.map(n => n.id === id ? { ...n, name: updated.name } : n))
    setEditingNotebookId(null)
  }

  const handleDeleteNotebook = async (e, id) => {
    e.stopPropagation()
    if (id === 'default') return
    if (!confirm('노트북을 삭제하시겠습니까? 노트는 기본 노트북으로 이동됩니다.')) return
    await api.deleteNotebook(id)
    setNotebooks(prev => prev.filter(n => n.id !== id))
    if (selectedNotebookId === id) {
      setSelectedNotebookId(null)
      setView('all')
    }
    refreshNotebooks()
  }

  return (
    <div className="w-60 flex-shrink-0 bg-[#1C2B23] text-[#C8D5C8] flex flex-col h-screen select-none">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 flex items-center gap-2.5">
        <div className="w-8 h-8 bg-[#14AA37] rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText size={15} className="text-white" />
        </div>
        <span className="font-bold text-white text-lg tracking-tight">메모장</span>
      </div>

      {/* Search */}
      <div className="px-3 mb-2">
        <div className="flex items-center gap-2 bg-[#243B2D] rounded-lg px-3 py-2 border border-[#2E4A36]">
          <Search size={13} className="text-[#6B9A7A] flex-shrink-0" />
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              if (e.target.value) setView('search')
              else setView('all')
            }}
            className="bg-transparent text-sm text-[#C8D5C8] placeholder-[#6B9A7A] outline-none w-full"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setView('all') }}>
              <X size={12} className="text-[#6B9A7A] hover:text-white" />
            </button>
          )}
        </div>
      </div>

      {/* All Notes */}
      <button
        onClick={handleAllNotes}
        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors w-full text-left ${
          view === 'all' || view === 'search'
            ? 'bg-[#2A4A32] text-white'
            : 'hover:bg-[#243B2D] text-[#C8D5C8]'
        }`}
      >
        <FileText size={15} className="flex-shrink-0" />
        <span>모든 노트</span>
        <span className="ml-auto text-xs text-[#6B9A7A]">{totalNotes}</span>
      </button>

      {/* Divider */}
      <div className="mx-4 my-2 border-t border-[#2E4A36]" />

      {/* Notebooks section */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center px-4 py-1.5">
          <button
            onClick={() => setNotebooksExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-[#6B9A7A] uppercase tracking-wider hover:text-[#C8D5C8] transition-colors font-medium"
          >
            {notebooksExpanded
              ? <ChevronDown size={11} />
              : <ChevronRight size={11} />
            }
            노트북
          </button>
          <button
            onClick={() => setShowNewNotebook(true)}
            className="ml-auto p-0.5 text-[#6B9A7A] hover:text-white transition-colors"
            title="새 노트북 추가"
          >
            <Plus size={14} />
          </button>
        </div>

        {notebooksExpanded && (
          <div className="mt-0.5">
            {notebooks.map(nb => (
              <div
                key={nb.id}
                className={`group relative flex items-center gap-2.5 px-4 py-2 text-sm cursor-pointer transition-colors ${
                  selectedNotebookId === nb.id && view === 'notebook'
                    ? 'bg-[#2A4A32] text-white'
                    : 'hover:bg-[#243B2D] text-[#C8D5C8]'
                }`}
                onClick={() => handleSelectNotebook(nb.id)}
                onDoubleClick={() => {
                  setEditingNotebookId(nb.id)
                  setEditingName(nb.name)
                }}
              >
                <BookOpen size={14} className="flex-shrink-0" />
                {editingNotebookId === nb.id ? (
                  <form onSubmit={e => handleRenameNotebook(e, nb.id)} className="flex-1">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => setEditingNotebookId(null)}
                      className="bg-[#2A4A32] text-white text-sm px-1.5 py-0.5 rounded outline-none border border-[#14AA37] w-full"
                      onClick={e => e.stopPropagation()}
                    />
                  </form>
                ) : (
                  <>
                    <span className="truncate flex-1">{nb.name}</span>
                    <span className="text-xs text-[#6B9A7A]">{nb.noteCount}</span>
                    {nb.id !== 'default' && (
                      <button
                        onClick={e => handleDeleteNotebook(e, nb.id)}
                        className="opacity-0 group-hover:opacity-100 text-[#6B9A7A] hover:text-red-400 transition-all ml-1"
                        title="노트북 삭제"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}

            {showNewNotebook && (
              <form onSubmit={handleCreateNotebook} className="px-3 py-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="노트북 이름..."
                  value={newNotebookName}
                  onChange={e => setNewNotebookName(e.target.value)}
                  onBlur={() => { if (!newNotebookName) setShowNewNotebook(false) }}
                  onKeyDown={e => { if (e.key === 'Escape') setShowNewNotebook(false) }}
                  className="w-full bg-[#243B2D] text-white text-sm px-3 py-1.5 rounded outline-none border border-[#14AA37] placeholder-[#6B9A7A]"
                />
              </form>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#2E4A36]">
        <p className="text-xs text-[#6B9A7A]">총 {totalNotes}개 노트</p>
      </div>
    </div>
  )
}
